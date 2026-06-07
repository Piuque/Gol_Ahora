/* ==========================================================================
   GOL AHORA — confirmarReserva.js (Integración DB Métodos de Pago)
   ========================================================================== */

const API = "https://gol-ahora.onrender.com";

let idCancha = null;
let fecha = null;
let hora = null;
let idMetodoSeleccionado = null;
let nombreMetodoSeleccionado = "";

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    idCancha = urlParams.get('idCancha');
    fecha = urlParams.get('fecha');
    hora = urlParams.get('hora');

    if (!idCancha || !fecha || !hora) {
        window.location.href = 'listarTiposCanchaCliente.html';
        return;
    }

    document.getElementById('resumen-fecha').textContent = cambiarFormatoFecha(fecha);
    document.getElementById('resumen-hora').textContent = `${hora} hs`;

    obtenerDetallesResumen(idCancha);
    cargarMetodosDePago(); // Función nueva

    document.getElementById('btn-finalizar').addEventListener('click', procesarReservaFinal);
});

async function obtenerDetallesResumen(id) {
    try {
        const response = await fetch(`${API}/api/cliente/canchas/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (!response.ok) throw new Error();

        const data = await response.json();
        const cancha = Array.isArray(data) ? (data.find(c => c.id == id) || data[0]) : data;

        if (cancha) {
            document.getElementById('resumen-cancha').textContent = cancha.nombre || `Cancha N° ${id}`;
            const precio = parseFloat(cancha.precio_hora_reserva) || 0;
            document.getElementById('resumen-total').textContent = new Intl.NumberFormat('es-AR', {
                style: 'currency', currency: 'ARS', minimumFractionDigits: 0
            }).format(precio);
        }
    } catch (error) {
        console.error("Error al montar el resumen:", error);
    }
}

// ==========================================
// CARGAR MÉTODOS DE PAGO DESDE LA BD
// ==========================================
async function cargarMetodosDePago() {
    const contenedor = document.getElementById('contenedor-metodos');
    let metodosBD = [];

    try {
        // Asumimos que tienes una ruta para traer métodos de pago (ej: /api/cliente/metodos_pago)
        const response = await fetch(`${API}/api/cliente/metodos_pago`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.ok) {
            metodosBD = await response.json();
        } else {
            throw new Error("Endpoint no disponible aún, usando backup");
        }
    } catch (error) {
        console.warn("Usando métodos de pago por defecto (fallback)", error.message);
        // Fallback seguro si la ruta de métodos de pago aún no está desarrollada en backend
        metodosBD = [
            { id_metodo_pago: 1, nombre: 'Efectivo', icono: 'fa-money-bill-wave' },
            { id_metodo_pago: 2, nombre: 'Tarjeta de Crédito', icono: 'fa-credit-card' },
            { id_metodo_pago: 3, nombre: 'Tarjeta de Débito', icono: 'fa-credit-card' },
            { id_metodo_pago: 4, nombre: 'Transferencia Bancaria', icono: 'fa-money-bill-transfer' },
            { id_metodo_pago: 5, nombre: 'Mercado Pago', icono: 'fa-handshake' }
        ];
    }

    renderizarMetodosDePago(metodosBD);
}

function renderizarMetodosDePago(metodos) {
    const contenedor = document.getElementById('contenedor-metodos');
    contenedor.innerHTML = '';

    // En pantallas chicas usamos col-6 (2 por fila), pero para 5 elementos, podemos usar col-4
    metodos.forEach(metodo => {
        // Icono por defecto por si el backend no lo envía
        const iconClass = metodo.icono || asignarIconoSegunNombre(metodo.nombre);

        const div = document.createElement('div');
        div.className = 'col-6 col-sm-4 col-md-4';

        div.innerHTML = `
            <div class="metodo-pago-card" id="metodo-${metodo.id_metodo_pago}" onclick="seleccionarMetodo(${metodo.id_metodo_pago}, '${metodo.nombre}')">
                <i class="fa-solid ${iconClass}"></i>
                <span class="text-white fw-bold" style="font-size: 0.75rem;">${metodo.nombre}</span>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

function asignarIconoSegunNombre(nombre) {
    const n = nombre.toLowerCase();
    if (n.includes('efectivo')) return 'fa-money-bill-wave';
    if (n.includes('crédito') || n.includes('credito')) return 'fa-credit-card';
    if (n.includes('débito') || n.includes('debito')) return 'fa-credit-card';
    if (n.includes('transferencia')) return 'fa-money-bill-transfer';
    if (n.includes('mercado') || n.includes('mp')) return 'fa-handshake';
    return 'fa-wallet';
}

// ==========================================
// CONTROLADOR INTERACTIVO DE PAGO
// ==========================================
window.seleccionarMetodo = function(idMetodo, nombreMetodo) {
    idMetodoSeleccionado = idMetodo;
    nombreMetodoSeleccionado = nombreMetodo.toLowerCase();

    // Resetear diseño de selección
    document.querySelectorAll('.metodo-pago-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`metodo-${idMetodo}`).classList.add('selected');

    // Resetear formularios visibles
    document.getElementById('wrapper-tarjeta').classList.add('d-none');
    document.getElementById('wrapper-efectivo').classList.add('d-none');
    document.getElementById('wrapper-transferencia').classList.add('d-none');
    document.getElementById('wrapper-mp').classList.add('d-none');

    const btnFinalizar = document.getElementById('btn-finalizar');
    btnFinalizar.disabled = false;

    // Mostrar UI específica
    if (nombreMetodoSeleccionado.includes('efectivo')) {
        document.getElementById('wrapper-efectivo').classList.remove('d-none');
        btnFinalizar.innerHTML = 'Solicitar Turno <i class="fa-solid fa-paper-plane ms-2"></i>';
    }
    else if (nombreMetodoSeleccionado.includes('transferencia')) {
        document.getElementById('wrapper-transferencia').classList.remove('d-none');
        btnFinalizar.innerHTML = 'Confirmar y Ver CBU <i class="fa-solid fa-check ms-2"></i>';
    }
    else if (nombreMetodoSeleccionado.includes('mercado') || nombreMetodoSeleccionado.includes('mp')) {
        document.getElementById('wrapper-mp').classList.remove('d-none');
        btnFinalizar.innerHTML = 'Pagar en Mercado Pago <i class="fa-solid fa-arrow-up-right-from-square ms-2"></i>';
    }
    else {
        // Tarjetas de Crédito y Débito
        document.getElementById('wrapper-tarjeta').classList.remove('d-none');
        btnFinalizar.innerHTML = 'Procesar Pago <i class="fa-solid fa-shield-halved ms-2"></i>';
    }
}

// ==========================================
// ENVIAR RESERVA DEFINITIVA AL BACKEND
// ==========================================
async function procesarReservaFinal() {
    if (!idMetodoSeleccionado) return;

    // Cuerpo esperado por Postgres y tu controlador
    const payload = {
        id_cancha: parseInt(idCancha),
        fecha: fecha,
        hora_inicio: `${hora}:00`,
        id_metodo_pago: parseInt(idMetodoSeleccionado)
    };

    const btn = document.getElementById('btn-finalizar');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

    try {
        const response = await fetch(`${API}/api/cliente/reservas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.details || "No se pudo procesar la reserva.");
        }

        // MENSAJES DE ÉXITO DINÁMICOS SEGÚN EL MÉTODO
        let tituloSwal = '¡Reserva Confirmada!';
        let textoSwal = 'Tu pago online fue procesado y tu turno ya está asegurado.';

        if (nombreMetodoSeleccionado.includes('efectivo')) {
            tituloSwal = '¡Solicitud Recibida!';
            textoSwal = 'Tu turno quedó pre-reservado. Recordá abonarlo en administración para confirmarlo.';
        } else if (nombreMetodoSeleccionado.includes('transferencia')) {
            tituloSwal = '¡Casi Listo!';
            textoSwal = 'El turno está reservado. Por favor, realizá la transferencia y subí el comprobante desde "Mis Reservas".';
        }

        await Swal.fire({
            icon: 'success', title: tituloSwal, text: textoSwal,
            background: '#071524', color: '#fff', confirmButtonColor: '#00C16E'
        });

        window.location.href = 'misReservas.html';

    } catch (error) {
        console.error("Error en el POST de reserva:", error);
        Swal.fire({
            icon: 'error', title: 'Reserva rechazada',
            text: error.message, background: '#071524', color: '#fff', confirmButtonColor: '#ef4444'
        });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

function cambiarFormatoFecha(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
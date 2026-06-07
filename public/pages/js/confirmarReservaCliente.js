/* ==========================================================================
   GOL AHORA — confirmarReservaCliente.js (Conectado al Controlador Real)
   ========================================================================== */

const API = window.location.origin;

let idCancha = null;
let fecha = null;
let hora = null;
let duracionCanchaMinutos = 60;
let montoReserva = 0; // Agregamos variable para guardar el monto

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

    // Disparamos las llamadas
    obtenerDetallesResumen(idCancha);
    cargarMetodosDePago();

    document.getElementById('btn-finalizar').addEventListener('click', procesarReservaFinal);
});

// ==========================================
// OBTENER DETALLES (Monto y Duración)
// ==========================================
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
            duracionCanchaMinutos = cancha.duracion_min || 60;

            // Guardamos el precio en la variable global para mandarlo en el POST
            montoReserva = parseFloat(cancha.precio_hora_reserva) || 0;

            document.getElementById('resumen-total').textContent = new Intl.NumberFormat('es-AR', {
                style: 'currency', currency: 'ARS', minimumFractionDigits: 0
            }).format(montoReserva);
        }
    } catch (error) {
        console.error("Error al montar el resumen:", error);
    }
}

// ==========================================
// CARGAR MÉTODOS DE PAGO
// ==========================================
async function cargarMetodosDePago() {
    const contenedor = document.getElementById('contenedor-metodos');
    let metodosBD = [];

    try {
        const response = await fetch(`${API}/api/cliente/metodos_pago`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.ok) {
            metodosBD = await response.json();
        } else {
            throw new Error("Ruta no disponible");
        }
    } catch (error) {
        // Fallback exacto de la base de datos
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

    metodos.forEach(metodo => {
        let iconClass = asignarIconoSegunNombre(metodo.nombre);
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
    if (n.includes('crédito') || n.includes('credito') || n.includes('débito') || n.includes('debito')) return 'fa-credit-card';
    if (n.includes('transferencia')) return 'fa-money-bill-transfer';
    if (n.includes('mercado') || n.includes('mp')) return 'fa-handshake';
    return 'fa-wallet';
}

window.seleccionarMetodo = function(idMetodo, nombreMetodo) {
    idMetodoSeleccionado = idMetodo;
    nombreMetodoSeleccionado = nombreMetodo.toLowerCase();

    document.querySelectorAll('.metodo-pago-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`metodo-${idMetodo}`).classList.add('selected');

    document.getElementById('wrapper-tarjeta').classList.add('d-none');
    document.getElementById('wrapper-efectivo').classList.add('d-none');
    document.getElementById('wrapper-transferencia').classList.add('d-none');
    document.getElementById('wrapper-mp').classList.add('d-none');

    // Limpiar campos de tarjeta al cambiar de método
    document.getElementById('input-numero-tarjeta').value = '';
    document.getElementById('input-vencimiento').value = '';
    document.getElementById('input-cvc').value = '';

    const btnFinalizar = document.getElementById('btn-finalizar');
    btnFinalizar.disabled = false;

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
        document.getElementById('wrapper-tarjeta').classList.remove('d-none');
        btnFinalizar.innerHTML = 'Procesar Pago <i class="fa-solid fa-shield-halved ms-2"></i>';
        // Con tarjeta el botón arranca deshabilitado hasta completar los campos
        btnFinalizar.disabled = true;
        inicializarInputsTarjeta();
    }
}

// ==========================================
// VALIDACIÓN Y FORMATO DE TARJETA
// ==========================================
function inicializarInputsTarjeta() {
    const inputNumero     = document.getElementById('input-numero-tarjeta');
    const inputVencimiento = document.getElementById('input-vencimiento');
    const inputCvc        = document.getElementById('input-cvc');

    // --- Número de tarjeta: solo dígitos, formato "0000 0000 0000 0000" ---
    inputNumero.addEventListener('input', (e) => {
        let raw = e.target.value.replace(/\D/g, '').substring(0, 16);
        e.target.value = raw.match(/.{1,4}/g)?.join(' ') || raw;
        validarTarjetaCompleta();
    });
    inputNumero.addEventListener('keydown', bloquearNoNumericos);

    // --- Vencimiento: solo dígitos, formato "MM/AA" ---
    inputVencimiento.addEventListener('input', (e) => {
        let raw = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (raw.length >= 3) {
            raw = raw.substring(0, 2) + '/' + raw.substring(2);
        }
        e.target.value = raw;
        validarTarjetaCompleta();
    });
    inputVencimiento.addEventListener('keydown', bloquearNoNumericos);

    // --- CVC: solo dígitos ---
    inputCvc.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
        validarTarjetaCompleta();
    });
    inputCvc.addEventListener('keydown', bloquearNoNumericos);
}

function bloquearNoNumericos(e) {
    const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    const esCopiarPegar = (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase());
    if (!permitidas.includes(e.key) && !esCopiarPegar && !/^\d$/.test(e.key)) {
        e.preventDefault();
    }
}

function validarTarjetaCompleta() {
    const numero = document.getElementById('input-numero-tarjeta').value.replace(/\s/g, '');
    const venc   = document.getElementById('input-vencimiento').value;
    const cvc    = document.getElementById('input-cvc').value;

    const valido = numero.length === 16 && venc.length === 5 && cvc.length >= 3;
    document.getElementById('btn-finalizar').disabled = !valido;
}

// ==========================================
// CALCULAR HORA DE FINALIZACIÓN
// ==========================================
function calcularHoraFin(horaInicioStr, minutosDuracion) {
    let partes = horaInicioStr.split(':');
    let h = parseInt(partes[0]);
    let m = parseInt(partes[1] || 0);

    m += minutosDuracion;
    h += Math.floor(m / 60);
    m = m % 60;

    if (h === 24) return "23:59:59";
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

// ==========================================
// ENVIAR RESERVA DEFINITIVA AL BACKEND
// ==========================================
async function procesarReservaFinal() {
    if (!idMetodoSeleccionado) return;

    const horaFinCompleta = calcularHoraFin(hora, duracionCanchaMinutos);
    const horaInicioCompleta = `${hora.length === 5 ? hora : hora.padStart(5, '0')}:00`;

    // PAYLOAD EXACTO COMO PIDE TU CONTROLADOR (clienteController.js)
    const payload = {
        id_cancha: parseInt(idCancha),
        fecha: fecha,
        hora_inicio: horaInicioCompleta,
        hora_fin: horaFinCompleta,
        id_metodo_de_pago: parseInt(idMetodoSeleccionado),
        monto: montoReserva
    };

    console.log("Enviando Payload Real al Backend:", payload);

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

        await Swal.fire({
            icon: 'success',
            title: '\u00a1Reserva Solicitada!',
            html: `
                <p style="margin-bottom: 0.75rem; line-height: 1.5;">
                    Tu solicitud fue registrada y la cancha queda <strong>ocupada temporalmente</strong> para vos.
                </p>
                <p style="margin-bottom: 0.75rem; line-height: 1.5;">
                    Un administrador del club revisará y confirmará el turno a la brevedad.
                </p>
                <p style="margin: 0; font-size: 0.82rem; opacity: 0.65; line-height: 1.4;">
                    Si la reserva no es confirmada dentro de las <strong>próximas 3 horas</strong>, se cancelará automáticamente y el horario quedará disponible nuevamente.
                </p>
            `,
            background: '#071524',
            color: '#fff',
            confirmButtonColor: '#00C16E',
            confirmButtonText: 'Entendido'
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
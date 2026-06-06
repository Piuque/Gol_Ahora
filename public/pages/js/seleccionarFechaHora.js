/* ==========================================================================
   GOL AHORA — seleccionarFechaHora.js (Paso 3)
   ========================================================================== */

const API = "https://gol-ahora.onrender.com";
const USAR_MOCKS = false;

// Variables globales para guardar el estado de la reserva
let idCanchaSeleccionada = null;
let fechaSeleccionada = null;
let horaSeleccionada = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener ID de la cancha desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    idCanchaSeleccionada = urlParams.get('idCancha');

    if (!idCanchaSeleccionada) {
        window.history.back();
        return;
    }

    // 2. Configurar el calendario (Bloquear fechas pasadas)
    configurarCalendario();
});

function configurarCalendario() {
    const inputFecha = document.getElementById('input-fecha');

    // Obtener fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date();
    // Ajuste de zona horaria local para evitar problemas con UTC
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    const hoyString = hoy.toISOString().split('T')[0];

    // Bloqueamos los días pasados
    inputFecha.min = hoyString;

    // Escuchar cuando el usuario cambia la fecha
    inputFecha.addEventListener('change', (e) => {
        fechaSeleccionada = e.target.value;
        horaSeleccionada = null; // Reiniciar hora si cambia el día
        ocultarBotonContinuar();
        buscarDisponibilidad(idCanchaSeleccionada, fechaSeleccionada);
    });
}

async function buscarDisponibilidad(idCancha, fecha) {
    const contenedorHorarios = document.getElementById('contenedor-horarios');

    // Mostrar spinner de carga
    contenedorHorarios.innerHTML = `
        <div class="col-12 text-center py-4">
            <div class="spinner-border text-sports" role="status"></div>
            <p class="text-light-50 mt-2 small">Buscando turnos disponibles...</p>
        </div>`;

    if (USAR_MOCKS) {
        setTimeout(() => {
            // Mock simulando horarios de 18:00 a 23:00
            const horariosMock = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
            renderizarHorarios(horariosMock);
        }, 800);
        return;
    }

    try {
        // Consultamos la ruta que vimos en tu clienteRoutes.js
        const url = `${API}/api/cliente/canchas/${idCancha}/disponibilidad?fecha=${fecha}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const datos = await response.json();

        // Asumiendo que la API devuelve un array de strings (ej: ["18:00", "19:00"])
        // o un array de objetos dependiendo de tu backend.
        // Si devuelve objetos tipo { hora: "18:00", disponible: true }, tendrías que mapearlo.
        const horariosDisponibles = Array.isArray(datos) ? datos : datos.horarios || [];

        renderizarHorarios(horariosDisponibles);

    } catch (error) {
        console.error('Error al cargar horarios:', error);
        contenedorHorarios.innerHTML = `
            <div class="col-12 text-center text-danger py-4">
                <i class="fa-solid fa-triangle-exclamation fa-2x mb-2"></i>
                <p class="small text-light-50">Error al consultar turnos. Intentá nuevamente.</p>
            </div>`;
    }
}

function renderizarHorarios(horarios) {
    const contenedor = document.getElementById('contenedor-horarios');
    contenedor.innerHTML = '';

    if (!horarios || horarios.length === 0) {
        contenedor.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fa-solid fa-face-frown fa-2x text-light-50 opacity-50 mb-3"></i>
                <h6 class="text-white">Sin turnos disponibles</h6>
                <p class="text-light-50 small mb-0">Esta cancha ya está completamente reservada para este día. Por favor, probá con otra fecha.</p>
            </div>`;
        return;
    }

    horarios.forEach(hora => {
        // En caso de que la API devuelva "18:00:00", cortamos los segundos
        const horaCorta = hora.length > 5 ? hora.substring(0, 5) : hora;

        // Creamos la "Píldora"
        const div = document.createElement('div');
        div.className = 'col-4 col-sm-3'; // 3 columnas en móvil, 4 en tablet/PC

        div.innerHTML = `
            <div class="hora-pill" onclick="seleccionarHora(this, '${horaCorta}')">
                ${horaCorta}
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// Lógica de Selección Visual
window.seleccionarHora = function(elementoPill, hora) {
    // 1. Quitar la clase 'selected' de todos los demás botones
    document.querySelectorAll('.hora-pill').forEach(pill => {
        pill.classList.remove('selected');
    });

    // 2. Aplicar la clase 'selected' al tocado
    elementoPill.classList.add('selected');

    // 3. Guardar la hora y mostrar el botón para continuar
    horaSeleccionada = hora;
    mostrarBotonContinuar();
}

function mostrarBotonContinuar() {
    const contenedorBtn = document.getElementById('contenedor-continuar');
    contenedorBtn.classList.remove('d-none');

    // Configurar el click del botón Continuar
    document.getElementById('btn-continuar').onclick = () => {
        if (!horaSeleccionada || !fechaSeleccionada) return;

        // Avanzamos al PASO 4 pasando todos los datos necesarios por URL
        const queryParams = new URLSearchParams({
            idCancha: idCanchaSeleccionada,
            fecha: fechaSeleccionada,
            hora: horaSeleccionada
        });

        window.location.href = `confirmarReserva.html?${queryParams.toString()}`;
    };
}

function ocultarBotonContinuar() {
    document.getElementById('contenedor-continuar').classList.add('d-none');
}
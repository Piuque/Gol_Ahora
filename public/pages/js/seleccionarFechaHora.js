/* ==========================================================================
   GOL AHORA — seleccionarFechaHora.js (PRODUCCIÓN - RENDER)
   ========================================================================== */

const API = window.location.origin;

let idCanchaSeleccionada = null;
let fechaSeleccionada = null;
let horaSeleccionada = null;
let duracionCanchaMinutos = 60; // Valor por defecto como salvavidas

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    idCanchaSeleccionada = urlParams.get('idCancha');

    // Seguridad: Si no hay ID de cancha en la URL, lo devolvemos al paso anterior
    if (!idCanchaSeleccionada) {
        window.history.back();
        return;
    }

    cargarDatosCancha(idCanchaSeleccionada);
});

// ==========================================
// 1. LEER FORMATO Y DURACIÓN DE LA CANCHA
// ==========================================
async function cargarDatosCancha(id) {
    try {
        const response = await fetch(`${API}/api/cliente/canchas/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            // Validamos por si tu API devuelve un arreglo con la cancha o el objeto directo
            const canchaData = Array.isArray(data) ? (data.find(c => c.id == id) || data[0]) : data;
            duracionCanchaMinutos = canchaData?.duracion_min || 60;
        }
    } catch (e) {
        console.error("Error cargando duración de la cancha desde la API:", e);
    }

    // Una vez que sabemos cuánto dura el turno, habilitamos el calendario
    configurarCalendario();
}

// ==========================================
// 2. GENERAR GRILLA HASTA LA MEDIANOCHE
// ==========================================
function generarHorariosClub(duracionMinutos) {
    const bloques = [];
    let inicioHora = 8;
    let inicioMinuto = 0;

    const finHoraMax = 24; // Medianoche

    while (inicioHora < finHoraMax) {
        let finMinuto = inicioMinuto + duracionMinutos;
        let finHora = inicioHora + Math.floor(finMinuto / 60);
        finMinuto = finMinuto % 60;

        if (finHora > finHoraMax || (finHora === finHoraMax && finMinuto > 0)) {
            break;
        }

        const strInicio = `${String(inicioHora).padStart(2, '0')}:${String(inicioMinuto).padStart(2, '0')}`;

        const strFinHora = finHora === 24 ? '00' : String(finHora).padStart(2, '0');
        const strFin = `${strFinHora}:${String(finMinuto).padStart(2, '0')}`;

        bloques.push({
            horaInicio: strInicio,
            horaFin: strFin,
            rangoTexto: `${strInicio} hs a ${strFin} hs`
        });

        inicioHora = finHora;
        inicioMinuto = finMinuto;
    }
    return bloques;
}

// ==========================================
// 3. CONFIGURAR CALENDARIO NATIVO
// ==========================================
function configurarCalendario() {
    const inputFecha = document.getElementById('input-fecha');
    inputFecha.disabled = false;

    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    inputFecha.min = hoy.toISOString().split('T')[0];

    const limiteMaximo = new Date(hoy);
    limiteMaximo.setMonth(limiteMaximo.getMonth() + 1);
    inputFecha.max = limiteMaximo.toISOString().split('T')[0];

    document.getElementById('contenedor-horarios').innerHTML = `
        <div class="col-12 text-center py-4 text-light-50">
            <i class="fa-regular fa-calendar-days fa-3x opacity-50 mb-3"></i>
            <p class="mb-0">Elegí un día para ver los bloques horarios disponibles.</p>
        </div>`;

    inputFecha.addEventListener('change', (e) => {
        fechaSeleccionada = e.target.value;
        horaSeleccionada = null;
        ocultarBotonContinuar();
        buscarDisponibilidad(idCanchaSeleccionada, fechaSeleccionada);
    });
}

// ==========================================
// 4. LÓGICA DE OCUPACIONES API REAL
// ==========================================
async function buscarDisponibilidad(idCancha, fecha) {
    const contenedor = document.getElementById('contenedor-horarios');
    contenedor.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-sports"></div><p class="text-light-50 mt-2 small">Calculando turnos reales...</p></div>`;

    try {
        const url = `${API}/api/cliente/canchas/${idCancha}/ocupaciones?fecha=${fecha}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        // Si no está logueado, lo mandamos al login
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const ocupaciones = await response.json();
        procesarYMostrarGrilla(fecha, ocupaciones);

    } catch (e) {
        console.error("Error al consultar ocupaciones:", e);
        contenedor.innerHTML = `
            <div class="col-12 text-center text-danger py-4">
                <i class="fa-solid fa-triangle-exclamation fa-2x mb-2"></i>
                <p class="small text-light-50">Error al conectar con el servidor. Intentá nuevamente.</p>
            </div>`;
    }
}

function procesarYMostrarGrilla(fechaElegida, ocupacionesArray) {
    const bloquesClub = generarHorariosClub(duracionCanchaMinutos);

    const ocupacionesMapeadas = {};
    if (Array.isArray(ocupacionesArray)) {
        ocupacionesArray.forEach(oc => {
            let horaStr = oc.hora_inicio || oc.horaInicio || oc.hora || '';
            let tipo = oc.tipo || oc.motivo || 'Ocupado';
            if (horaStr.length >= 5) {
                ocupacionesMapeadas[horaStr.substring(0, 5)] = tipo;
            }
        });
    }

    const hoyObj = new Date();
    // Usamos fecha local (no UTC) para evitar el desfase horario en Argentina (UTC-3)
    const hoyLocal = `${hoyObj.getFullYear()}-${String(hoyObj.getMonth() + 1).padStart(2, '0')}-${String(hoyObj.getDate()).padStart(2, '0')}`;
    const esHoy = (fechaElegida === hoyLocal);
    const horaActual = hoyObj.getHours();
    const minutoActual = hoyObj.getMinutes();

    const grillaFinal = bloquesClub.map(bloque => {
        const horaInicioNum = parseInt(bloque.horaInicio.split(':')[0]);

        if (esHoy && (horaInicioNum < horaActual || (horaInicioNum === horaActual && parseInt(bloque.horaInicio.split(':')[1]) <= minutoActual))) {
            return { ...bloque, disponible: false, motivo: "Pasado", claseCss: "ocupacion-pasado" };
        }

        if (ocupacionesMapeadas[bloque.horaInicio]) {
            const motivoReal = ocupacionesMapeadas[bloque.horaInicio];
            let css = "ocupacion-reserva";
            if (motivoReal.toLowerCase().includes('clase') || motivoReal.toLowerCase().includes('entrenamiento')) css = "ocupacion-clase";
            if (motivoReal.toLowerCase().includes('mantenimiento')) css = "ocupacion-mantenimiento";

            return { ...bloque, disponible: false, motivo: motivoReal, claseCss: css };
        }

        return { ...bloque, disponible: true, motivo: "Disponible", claseCss: "" };
    });

    renderizarListaVertical(grillaFinal);
}

function renderizarListaVertical(grilla) {
    const contenedor = document.getElementById('contenedor-horarios');
    contenedor.innerHTML = '';

    grilla.forEach(turno => {
        const div = document.createElement('div');
        div.className = 'col-12';

        if (turno.disponible) {
            div.innerHTML = `
                <div class="hora-pill" onclick="seleccionarHora(this, '${turno.horaInicio}')">
                    <span class="hora-texto"><i class="fa-regular fa-calendar-check me-2 text-sports"></i>${turno.rangoTexto}</span>
                    <span class="hora-subtexto">Disponible</span>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="hora-pill disabled ${turno.claseCss}">
                    <span class="hora-texto"><i class="fa-solid fa-lock opacity-50 me-2"></i>${turno.rangoTexto}</span>
                    <span class="hora-subtexto">${turno.motivo}</span>
                </div>
            `;
        }
        contenedor.appendChild(div);
    });
}

window.seleccionarHora = function(elementoPill, horaInicio) {
    document.querySelectorAll('.hora-pill').forEach(pill => pill.classList.remove('selected'));
    elementoPill.classList.add('selected');

    horaSeleccionada = horaInicio;
    mostrarBotonContinuar();
}

function mostrarBotonContinuar() {
    document.getElementById('contenedor-continuar').classList.remove('d-none');

    document.getElementById('btn-continuar').onclick = () => {
        if (!horaSeleccionada || !fechaSeleccionada) return;

        // Redirección real al último paso enviando todos los datos recopilados por URL
        const queryParams = new URLSearchParams({
            idCancha: idCanchaSeleccionada,
            fecha: fechaSeleccionada,
            hora: horaSeleccionada
        });

        window.location.href = `confirmarReservaCliente.html?${queryParams.toString()}`;
    };
}

function ocultarBotonContinuar() {
    document.getElementById('contenedor-continuar').classList.add('d-none');
}
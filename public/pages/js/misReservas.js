/* ==========================================================================
   GOL AHORA — misReservas.js
   ========================================================================== */

const API = window.location.origin;

let todasLasReservas = []; // caché global para filtros

document.addEventListener('DOMContentLoaded', () => {
    cargarReservas();
    inicializarFiltros();
});

// ==========================================
// FILTROS
// ==========================================
// Estilos de cada filtro en estado inactivo y activo
const FILTRO_STYLES = {
    'todas':      { bg: 'rgba(0,193,110,0.08)',   border: 'rgba(0,193,110,0.2)',   color: '#00C16E',  bgActive: 'rgba(0,193,110,0.18)',  borderActive: 'rgba(0,193,110,0.5)'  },
    'Pendiente':  { bg: 'rgba(255,193,7,0.08)',   border: 'rgba(255,193,7,0.25)',  color: '#ffc107',  bgActive: 'rgba(255,193,7,0.22)',   borderActive: 'rgba(255,193,7,0.6)'  },
    'Confirmada': { bg: 'rgba(25,135,84,0.08)',   border: 'rgba(25,135,84,0.25)', color: '#198754',  bgActive: 'rgba(25,135,84,0.22)',   borderActive: 'rgba(25,135,84,0.6)'  },
    'futuras':    { bg: 'rgba(99,179,237,0.08)',  border: 'rgba(99,179,237,0.2)', color: '#63b3ed',  bgActive: 'rgba(99,179,237,0.2)',   borderActive: 'rgba(99,179,237,0.55)' },
    'pasadas':    { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',color: '#94a3b8',  bgActive: 'rgba(148,163,184,0.2)',  borderActive: 'rgba(148,163,184,0.5)' },
};

function inicializarFiltros() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-btn').forEach(b => {
                const s = FILTRO_STYLES[b.dataset.filtro] || FILTRO_STYLES['todas'];
                b.style.background   = s.bg;
                b.style.borderColor  = s.border;
                b.style.color        = s.color;
                b.classList.remove('active');
            });
            const s = FILTRO_STYLES[btn.dataset.filtro] || FILTRO_STYLES['todas'];
            btn.style.background  = s.bgActive;
            btn.style.borderColor = s.borderActive;
            btn.style.color       = s.color;
            btn.classList.add('active');
            aplicarFiltro(btn.dataset.filtro);
        });
    });
}

function aplicarFiltro(filtro) {
    let filtradas;
    if (filtro === 'todas') {
        filtradas = todasLasReservas;
    } else if (filtro === 'futuras') {
        filtradas = todasLasReservas.filter(r => !reservaEsPasada(r.fecha, r.hora_inicio));
    } else if (filtro === 'pasadas') {
        filtradas = todasLasReservas.filter(r => reservaEsPasada(r.fecha, r.hora_inicio));
    } else {
        filtradas = todasLasReservas.filter(r => r.estado === filtro);
    }
    renderizarTarjetas(filtradas);
}

// ==========================================
// CARGAR RESERVAS
// ==========================================
async function cargarReservas() {
    const contenedor = document.getElementById('contenedor-reservas');
    try {
        const response = await fetch(`${API}/api/cliente/reservas`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        todasLasReservas = await response.json();

        const filtroActivo = document.querySelector('.filtro-btn.active')?.dataset.filtro || 'todas';
        aplicarFiltro(filtroActivo);

    } catch (error) {
        console.error('Error al cargar reservas:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <h5 class="text-white">Hubo un problema al cargar tus reservas</h5>
                <p class="text-light-50 small">${error.message}</p>
            </div>`;
    }
}

// ==========================================
// HELPERS DE FECHA / HORA
// ==========================================
function formatearFecha(fechaStr) {
    if (!fechaStr) return 'Fecha no especificada';
    const f = new Date(fechaStr + 'T00:00:00');
    let s = f.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function reservaEsPasada(fecha, horaInicio) {
    const ahora = new Date();
    const [y, m, d] = fecha.split('-');
    const [h, min] = horaInicio.split(':');
    const fechaReserva = new Date(y, m - 1, d, h, min);
    return fechaReserva < ahora;
}

function horasHastaReserva(fecha, horaInicio) {
    const ahora = new Date();
    const [y, m, d] = fecha.split('-');
    const [h, min] = horaInicio.split(':');
    const fechaReserva = new Date(y, m - 1, d, h, min);
    return (fechaReserva - ahora) / (1000 * 60 * 60);
}

// ==========================================
// RENDERIZADO
// ==========================================
function renderizarTarjetas(reservas) {
    const contenedor = document.getElementById('contenedor-reservas');
    contenedor.innerHTML = '';

    if (!reservas || reservas.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-regular fa-calendar-xmark fa-3x mb-3 opacity-50"></i>
                <p>No hay reservas para mostrar.</p>
                <a href="/cliente/tipos-cancha" class="btn btn-sm btn-sports mt-2">¡Reservar ahora!</a>
            </div>`;
        return;
    }

    reservas.forEach(reserva => {
        const pasada = reservaEsPasada(reserva.fecha, reserva.hora_inicio);
        const canceladaOFinalizada = reserva.estado === 'Cancelada' || reserva.estado === 'Finalizada';

        let badgeClass, badgeText;
        if (reserva.estado === 'Confirmada')   { badgeClass = 'bg-success text-white'; badgeText = 'Confirmada'; }
        else if (reserva.estado === 'Pendiente') { badgeClass = 'bg-warning text-dark';  badgeText = 'Pendiente'; }
        else if (reserva.estado === 'Cancelada') { badgeClass = 'bg-danger text-white';  badgeText = 'Cancelada'; }
        else                                     { badgeClass = 'bg-secondary text-white'; badgeText = reserva.estado; }

        if (pasada && reserva.estado !== 'Cancelada') {
            badgeClass = 'bg-secondary text-white';
            badgeText = 'Finalizada';
        }

        // Botones: "Ver detalles" siempre, "Modificar" y "Cancelar" solo si no está pasada/cancelada
        const mostrarAcciones = !pasada && !canceladaOFinalizada;

        contenedor.innerHTML += `
            <div class="reserva-card d-flex flex-column" data-id="${reserva.id_reserva}">
                <div class="mb-2">
                    <h5 class="fw-bold text-white mb-1" style="font-size:1.05rem;line-height:1.4;">${reserva.cancha_nombre || 'Cancha #' + reserva.id_reserva}</h5>
                    <span class="badge" style="font-size:0.7rem;">${reserva.tipo_cancha || ''}</span>
                </div>
                <div class="mb-3">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="mb-4 flex-grow-1">
                    <div class="text-light-75 small mb-3 d-flex align-items-center">
                        <i class="fa-solid fa-calendar-day text-sports me-3" style="font-size:1.1rem;"></i>
                        <span style="font-size:0.9rem;">${formatearFecha(reserva.fecha)}</span>
                    </div>
                    <div class="text-light-75 small d-flex align-items-center">
                        <i class="fa-solid fa-clock text-sports me-3" style="font-size:1.1rem;"></i>
                        <span style="font-size:0.9rem;">${reserva.hora_inicio} a ${reserva.hora_fin} hs</span>
                    </div>
                </div>
                <div class="d-flex flex-column gap-2 mt-auto pt-3 border-top border-secondary">
                    <button class="btn btn-sm btn-outline-light w-100 fw-bold py-2" onclick="verDetalles(${reserva.id_reserva})">
                        <i class="fa-solid fa-eye me-1"></i> Ver Detalles
                    </button>
                    ${mostrarAcciones ? `
                    <button class="btn btn-sm btn-outline-warning w-100 fw-bold py-2" onclick="modificarReserva(${reserva.id_reserva})">
                        <i class="fa-solid fa-pen me-1"></i> Modificar Turno
                    </button>
                    <button class="btn btn-sm btn-outline-danger w-100 fw-bold py-2" onclick="cancelarReserva(${reserva.id_reserva})">
                        <i class="fa-solid fa-xmark me-1"></i> Cancelar
                    </button>` : ''}
                </div>
            </div>`;
    });
}

// ==========================================
// 1. VER DETALLES
// ==========================================
function verDetalles(id) {
    const r = todasLasReservas.find(x => x.id_reserva === id);
    if (!r) return;

    const pasada = reservaEsPasada(r.fecha, r.hora_inicio);
    let badgeColor, badgeText;
    if (r.estado === 'Confirmada')     { badgeColor = '#198754'; badgeText = 'Confirmada'; }
    else if (r.estado === 'Pendiente') { badgeColor = '#ffc107'; badgeText = 'Pendiente'; }
    else if (r.estado === 'Cancelada') { badgeColor = '#dc3545'; badgeText = 'Cancelada'; }
    else                               { badgeColor = '#6c757d'; badgeText = r.estado; }
    if (pasada && r.estado !== 'Cancelada') { badgeColor = '#6c757d'; badgeText = 'Finalizada'; }

    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '480px',
        showConfirmButton: true,
        confirmButtonColor: '#00C16E',
        confirmButtonText: 'Cerrar',
        showCloseButton: true,
        html: `
        <div style="font-family:'Poppins',sans-serif;text-align:left;padding:4px 4px 0;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:44px;height:44px;border-radius:50%;background:rgba(0,193,110,0.12);border:1px solid rgba(0,193,110,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid fa-calendar-check" style="color:#00C16E;font-size:1rem;"></i>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:700;color:#fff;">${r.cancha_nombre || 'Reserva #' + id}</div>
                    <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);">${r.tipo_cancha || ''}</div>
                </div>
                <span style="margin-left:auto;background:${badgeColor}22;border:1px solid ${badgeColor}55;color:${badgeColor};border-radius:4px;padding:3px 10px;font-size:0.72rem;font-weight:700;">${badgeText}</span>
            </div>

            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:12px;">
                <div style="font-size:0.62rem;font-weight:700;color:#00C16E;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Turno</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Fecha</div><div style="font-size:0.85rem;font-weight:500;">${formatearFecha(r.fecha)}</div></div>
                    <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Horario</div><div style="font-size:0.85rem;font-weight:500;">${r.hora_inicio} — ${r.hora_fin} hs</div></div>
                    <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">ID Reserva</div><div style="font-size:0.85rem;font-weight:500;">#${r.id_reserva}</div></div>
                    <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Cancha</div><div style="font-size:0.85rem;font-weight:500;">${r.cancha_nombre}</div></div>
                </div>
            </div>

            <div style="background:rgba(0,193,110,0.04);border:1px solid rgba(0,193,110,0.12);border-radius:8px;padding:10px 14px;font-size:0.78rem;color:rgba(255,255,255,0.55);">
                <i class="fa-solid fa-circle-info me-2" style="color:#00C16E;"></i>
                Para consultar el detalle del cobro o imprimir tu recibo, visitá
                <a href="/cliente/misPagos" style="color:#00C16E;font-weight:600;">Mis Pagos</a>
                o acercate a la recepción del club.
            </div>
        </div>`
    });
}

// ==========================================
// 2. MODIFICAR RESERVA
// ==========================================
async function modificarReserva(id) {
    const r = todasLasReservas.find(x => x.id_reserva === id);
    if (!r) return;

    // Paso 1: Seleccionar nueva fecha
    const { value: nuevaFecha, isConfirmed } = await Swal.fire({
        background: '#0A2540',
        color: '#fff',
        title: '<span style="color:#00C16E;font-size:1rem;font-weight:700;"><i class="fa-solid fa-pen me-2"></i>Modificar Turno</span>',
        html: `
            <p style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin-bottom:16px;">
                Turno actual: <strong style="color:#fff;">${formatearFecha(r.fecha)} · ${r.hora_inicio} hs</strong><br>
                Solo podés cambiar la fecha. La cancha y el precio se mantienen.
            </p>
            <label style="font-size:0.7rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">Nueva fecha</label>
            <input type="date" id="swal-nueva-fecha"
                style="width:100%;background:rgba(7,21,36,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:10px 12px;border-radius:8px;font-size:0.9rem;"
                min="${new Date().toISOString().split('T')[0]}">
            <div id="swal-slots" style="margin-top:16px;max-height:280px;overflow-y:auto;"></div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Confirmar cambio',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        didOpen: () => {
            const inputFecha = document.getElementById('swal-nueva-fecha');
            inputFecha.addEventListener('change', async (e) => {
                const fecha = e.target.value;
                if (!fecha) return;
                const slotsDiv = document.getElementById('swal-slots');
                slotsDiv.innerHTML = `<div style="text-align:center;padding:12px;color:rgba(255,255,255,0.5);font-size:0.82rem;"><i class="fa-solid fa-spinner fa-spin me-2"></i>Verificando disponibilidad...</div>`;

                try {
                    // Obtener cancha para saber id_cancha
                    const idCancha = r.id_cancha || await obtenerIdCancha(id);
                    const resp = await fetch(`${API}/api/cliente/canchas/${idCancha}/ocupaciones?fecha=${fecha}`, {
                        headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
                        credentials: 'include'
                    });
                    const ocupaciones = await resp.json();
                    renderizarSlotsEnSwal(ocupaciones, fecha, r.hora_inicio, r.hora_fin);
                } catch {
                    slotsDiv.innerHTML = `<div style="color:#ef4444;font-size:0.8rem;padding:8px;">No se pudo verificar disponibilidad. Intentá de nuevo.</div>`;
                }
            });
        },
        preConfirm: () => {
            const fecha = document.getElementById('swal-nueva-fecha')?.value;
            const slotSelected = document.querySelector('.slot-pill.selected-slot');
            if (!fecha) { Swal.showValidationMessage('Seleccioná una fecha'); return false; }
            if (!slotSelected) { Swal.showValidationMessage('Seleccioná un horario disponible'); return false; }
            return {
                fecha,
                hora_inicio: slotSelected.dataset.inicio,
                hora_fin:    slotSelected.dataset.fin
            };
        }
    });

    if (!isConfirmed || !nuevaFecha) return;

    // Paso 2: Confirmar y enviar PUT
    const confirmacion = await Swal.fire({
        background: '#0A2540', color: '#fff',
        icon: 'question', iconColor: '#00C16E',
        title: '¿Confirmar cambio?',
        html: `<p style="font-size:0.85rem;">El turno pasará a:<br><strong>${formatearFecha(nuevaFecha.fecha)} · ${nuevaFecha.hora_inicio} hs</strong></p>`,
        showCancelButton: true,
        confirmButtonColor: '#00C16E', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, modificar', cancelButtonText: 'Volver',
        reverseButtons: true
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const res = await fetch(`${API}/api/cliente/reservas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include',
            body: JSON.stringify({
                fecha:       nuevaFecha.fecha,
                hora_inicio: nuevaFecha.hora_inicio + ':00',
                hora_fin:    nuevaFecha.hora_fin    + ':00'
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Error ${res.status}`);
        }

        await Swal.fire({
            icon: 'success', iconColor: '#00C16E', background: '#0A2540', color: '#fff',
            title: '¡Solicitud enviada!',
            text: 'Un administrador revisará el cambio de horario a la brevedad.',
            confirmButtonColor: '#00C16E'
        });

        await cargarReservas();

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message,
            background: '#071524', color: '#fff', confirmButtonColor: '#ef4444' });
    }
}

// --- Helpers para slots dentro del Swal ---
async function obtenerIdCancha(idReserva) {
    // Fallback: intentar leer id_cancha de la primera reserva que coincida
    const r = todasLasReservas.find(x => x.id_reserva === idReserva);
    return r?.id_cancha || 1;
}

function renderizarSlotsEnSwal(ocupaciones, fecha, horaInicioActual, horaFinActual) {
    const slotsDiv = document.getElementById('swal-slots');
    if (!slotsDiv) return;

    // Calcular duración del turno actual
    const [hI, mI] = horaInicioActual.split(':').map(Number);
    const [hF, mF] = horaFinActual.split(':').map(Number);
    const duracion = (hF * 60 + mF) - (hI * 60 + mI);

    // Generar grilla desde 08:00 hasta 24:00 con esa duración
    const bloques = [];
    let cur = 8 * 60;
    while (cur + duracion <= 24 * 60) {
        const ini = `${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`;
        const fin = `${String(Math.floor((cur+duracion)/60) === 24 ? '00' : Math.floor((cur+duracion)/60)).padStart(2,'0')}:${String((cur+duracion)%60).padStart(2,'0')}`;
        bloques.push({ ini, fin });
        cur += duracion;
    }

    const ocupacionesMapeadas = {};
    (Array.isArray(ocupaciones) ? ocupaciones : []).forEach(oc => {
        const h = (oc.hora_inicio || '').substring(0,5);
        if (h) ocupacionesMapeadas[h] = true;
    });

    const ahora = new Date();
    const hoyLocal = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
    const esHoy = fecha === hoyLocal;

    let html = `<div style="font-size:0.68rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Horarios disponibles</div>`;

    bloques.forEach(b => {
        const hNum = parseInt(b.ini.split(':')[0]);
        const mNum = parseInt(b.ini.split(':')[1]);
        const pasado = esHoy && (hNum < ahora.getHours() || (hNum === ahora.getHours() && mNum <= ahora.getMinutes()));
        const ocupado = ocupacionesMapeadas[b.ini];
        const disabled = pasado || ocupado;

        if (disabled) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.04);color:rgba(255,255,255,0.25);">
                <span style="font-size:0.85rem;"><i class="fa-solid fa-lock" style="opacity:0.4;margin-right:8px;"></i>${b.ini} hs a ${b.fin} hs</span>
                <span style="font-size:0.7rem;background:rgba(239,68,68,0.1);color:#ef4444;padding:3px 8px;border-radius:5px;">${pasado ? 'Pasado' : 'Ocupado'}</span>
            </div>`;
        } else {
            html += `<div class="slot-pill" data-inicio="${b.ini}" data-fin="${b.fin}"
                onclick="seleccionarSlot(this)"
                style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#e2e8f0;cursor:pointer;transition:all 0.2s;">
                <span style="font-size:0.85rem;font-weight:600;"><i class="fa-regular fa-calendar-check" style="color:#00C16E;margin-right:8px;"></i>${b.ini} hs a ${b.fin} hs</span>
                <span style="font-size:0.7rem;background:rgba(0,193,110,0.15);color:#00C16E;padding:3px 8px;border-radius:5px;">Disponible</span>
            </div>`;
        }
    });

    slotsDiv.innerHTML = html;
}

window.seleccionarSlot = function(el) {
    document.querySelectorAll('.slot-pill').forEach(p => {
        p.style.background = 'rgba(255,255,255,0.03)';
        p.style.borderColor = 'rgba(255,255,255,0.08)';
        p.classList.remove('selected-slot');
    });
    el.style.background = '#00C16E';
    el.style.borderColor = '#00C16E';
    el.style.color = '#071524';
    el.classList.add('selected-slot');
};

// ==========================================
// 3. CANCELAR RESERVA
// ==========================================
async function cancelarReserva(id) {
    const r = todasLasReservas.find(x => x.id_reserva === id);
    if (!r) return;

    const horas = horasHastaReserva(r.fecha, r.hora_inicio);
    const sinReembolso = horas < 6; // el backend usa 6 horas de corte

    // Advertencia diferente según si hay reembolso o no
    const advertencia = sinReembolso
        ? `<p style="color:#f25c54;font-weight:600;font-size:0.88rem;margin-top:8px;"><i class="fa-solid fa-triangle-exclamation me-2"></i>El turno es en menos de 6 horas — <u>no habrá devolución del dinero.</u></p>`
        : `<p style="color:rgba(255,255,255,0.6);font-size:0.85rem;margin-top:8px;">Como cancelás con más de 6 horas de anticipación, tu pago será reembolsado.</p>`;

    const confirm1 = await Swal.fire({
        background: '#0A2540', color: '#fff',
        icon: 'warning', iconColor: sinReembolso ? '#f25c54' : '#ffc107',
        title: '¿Cancelar reserva?',
        html: `<p style="font-size:0.85rem;color:rgba(255,255,255,0.65);">
                    <strong style="color:#fff;">${r.cancha_nombre}</strong><br>
                    ${formatearFecha(r.fecha)} · ${r.hora_inicio} hs
               </p>${advertencia}`,
        showCancelButton: true,
        confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar turno',
        cancelButtonText: 'Volver',
        reverseButtons: true
    });

    if (!confirm1.isConfirmed) return;

    try {
        const res = await fetch(`${API}/api/cliente/reservas/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Error ${res.status}`);
        }

        // Descargar PDF de cancelación
        generarPdfCancelacion(r, sinReembolso);

        if (sinReembolso) {
            await Swal.fire({
                background: '#0A2540', color: '#fff',
                icon: 'warning', iconColor: '#ffc107',
                title: 'Turno cancelado',
                html: `<p style="font-size:0.85rem;color:rgba(255,255,255,0.65);margin-bottom:8px;">
                           Tu reserva fue cancelada. Dado que el turno era en menos de 6 horas, <strong style="color:#ffc107;">no se realizará reembolso.</strong>
                       </p>
                       <p style="font-size:0.82rem;color:rgba(255,255,255,0.5);">
                           Si tenés dudas sobre el cobro, acercate a la recepción del club o escribinos.
                       </p>`,
                confirmButtonColor: '#00C16E', confirmButtonText: 'Entendido'
            });
        } else {
            await Swal.fire({
                background: '#0A2540', color: '#fff',
                icon: 'success', iconColor: '#00C16E',
                title: 'Turno cancelado',
                html: `<p style="font-size:0.85rem;color:rgba(255,255,255,0.65);margin-bottom:8px;">
                           Tu reserva fue cancelada exitosamente.
                       </p>
                       <p style="font-size:0.82rem;color:rgba(255,255,255,0.5);">
                           El proceso de <strong style="color:#00C16E;">reembolso está en curso.</strong> Verificá el acreditamiento en tu cuenta en los próximos días hábiles, o acercate a la recepción del club.
                       </p>`,
                confirmButtonColor: '#00C16E', confirmButtonText: 'Entendido'
            });
        }

        await cargarReservas();

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error al cancelar', text: err.message,
            background: '#071524', color: '#fff', confirmButtonColor: '#ef4444' });
    }
}

// ==========================================
// HELPERS PDF
// ==========================================
function nroAleatorio() {
    return Math.floor(10000 + Math.random() * 90000);
}

function pdfLinea(doc, label, valor, y, xLabel = 22, xValor = 80) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), xLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.text(String(valor || '—'), xValor, y);
}

function pdfEncabezado(doc, tipoDoc, colorTipo, nro) {
    const { jsPDF } = window.jspdf;

    // Franja verde superior
    doc.setFillColor(0, 193, 110);
    doc.rect(0, 0, 210, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('GOL AHORA', 22, 9.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('golahora.com.ar', 210 - 22, 9.5, { align: 'right' });

    // Tipo de documento
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorTipo);
    doc.text(tipoDoc, 22, 30);

    // Número de comprobante
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(`Nro. ${nro}`, 22, 37);

    // Fecha de emisión
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Emitido: ${fecha}`, 210 - 22, 37, { align: 'right' });

    // Línea separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(22, 41, 188, 41);
}

function pdfSeccion(doc, titulo, y) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(20, y - 5, 170, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 193, 110);
    doc.text(titulo.toUpperCase(), 22, y);
    return y + 9;
}

function pdfPie(doc) {
    const y = 280;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(170, 170, 170);
    doc.text('Gol Ahora — comprobante generado automáticamente. Conservalo como respaldo.', 105, y + 5, { align: 'center' });
}

// ==========================================
// PDF — COMPROBANTE DE MODIFICACIÓN
// ==========================================
function generarPdfModificacion(reservaOriginal, nuevoTurno) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nro = nroAleatorio();

    pdfEncabezado(doc, 'MODIFICACIÓN DE TURNO', [21, 101, 192], nro);

    let y = 50;
    y = pdfSeccion(doc, 'Datos de la Reserva', y);

    pdfLinea(doc, 'ID Reserva',   '#' + reservaOriginal.id_reserva, y);     y += 8;
    pdfLinea(doc, 'Cancha',        reservaOriginal.cancha_nombre,    y);     y += 8;
    pdfLinea(doc, 'Tipo',          reservaOriginal.tipo_cancha || '—', y);   y += 8;
    pdfLinea(doc, 'Estado',        reservaOriginal.estado,           y);     y += 12;

    y = pdfSeccion(doc, 'Detalle del Cambio', y);

    // Bloque "antes"
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(20, y, 78, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(180, 80, 0);
    doc.text('FECHA ANTERIOR', 24, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50);
    doc.text(formatearFecha(reservaOriginal.fecha), 24, y + 13);
    doc.setFontSize(8.5); doc.setTextColor(100, 100, 100);
    doc.text(`${reservaOriginal.hora_inicio} — ${reservaOriginal.hora_fin} hs`, 24, y + 19);

    // Flecha
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(0, 193, 110);
    doc.text('→', 103, y + 14, { align: 'center' });

    // Bloque "después"
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(112, y, 78, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(27, 94, 32);
    doc.text('NUEVA FECHA', 116, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(27, 94, 32);
    doc.text(formatearFecha(nuevoTurno.fecha), 116, y + 13);
    doc.setFontSize(8.5);
    doc.text(`${nuevoTurno.hora_inicio} — ${nuevoTurno.hora_fin} hs`, 116, y + 19);

    y += 32;

    // Nota
    doc.setFillColor(235, 245, 255);
    doc.roundedRect(20, y, 170, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 160);
    doc.text('El precio y la cancha no se modifican. Este comprobante reemplaza al anterior.', 105, y + 6, { align: 'center' });
    doc.text('Si tenés dudas, acercate a la recepción del club.', 105, y + 11, { align: 'center' });

    pdfPie(doc);

    doc.save(`golahora-recibo-modificacion-nro${nro}.pdf`);
}

// ==========================================
// PDF — COMPROBANTE DE CANCELACIÓN
// ==========================================
function generarPdfCancelacion(reserva, sinReembolso) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nro = nroAleatorio();

    const colorTitulo = sinReembolso ? [200, 50, 50] : [0, 150, 80];
    const titulo = sinReembolso ? 'CANCELACIÓN SIN REEMBOLSO' : 'CANCELACIÓN CON REEMBOLSO';

    pdfEncabezado(doc, titulo, colorTitulo, nro);

    let y = 50;
    y = pdfSeccion(doc, 'Turno Cancelado', y);

    pdfLinea(doc, 'ID Reserva',   '#' + reserva.id_reserva,  y); y += 8;
    pdfLinea(doc, 'Cancha',        reserva.cancha_nombre,     y); y += 8;
    pdfLinea(doc, 'Tipo',          reserva.tipo_cancha || '—',y); y += 8;
    pdfLinea(doc, 'Fecha del turno', formatearFecha(reserva.fecha), y); y += 8;
    pdfLinea(doc, 'Horario',      `${reserva.hora_inicio} — ${reserva.hora_fin} hs`, y); y += 8;
    pdfLinea(doc, 'Estado anterior', reserva.estado,          y); y += 12;

    y = pdfSeccion(doc, 'Política de Reembolso', y);

    const bgColor  = sinReembolso ? [255, 243, 224] : [232, 245, 233];
    const txtColor = sinReembolso ? [180, 80, 0]    : [27, 94, 32];
    const msgTitulo = sinReembolso ? 'Sin devolución' : 'Reembolso en proceso';
    const msgCuerpo = sinReembolso
        ? 'La cancelación se realizó con menos de 6 horas de anticipación.\nSegún la política del club, no corresponde reembolso.\nPara consultas, acercate a la recepción.'
        : 'La cancelación fue realizada con suficiente anticipación.\nEl reembolso está siendo procesado. Verificá el acreditamiento\nen los próximos días hábiles o acercate a la recepción del club.';

    doc.setFillColor(...bgColor);
    doc.roundedRect(20, y, 170, 28, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...txtColor);
    doc.text(msgTitulo, 24, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(70, 70, 70);
    const lineas = msgCuerpo.split('\n');
    lineas.forEach((l, i) => doc.text(l, 24, y + 14 + i * 5));

    pdfPie(doc);

    const tipo = sinReembolso ? 'cancelacion-sin-reembolso' : 'cancelacion-con-reembolso';
    doc.save(`golahora-recibo-${tipo}-nro${nro}.pdf`);
}
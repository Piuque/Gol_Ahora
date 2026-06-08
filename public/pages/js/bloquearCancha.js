let bloqueoCanchaActual = null;
let bloqueoDuracionMin = 60;
const bloqueoSeleccionados = new Set();

function generarHorariosClub(duracionMinutos) {
    const bloques = [];
    let inicioHora = 8;
    let inicioMinuto = 0;
    while (inicioHora < 24) {
        let finMinuto = inicioMinuto + duracionMinutos;
        let finHora = inicioHora + Math.floor(finMinuto / 60);
        finMinuto = finMinuto % 60;
        if (finHora > 24 || (finHora === 24 && finMinuto > 0)) break;
        const strInicio = `${String(inicioHora).padStart(2, '0')}:${String(inicioMinuto).padStart(2, '0')}`;
        const strFinHora = finHora === 24 ? '00' : String(finHora).padStart(2, '0');
        const strFin = `${strFinHora}:${String(finMinuto).padStart(2, '0')}`;
        bloques.push({ horaInicio: strInicio, horaFin: strFin, rangoTexto: `${strInicio} - ${strFin} hs` });
        inicioHora = finHora;
        inicioMinuto = finMinuto;
    }
    return bloques;
}

function abrirBloqueoCancha(cancha) {
    bloqueoCanchaActual = cancha;
    bloqueoDuracionMin = parseInt(cancha.duracion_min, 10) || 60;
    bloqueoSeleccionados.clear();

    const modalDetalle = bootstrap.Modal.getInstance(document.getElementById('modalCancha'));
    if (modalDetalle) modalDetalle.hide();

    document.getElementById('bloqueo-nombre-cancha').textContent = cancha.nombre;
    document.getElementById('bloqueo-fecha').value = '';
    document.getElementById('bloqueo-dia-completo').checked = false;
    document.getElementById('bloqueo-motivo').value = 'Mantenimiento preventivo';
    document.getElementById('contenedor-bloqueo-turnos').innerHTML =
        '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">Seleccioná una fecha para ver turnos.</div>';

    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    const fechaInput = document.getElementById('bloqueo-fecha');
    fechaInput.min = hoy.toISOString().split('T')[0];
    const limiteMax = new Date(hoy);
    limiteMax.setMonth(limiteMax.getMonth() + 3);
    fechaInput.max = limiteMax.toISOString().split('T')[0];

    const modal = new bootstrap.Modal(document.getElementById('modalBloqueo'));
    modal.show();
}

async function cargarTurnosBloqueo() {
    const contenedor = document.getElementById('contenedor-bloqueo-turnos');
    const fecha = document.getElementById('bloqueo-fecha').value;
    const diaCompleto = document.getElementById('bloqueo-dia-completo').checked;

    bloqueoSeleccionados.clear();

    if (!fecha || !bloqueoCanchaActual) {
        contenedor.innerHTML = '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">Seleccioná una fecha.</div>';
        return;
    }

    if (diaCompleto) {
        contenedor.innerHTML = '<div class="text-warning small py-3 text-center" style="grid-column:1/-1;"><i class="fa-solid fa-calendar-day me-1"></i> Se bloqueará el día completo (08:00 a 23:59).</div>';
        return;
    }

    contenedor.innerHTML = '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">Cargando turnos...</div>';

    const userId = localStorage.getItem('userId');
    let ocupaciones = [];
    try {
        const res = await fetch(`/api/cliente/canchas/${bloqueoCanchaActual.id}/ocupaciones?fecha=${fecha}`, {
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) ocupaciones = await res.json();
    } catch (e) { console.error(e); }

    const ocupadas = {};
    (Array.isArray(ocupaciones) ? ocupaciones : []).forEach(oc => {
        const h = (oc.hora_inicio || '').substring(0, 5);
        if (h) ocupadas[h] = oc.tipo || 'ocupado';
    });

    const bloques = generarHorariosClub(bloqueoDuracionMin);
    const hoyStr = new Date().toISOString().split('T')[0];
    const esHoy = fecha === hoyStr;
    const ahora = new Date();

    contenedor.innerHTML = '';
    bloques.forEach(b => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.dataset.inicio = b.horaInicio;
        btn.dataset.fin = b.horaFin;
        btn.textContent = b.rangoTexto;

        let disponible = true;
        if (ocupadas[b.horaInicio]) {
            disponible = false;
            btn.classList.add('ocupado');
            btn.textContent += ` (${ocupadas[b.horaInicio]})`;
        }
        if (esHoy) {
            const [hh, mm] = b.horaInicio.split(':').map(Number);
            const slotDate = new Date();
            slotDate.setHours(hh, mm, 0, 0);
            if (slotDate <= ahora) {
                disponible = false;
                btn.disabled = true;
                btn.textContent = b.rangoTexto + ' (pasado)';
            }
        }

        if (disponible) {
            btn.addEventListener('click', () => {
                const key = b.horaInicio;
                if (bloqueoSeleccionados.has(key)) {
                    bloqueoSeleccionados.delete(key);
                    btn.classList.remove('selected');
                } else {
                    bloqueoSeleccionados.add(key);
                    btn.classList.add('selected');
                }
            });
        } else {
            btn.disabled = true;
        }
        contenedor.appendChild(btn);
    });

    if (!contenedor.children.length) {
        contenedor.innerHTML = '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">No hay turnos para esta fecha.</div>';
    }
}

async function confirmarBloqueoCancha() {
    const fecha = document.getElementById('bloqueo-fecha').value;
    const diaCompleto = document.getElementById('bloqueo-dia-completo').checked;
    const motivo = document.getElementById('bloqueo-motivo').value.trim() || 'Mantenimiento preventivo';

    if (!bloqueoCanchaActual || !fecha) {
        await Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Seleccioná una fecha.', confirmButtonColor: '#00C16E' });
        return;
    }

    let turnos = [];
    if (diaCompleto) {
        turnos = null;
    } else {
        const bloques = generarHorariosClub(bloqueoDuracionMin);
        turnos = bloques
            .filter(b => bloqueoSeleccionados.has(b.horaInicio))
            .map(b => ({ hora_inicio: b.horaInicio, hora_fin: b.horaFin }));
        if (turnos.length === 0) {
            await Swal.fire({ icon: 'warning', title: 'Sin turnos', text: 'Seleccioná al menos un turno o marcá día completo.', confirmButtonColor: '#00C16E' });
            return;
        }
    }

    const confirm = await Swal.fire({
        icon: 'question',
        title: 'Confirmar bloqueo',
        html: diaCompleto
            ? `¿Bloquear <b>${bloqueoCanchaActual.nombre}</b> el día <b>${fecha}</b> completo por mantenimiento?`
            : `¿Bloquear <b>${turnos.length}</b> turno(s) en <b>${bloqueoCanchaActual.nombre}</b> el <b>${fecha}</b>?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, bloquear',
        confirmButtonColor: '#f59e0b',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem('userId');
    const body = {
        id_cancha: bloqueoCanchaActual.id,
        fecha,
        dia_completo: diaCompleto,
        motivo
    };
    if (!diaCompleto) body.turnos = turnos;

    try {
        const res = await fetch('/admin/canchas/bloqueo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalBloqueo')).hide();
            await Swal.fire({ icon: 'success', title: 'Bloqueo registrado', text: data.message, confirmButtonColor: '#00C16E' });
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('bloqueo-fecha').addEventListener('change', cargarTurnosBloqueo);
    document.getElementById('bloqueo-dia-completo').addEventListener('change', cargarTurnosBloqueo);
    document.getElementById('btn-confirmar-bloqueo').addEventListener('click', confirmarBloqueoCancha);
});

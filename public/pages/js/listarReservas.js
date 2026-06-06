let reservasData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedor-reservas");
    const buscador = document.getElementById("buscador");

    try {
        const res = await fetch("/api/reservas", { credentials: "include" });
        reservasData = await res.json();

        if (!reservasData || reservasData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay reservas registradas.</p>`;
            return;
        }

        renderReservas(reservasData);

    } catch (error) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar las reservas.</p>`;
    }

    buscador.addEventListener("input", () => {
        const query = buscador.value.toLowerCase();
        const filtradas = reservasData.filter(r =>
            `${r.nombre} ${r.apellido}`.toLowerCase().includes(query) ||
            r.cancha.toLowerCase().includes(query) ||
            r.estado_cobro.toLowerCase().includes(query)
        );
        renderReservas(filtradas);
    });
});

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function badgeEstado(estado) {
    const clases = {
        'Pendiente': 'badge-pendiente',
        'Aprobado': 'badge-aprobado',
        'Cancelado': 'badge-cancelado'
    };
    return `<span class="badge-estado ${clases[estado] || 'badge-pendiente'}">${estado}</span>`;
}

function renderReservas(reservas) {
    const contenedor = document.getElementById("contenedor-reservas");

    if (reservas.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron reservas.</p>`;
        return;
    }

    contenedor.innerHTML = "";
    reservas.forEach(r => {
        const div = document.createElement("div");
        div.className = "reserva-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(r);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <p class="text-white fw-bold mb-0">${r.nombre} ${r.apellido}</p>
                    ${badgeEstado(r.estado_cobro)}
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-futbol me-1" style="color:#00C16E"></i> ${r.cancha} · 
                    <i class="fa-solid fa-calendar me-1" style="color:#00C16E"></i> ${formatearFecha(r.fecha)} · 
                    <i class="fa-solid fa-clock me-1" style="color:#00C16E"></i> ${r.hora_inicio} - ${r.hora_fin}
                </p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

function verDetalle(r) {
    document.getElementById("modal-titulo").textContent = `Reserva #${r.id}`;
    document.getElementById("modal-info").innerHTML = `
        <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${r.nombre} ${r.apellido}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${r.email}</span></div>
        <div class="info-row"><span class="info-label">Cancha</span><span class="info-value">${r.cancha}</span></div>
        <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${formatearFecha(r.fecha)}</span></div>
        <div class="info-row"><span class="info-label">Horario</span><span class="info-value">${r.hora_inicio} - ${r.hora_fin}</span></div>
        <div class="info-row"><span class="info-label">Monto</span><span class="info-value">$${parseFloat(r.monto).toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Método de pago</span><span class="info-value">${r.metodo_pago}</span></div>
        <div class="info-row"><span class="info-label">Estado</span><span class="info-value">${badgeEstado(r.estado_cobro)}</span></div>
        <div class="d-flex gap-2 mt-3">
            <button onclick="abrirModificarReserva(${r.id})" 
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                <i class="fa-solid fa-pen me-1"></i> Modificar
            </button>
            <button onclick="confirmarEliminarReserva(${r.id})" 
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                <i class="fa-solid fa-trash me-1"></i> Eliminar
            </button>
        </div>
        <div class="mt-2">
            ${r.estado_cobro === 'Pendiente' ? `
            <button onclick="aprobarPago(${r.id})" class="btn w-100 py-2 fw-bold text-white" style="background-color: #00C16E !important;">
                <i class="fa-solid fa-check me-2"></i> Marcar como Pagado
            </button>` : `
            <button onclick="revertirPago(${r.id})" class="btn w-100 py-2 fw-bold text-white" style="background-color: #f59e0b !important;">
                <i class="fa-solid fa-rotate-left me-2"></i> Revertir a Pendiente
            </button>`}
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById("modalReserva"));
    modal.show();
}

async function abrirModificarReserva(id) {
    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Reserva',
        html: `
            <label class="swal2-label">Fecha</label>
            <input id="swal-fecha" type="date" class="swal2-input">
            <label class="swal2-label">Hora inicio</label>
            <select id="swal-hora-inicio" class="swal2-input">
                ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00']
                    .map(h => `<option value="${h}">${h}</option>`).join('')}
            </select>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const fecha = document.getElementById('swal-fecha').value;
            const hora_inicio = document.getElementById('swal-hora-inicio').value;
            const [h] = hora_inicio.split(':').map(Number);
            const hora_fin = ((h + 1) % 24).toString().padStart(2, '0') + ':00';
            if (!fecha) {
                Swal.showValidationMessage('La fecha es obligatoria');
                return false;
            }
            return { fecha, hora_inicio, hora_fin };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(`/api/reservas/reserva_id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Reserva modificada correctamente.', confirmButtonColor: '#00C16E' });
            await recargarReservas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (error) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminarReserva(id) {
    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar reserva?',
        text: 'Se eliminará la reserva y su cobro asociado.',
        confirmButtonText: 'Sí, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/api/reservas/reserva_id=${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'plataform': 'web' }
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Reserva eliminada correctamente.', confirmButtonColor: '#00C16E' });
            await recargarReservas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (error) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function revertirPago(id) {
    try {
        const res = await fetch(`/api/reservas/reserva_id=${id}/pendiente`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'plataform': 'web' }
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Pago revertido a pendiente.', confirmButtonColor: '#00C16E' });
            bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
            await recargarReservas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (error) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function recargarReservas() {
    const res = await fetch("/api/reservas", { credentials: "include" });
    reservasData = await res.json();
    renderReservas(reservasData);
}

async function aprobarPago(id) {
    try {
        const res = await fetch(`/api/reservas/reserva_id=${id}/aprobar`, {
            method: "PUT",
            credentials: "include",
            headers: { "plataform": "web" }
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Pago aprobado!',
                text: 'El estado de la reserva fue actualizado.',
                confirmButtonColor: '#00C16E'
            });
            bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
            // Recargar reservas
            const resReservas = await fetch("/api/reservas", { credentials: "include" });
            reservasData = await resReservas.json();
            renderReservas(reservasData);
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (error) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar con el servidor.', confirmButtonColor: '#00C16E' });
    }
}
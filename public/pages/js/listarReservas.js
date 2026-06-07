let reservasData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const buscador = document.getElementById("buscador");
    const selectorEstado = document.getElementById("selector-estado");

    await cargarReservas();

    selectorEstado.addEventListener("change", () => filtrarReservas());
    buscador.addEventListener("input", () => filtrarReservas());
});

async function cargarReservas() {
    const contenedor = document.getElementById("contenedor-reservas");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;

    try {
        const res = await fetch("/admin/reservas", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!res.ok) throw new Error("Error del servidor");

        reservasData = await res.json();

        if (!reservasData || reservasData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay reservas registradas.</p>`;
            return;
        }
        renderReservas(reservasData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function filtrarReservas() {
    const query = document.getElementById("buscador").value.toLowerCase();
    const estado = document.getElementById("selector-estado").value;
    const filtradas = reservasData.filter(r => {
        const matchNombre = `${r.cliente_nombre} ${r.cliente_apellido}`.toLowerCase().includes(query) ||
            r.cancha.toLowerCase().includes(query);
        const matchEstado = estado === "" || r.estado_cobro === estado;
        return matchNombre && matchEstado;
    });
    renderReservas(filtradas);
}

function badgeEstado(estado) {
    const colores = {
        'Pendiente': '#f59e0b',
        'Pagado': '#00C16E',
        'Cancelado': '#ef4444'
    };
    const color = colores[estado] || '#6c757d';
    return `<span class="badge" style="background-color:${color};">${estado}</span>`;
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
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${r.cliente_nombre} ${r.cliente_apellido}</p>
                    ${badgeEstado(r.estado_cobro)}
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-futbol me-1" style="color:#00C16E"></i> ${r.cancha} &nbsp;·&nbsp;
                    <i class="fa-solid fa-calendar me-1" style="color:#00C16E"></i> ${r.fecha} ${r.hora_inicio}-${r.hora_fin}
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
        <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${r.cliente_nombre} ${r.cliente_apellido}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${r.cliente_email}</span></div>
        <div class="info-row"><span class="info-label">Cancha</span><span class="info-value">${r.cancha}</span></div>
        <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${r.fecha}</span></div>
        <div class="info-row"><span class="info-label">Horario</span><span class="info-value">${r.hora_inicio} - ${r.hora_fin}</span></div>
        <div class="info-row"><span class="info-label">Monto</span><span class="info-value">$${r.monto}</span></div>
        <div class="info-row"><span class="info-label">Metodo de pago</span><span class="info-value">${r.metodo_pago}</span></div>
        <div class="info-row"><span class="info-label">Estado</span><span class="info-value">${badgeEstado(r.estado_cobro)}</span></div>
        <div class="d-flex gap-2 mt-3">
            <button onclick="abrirModificarReserva(${r.id})"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                <i class="fa-solid fa-pen me-1"></i> Modificar
            </button>
            <button onclick="confirmarEliminarReserva(${r.id})"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                <i class="fa-solid fa-trash me-1"></i> Cancelar
            </button>
        </div>
        ${r.estado_cobro === 'Pendiente' ? `
        <button onclick="confirmarPago(${r.id_cobro})" class="btn w-100 btn-sm fw-bold text-white mt-2" style="background-color:#00C16E;">
            <i class="fa-solid fa-check me-1"></i> Confirmar Pago
        </button>` : ''}
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
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha</label>
                <input id="swal-fecha" type="date" class="swal2-input">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Hora inicio</label>
                <select id="swal-hora-inicio" class="swal2-input">
                    ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']
                        .map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Hora fin</label>
                <select id="swal-hora-fin" class="swal2-input">
                    ${['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00']
                        .map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const fecha = document.getElementById('swal-fecha').value;
            const hora_inicio = document.getElementById('swal-hora-inicio').value;
            const hora_fin = document.getElementById('swal-hora-fin').value;
            if (!fecha) { Swal.showValidationMessage('La fecha es obligatoria'); return false; }
            return { fecha, hora_inicio, hora_fin };
        }
    });

    if (!formValues) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/reservas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Reserva modificada.', confirmButtonColor: '#00C16E' });
            await cargarReservas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminarReserva(id) {
    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Cancelar reserva?',
        text: 'Se eliminara la reserva y su cobro asociado.',
        confirmButtonText: 'Si, cancelar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Volver',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/reservas/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Reserva cancelada.', confirmButtonColor: '#00C16E' });
            await cargarReservas();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al cancelar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarPago(id_cobro) {
    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'question',
        title: 'Confirmar pago?',
        text: 'Se marcara la reserva como pagada.',
        confirmButtonText: 'Si, confirmar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/cobros/${id_cobro}/confirmar`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Pago confirmado.', confirmButtonColor: '#00C16E' });
            await cargarReservas();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al confirmar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
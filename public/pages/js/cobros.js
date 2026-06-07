let cobrosData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await cargarCobros();

    document.getElementById("buscador").addEventListener("input", () => filtrarCobros());
    document.getElementById("selector-estado").addEventListener("change", () => filtrarCobros());
});

async function cargarCobros() {
    const contenedor = document.getElementById("contenedor-cobros");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;
    try {
        const res = await fetch("/admin/cobros", { credentials: "include", headers: { "x-user-id": userId } });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!res.ok) throw new Error("Error del servidor");

        cobrosData = await res.json();
        if (!cobrosData || cobrosData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay cobros registrados.</p>`;
            return;
        }
        renderCobros(cobrosData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function filtrarCobros() {
    const query = document.getElementById("buscador").value.toLowerCase();
    const estado = document.getElementById("selector-estado").value;
    const filtrados = cobrosData.filter(c => {
        const matchCliente = c.cliente.toLowerCase().includes(query);
        const matchEstado = estado === "" || c.estado_cobro === estado;
        return matchCliente && matchEstado;
    });
    renderCobros(filtrados);
}

function badgeEstado(estado) {
    const colores = { 'Pendiente': '#f59e0b', 'Pagado': '#00C16E', 'Cancelado': '#ef4444' };
    return `<span class="badge" style="background-color:${colores[estado] || '#6c757d'};">${estado}</span>`;
}

function renderCobros(cobros) {
    const contenedor = document.getElementById("contenedor-cobros");
    if (cobros.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron cobros.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    cobros.forEach(c => {
        const div = document.createElement("div");
        div.className = "cobro-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(c.id);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${c.cliente}</p>
                    ${badgeEstado(c.estado_cobro)}
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-dollar-sign me-1" style="color:#00C16E"></i> $${parseFloat(c.monto).toFixed(2)} &nbsp;·&nbsp;
                    <i class="fa-solid fa-calendar me-1" style="color:#00C16E"></i> ${c.fecha} &nbsp;·&nbsp;
                    <i class="fa-solid fa-credit-card me-1" style="color:#00C16E"></i> ${c.metodo_pago}
                </p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

async function verDetalle(id) {
    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/cobros/${id}`, { credentials: "include", headers: { "x-user-id": userId } });
        const c = await res.json();

        document.getElementById("modal-titulo").textContent = `Cobro #${c.id}`;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${c.cliente}</span></div>
            <div class="info-row"><span class="info-label">Monto</span><span class="info-value">$${parseFloat(c.monto).toFixed(2)}</span></div>
            <div class="info-row"><span class="info-label">Detalles</span><span class="info-value">${c.detalles || '-'}</span></div>
            <div class="info-row"><span class="info-label">Metodo de pago</span><span class="info-value">${c.metodo_pago}</span></div>
            <div class="info-row"><span class="info-label">Estado</span><span class="info-value">${badgeEstado(c.estado_cobro)}</span></div>
            <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${c.fecha}</span></div>
            ${c.estado_cobro === 'Pendiente' ? `
            <button onclick="confirmarPago(${c.id})" class="btn w-100 btn-sm fw-bold text-white mt-3" style="background-color:#00C16E;">
                <i class="fa-solid fa-check me-1"></i> Confirmar Pago
            </button>` : ''}
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalCobro"));
        modal.show();
    } catch (e) { console.error(e); }
}

async function abrirRegistrar() {
    const userId = localStorage.getItem("userId");
    const res = await fetch("/admin/clientes", { credentials: "include", headers: { "x-user-id": userId } });
    const clientes = await res.json();
    const clienteOptions = clientes.map(c => `<option value="${c.id_usuario}">${c.nombre} ${c.apellido}</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Nuevo Cobro',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Cliente</label>
                <select id="swal-cliente" class="swal2-input">${clienteOptions}</select>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Monto ($)</label>
                <input id="swal-monto" type="number" step="0.01" class="swal2-input" placeholder="Ej: 1500">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Detalles</label>
                <input id="swal-detalles" class="swal2-input" placeholder="Ej: Inscripcion liga">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Metodo de pago</label>
                <select id="swal-metodo" class="swal2-input">
                    <option value="1">Efectivo</option>
                    <option value="2">Transferencia</option>
                    <option value="3">Tarjeta</option>
                </select>
            </div>
        `,
        confirmButtonText: 'Registrar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const monto = parseFloat(document.getElementById('swal-monto').value);
            if (!monto || monto <= 0) {
                Swal.showValidationMessage('El monto debe ser mayor a 0');
                return false;
            }
            return {
                idCliente: parseInt(document.getElementById('swal-cliente').value),
                monto,
                detalles: document.getElementById('swal-detalles').value,
                idMetodoPago: parseInt(document.getElementById('swal-metodo').value)
            };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch("/admin/cobros", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            credentials: "include",
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Cobro registrado.', confirmButtonColor: '#00C16E' });
            await cargarCobros();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarPago(id) {
    bootstrap.Modal.getInstance(document.getElementById("modalCobro")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'question',
        title: 'Confirmar pago?',
        text: 'Se marcara el cobro como pagado.',
        confirmButtonText: 'Si, confirmar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/cobros/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify({ id_estado_cobro: 2 })
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Pago confirmado.', confirmButtonColor: '#00C16E' });
            await cargarCobros();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al confirmar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
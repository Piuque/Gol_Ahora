let descuentosData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await cargarDescuentos();
    document.getElementById("buscador").addEventListener("input", () => {
        const query = document.getElementById("buscador").value.toLowerCase();
        const filtrados = descuentosData.filter(d => d.descripcion.toLowerCase().includes(query));
        renderDescuentos(filtrados);
    });
});

async function cargarDescuentos() {
    const contenedor = document.getElementById("contenedor-descuentos");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;
    try {
        const res = await fetch("/admin/descuentos", { credentials: "include", headers: { "x-user-id": userId } });
        descuentosData = await res.json();
        if (!descuentosData || descuentosData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay descuentos registrados.</p>`;
            return;
        }
        renderDescuentos(descuentosData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function renderDescuentos(descuentos) {
    const contenedor = document.getElementById("contenedor-descuentos");
    if (descuentos.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron descuentos.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    descuentos.forEach(d => {
        const div = document.createElement("div");
        div.className = "descuento-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(d);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${d.descripcion}</p>
                    <span class="badge" style="background-color:${d.activo ? '#00C16E' : '#ef4444'};">
                        ${d.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-tag me-1" style="color:#00C16E"></i> ${d.porcentaje_descuento}% de descuento
                </p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

function verDetalle(d) {
    document.getElementById("modal-titulo").textContent = d.descripcion;
    document.getElementById("modal-info").innerHTML = `
        <div class="info-row"><span class="info-label">Descripcion</span><span class="info-value">${d.descripcion}</span></div>
        <div class="info-row"><span class="info-label">Descuento</span><span class="info-value">${d.porcentaje_descuento}%</span></div>
        <div class="info-row"><span class="info-label">Estado</span><span class="info-value">
            <span class="badge" style="background-color:${d.activo ? '#00C16E' : '#ef4444'};">${d.activo ? 'Activo' : 'Inactivo'}</span>
        </span></div>
        <div class="d-flex gap-2 mt-3">
            <button onclick="abrirModificar(${d.id}, '${d.descripcion}', ${d.porcentaje_descuento}, ${d.activo})"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#0d6efd;">
                <i class="fa-solid fa-pen me-1"></i> Modificar
            </button>
            <button onclick="confirmarEliminar(${d.id}, '${d.descripcion}')"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#ef4444;">
                <i class="fa-solid fa-trash me-1"></i> Eliminar
            </button>
        </div>
        <button onclick="toggleActivo(${d.id}, ${!d.activo})" class="btn w-100 btn-sm fw-bold text-white mt-2"
            style="background-color:${d.activo ? '#f59e0b' : '#00C16E'};">
            ${d.activo ? 'Desactivar descuento' : 'Activar descuento'}
        </button>
    `;
    const modal = new bootstrap.Modal(document.getElementById("modalDescuento"));
    modal.show();
}

async function abrirRegistrar() {
    const { value: formValues } = await Swal.fire({
        title: 'Nuevo Descuento',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Descripcion</label>
                <input id="swal-desc" class="swal2-input" placeholder="Ej: Descuento socios">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Porcentaje (%)</label>
                <input id="swal-porc" type="number" min="1" max="100" class="swal2-input" placeholder="Ej: 10">
            </div>
        `,
        confirmButtonText: 'Crear',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const descripcion = document.getElementById('swal-desc').value;
            const porcentaje = parseInt(document.getElementById('swal-porc').value);
            if (!descripcion || !porcentaje) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }
            if (porcentaje < 1 || porcentaje > 100) {
                Swal.showValidationMessage('El porcentaje debe ser entre 1 y 100');
                return false;
            }
            return { descripcion, porcentaje_descuento: porcentaje, activo: true };
        }
    });

    if (!formValues) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch("/admin/descuentos", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            credentials: "include",
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Descuento creado.', confirmButtonColor: '#00C16E' });
            await cargarDescuentos();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function abrirModificar(id, descripcion, porcentaje, activo) {
    bootstrap.Modal.getInstance(document.getElementById("modalDescuento")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Descuento',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Descripcion</label>
                <input id="swal-desc" class="swal2-input" value="${descripcion}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Porcentaje (%)</label>
                <input id="swal-porc" type="number" min="1" max="100" class="swal2-input" value="${porcentaje}">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            descripcion: document.getElementById('swal-desc').value,
            porcentaje_descuento: parseInt(document.getElementById('swal-porc').value),
            activo
        })
    });

    if (!formValues) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/descuentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Descuento modificado.', confirmButtonColor: '#00C16E' });
            await cargarDescuentos();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function toggleActivo(id, nuevoEstado) {
    bootstrap.Modal.getInstance(document.getElementById("modalDescuento")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = localStorage.getItem("userId");
    const descuento = descuentosData.find(d => d.id === id);
    try {
        const res = await fetch(`/admin/descuentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify({ ...descuento, activo: nuevoEstado })
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: `Descuento ${nuevoEstado ? 'activado' : 'desactivado'}.`, confirmButtonColor: '#00C16E' });
            await cargarDescuentos();
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, descripcion) {
    bootstrap.Modal.getInstance(document.getElementById("modalDescuento")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar descuento?',
        html: `Se eliminara <b>${descripcion}</b>.`,
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/descuentos/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Descuento eliminado.', confirmButtonColor: '#00C16E' });
            await cargarDescuentos();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
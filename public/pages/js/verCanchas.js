let canchasData = [];
let canchaDetalleActual = null;

document.addEventListener("DOMContentLoaded", async () => {
    const buscador = document.getElementById("buscador");
    const selectorTipo = document.getElementById("selector-tipo");

    await cargarCanchas();

    selectorTipo.addEventListener("change", () => {
        buscador.value = "";
        filtrarCanchas();
    });

    buscador.addEventListener("input", () => filtrarCanchas());
});

async function cargarCanchas() {
    const contenedor = document.getElementById("contenedor-canchas");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;

    try {
        const res = await fetch("/admin/canchas/listar", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!res.ok) throw new Error("Error del servidor");

        canchasData = await res.json();

        if (!canchasData || canchasData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay canchas registradas.</p>`;
            return;
        }

        await cargarFiltroTipos();
        renderCanchas(canchasData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

async function cargarFiltroTipos() {
    const userId = localStorage.getItem("userId");
    const selector = document.getElementById("selector-tipo");
    try {
        const res = await fetch("/admin/tipos-cancha", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        const tipos = await res.json();
        selector.innerHTML = `<option value="">Todos los tipos</option>`;
        tipos.forEach(t => {
            selector.innerHTML += `<option value="${t.id}">${t.tipo_cancha}</option>`;
        });
    } catch (e) {}
}

function filtrarCanchas() {
    const query = document.getElementById("buscador").value.toLowerCase();
    const tipoId = document.getElementById("selector-tipo").value;
    const filtradas = canchasData.filter(c => {
        const matchNombre = c.nombre.toLowerCase().includes(query);
        const matchTipo = tipoId === "" || String(c.id_tipo_de_cancha) === tipoId;
        return matchNombre && matchTipo;
    });
    renderCanchas(filtradas);
}

function renderCanchas(canchas) {
    const contenedor = document.getElementById("contenedor-canchas");
    if (canchas.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron canchas.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    canchas.forEach(c => {
        const div = document.createElement("div");
        div.className = "cancha-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(c.id);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${c.nombre}</p>
                    <span class="badge" style="background-color:#00C16E; font-size:0.75rem;">${c.categoria || '-'}</span>
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-dollar-sign me-1" style="color:#00C16E"></i> $${c.precio}/hora &nbsp;·&nbsp;
                    <i class="fa-solid fa-clock me-1" style="color:#00C16E"></i> ${c.tiempo_cancelacion} min cancelacion
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
        const res = await fetch(`/admin/canchas/${id}`, {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        const c = await res.json();
        canchaDetalleActual = c;

        document.getElementById("modal-nombre").textContent = c.nombre;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Tipo</span><span class="info-value">${c.tipo_cancha || '-'}</span></div>
            <div class="info-row"><span class="info-label">Precio/hora</span><span class="info-value">$${c.precio_hora_reserva}</span></div>
            <div class="info-row"><span class="info-label">Cancelacion</span><span class="info-value">${c.tiempo_cancelacion} min de anticipacion</span></div>
            <div class="d-flex flex-wrap gap-2 mt-3">
                <button onclick="abrirBloqueoCancha(canchaDetalleActual)"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #f59e0b;">
                    <i class="fa-solid fa-screwdriver-wrench me-1"></i> Bloquear
                </button>
                <button onclick="abrirModificar(${c.id}, '${c.nombre.replace(/'/g, "\\'")}', ${c.precio_hora_reserva}, ${c.tiempo_cancelacion})"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                    <i class="fa-solid fa-pen me-1"></i> Modificar
                </button>
                <button onclick="confirmarEliminar(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                    <i class="fa-solid fa-trash me-1"></i> Eliminar
                </button>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalCancha"));
        modal.show();
    } catch (e) { console.error(e); }
}

async function abrirModificar(id, nombre, precio, tiempo_cancelacion) {
    bootstrap.Modal.getInstance(document.getElementById("modalCancha")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Cancha',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre de la cancha</label>
                <input id="swal-nombre" class="swal2-input" value="${nombre}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Precio por hora ($)</label>
                <input id="swal-precio" type="number" step="0.01" class="swal2-input" value="${precio}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Tiempo de cancelacion (minutos)</label>
                <input id="swal-cancelacion" type="number" class="swal2-input" value="${tiempo_cancelacion}">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            nombre: document.getElementById('swal-nombre').value,
            precio_hora_reserva: parseFloat(document.getElementById('swal-precio').value),
            tiempo_cancelacion: parseInt(document.getElementById('swal-cancelacion').value)
        })
    });

    if (!formValues) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/canchas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Cancha modificada.', confirmButtonColor: '#00C16E' });
            await cargarCanchas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, nombre) {
    bootstrap.Modal.getInstance(document.getElementById("modalCancha")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar cancha?',
        html: `Se eliminara <b>${nombre}</b> con todas sus reservas.`,
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/canchas/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Cancha eliminada.', confirmButtonColor: '#00C16E' });
            await cargarCanchas();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
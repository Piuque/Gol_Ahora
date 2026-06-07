let tiposData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedor-tipos");
    const buscador = document.getElementById("buscador");

    await cargarTipos();

    buscador.addEventListener("input", () => {
        const query = buscador.value.toLowerCase();
        const filtrados = tiposData.filter(t =>
            t.tipo_cancha.toLowerCase().includes(query)
        );
        renderTipos(filtrados);
    });
});

async function cargarTipos() {
    const contenedor = document.getElementById("contenedor-tipos");
    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch("/admin/tipos-cancha", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        tiposData = await res.json();
        if (!tiposData || tiposData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay tipos de cancha registrados.</p>`;
            return;
        }
        renderTipos(tiposData);
    } catch (error) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function renderTipos(tipos) {
    const contenedor = document.getElementById("contenedor-tipos");
    if (tipos.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron tipos de cancha.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    tipos.forEach(t => {
        const div = document.createElement("div");
        div.className = "tipo-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(t);
        div.innerHTML = `
            <div class="flex-grow-1">
                <p class="text-white fw-bold mb-0">${t.tipo_cancha}</p>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-users me-1" style="color:#00C16E"></i> ${t.capacidad} jugadores &nbsp;·&nbsp;
                    <i class="fa-solid fa-clock me-1" style="color:#00C16E"></i> ${t.duracion_min} - ${t.duracion_max} min
                </p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

function verDetalle(t) {
    document.getElementById("modal-titulo").textContent = t.tipo_cancha;
    document.getElementById("modal-info").innerHTML = `
        <div class="info-row"><span class="info-label">Tipo</span><span class="info-value">${t.tipo_cancha}</span></div>
        <div class="info-row"><span class="info-label">Capacidad</span><span class="info-value">${t.capacidad} jugadores</span></div>
        <div class="info-row"><span class="info-label">Duracion min</span><span class="info-value">${t.duracion_min} min</span></div>
        <div class="info-row"><span class="info-label">Duracion max</span><span class="info-value">${t.duracion_max} min</span></div>
        <div class="info-row"><span class="info-label">Medidas</span><span class="info-value">${t.largo}m x ${t.ancho}m</span></div>
        <div class="d-flex gap-2 mt-3">
            <button onclick="abrirModificar(${t.id}, '${t.tipo_cancha}', ${t.duracion_min}, ${t.duracion_max}, ${t.capacidad})"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                <i class="fa-solid fa-pen me-1"></i> Modificar
            </button>
            <button onclick="confirmarEliminar(${t.id}, '${t.tipo_cancha}')"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                <i class="fa-solid fa-trash me-1"></i> Eliminar
            </button>
        </div>
    `;
    const modal = new bootstrap.Modal(document.getElementById("modalTipo"));
    modal.show();
}

async function abrirModificar(id, tipo_cancha, duracion_min, duracion_max, capacidad) {
    bootstrap.Modal.getInstance(document.getElementById("modalTipo")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Tipo de Cancha',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Tipo de cancha</label>
                <input id="swal-tipo" class="swal2-input" value="${tipo_cancha}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Duracion minima (minutos)</label>
                <input id="swal-duracion-min" type="number" class="swal2-input" value="${duracion_min}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Duracion maxima (minutos)</label>
                <input id="swal-duracion-max" type="number" class="swal2-input" value="${duracion_max}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Capacidad maxima (jugadores)</label>
                <input id="swal-capacidad" type="number" class="swal2-input" value="${capacidad}">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            tipo_cancha: document.getElementById('swal-tipo').value,
            duracion_min: parseInt(document.getElementById('swal-duracion-min').value),
            duracion_max: parseInt(document.getElementById('swal-duracion-max').value),
            capacidad: parseInt(document.getElementById('swal-capacidad').value)
        })
    });

    if (!formValues) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/tipos-cancha/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Tipo de cancha modificado.', confirmButtonColor: '#00C16E' });
            await cargarTipos();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, nombre) {
    bootstrap.Modal.getInstance(document.getElementById("modalTipo")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar tipo de cancha?',
        html: `Se eliminara <b>${nombre}</b> con todas sus canchas y reservas asociadas.`,
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/tipos-cancha/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Tipo de cancha eliminado.', confirmButtonColor: '#00C16E' });
            await cargarTipos();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedor-canchas");

    try {
        const res = await fetch("/api/canchas", { credentials: "include" });
        const canchas = await res.json();

        console.log("Canchas:", canchas);

        if (!canchas || canchas.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay canchas registradas.</p>`;
            return;
        }

        contenedor.innerHTML = "";

        canchas.forEach(c => {
            const col = document.createElement("div");
            col.className = "col-md-4 col-sm-6";
            col.innerHTML = `
                <div class="cancha-card p-0" onclick="verDetalle(${c.id})">
                    <img src="${c.imagen_url}" alt="${c.nombre}" class="cancha-img"
                         onerror="this.src='/img/canchas/cancha.png'">
                    <div class="p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="text-white fw-bold mb-0">${c.nombre}</h6>
                            <span class="badge-tipo">${c.tipo_cancha}</span>
                        </div>
                        <p class="text-light-50 small mb-1">
                            <i class="fa-solid fa-dollar-sign me-1" style="color:#00C16E"></i> $${c.precio_hora_reserva}/hora
                        </p>
                        <p class="text-light-50 small mb-0">
                            <i class="fa-solid fa-users me-1" style="color:#00C16E"></i> ${c.capacidad} jugadores
                        </p>
                    </div>
                </div>
            `;
            contenedor.appendChild(col);
        });

    } catch (error) {
        console.error("Error:", error);
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar las canchas.</p>`;
    }
});

async function verDetalle(id) {
    try {
        const res = await fetch(`/api/canchas/cancha_id=${id}`, { credentials: "include" });
        const c = await res.json();

        document.getElementById("modal-nombre").textContent = c.nombre;
        document.getElementById("modal-img").src = c.imagen_url || '/img/canchas/cancha.png';
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Tipo</span><span class="info-value">${c.tipo_cancha}</span></div>
            <div class="info-row"><span class="info-label">Superficie</span><span class="info-value">${c.superficie.tipo}</span></div>
            <div class="info-row"><span class="info-label">Medidas</span><span class="info-value">${c.largo}m x ${c.ancho}m</span></div>
            <div class="info-row"><span class="info-label">Capacidad</span><span class="info-value">${c.capacidad} jugadores</span></div>
            <div class="info-row"><span class="info-label">Precio/hora</span><span class="info-value">$${c.precio_hora_reserva}</span></div>
            <div class="info-row"><span class="info-label">Duracion turno</span><span class="info-value">${c.duracion_min} - ${c.duracion_max} min</span></div>
            <div class="info-row"><span class="info-label">Cancelacion</span><span class="info-value">${c.tiempo_cancelacion} min de anticipacion</span></div>
            <div class="info-row"><span class="info-label">Club</span><span class="info-value">${c.club.nombre}</span></div>
            <div class="d-flex gap-2 mt-3">
                <button onclick="abrirModificarCancha(${c.id}, '${c.nombre}', ${c.precio_hora_reserva}, ${c.tiempo_cancelacion})"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                    <i class="fa-solid fa-pen me-1"></i> Modificar
                </button>
                <button onclick="confirmarEliminarCancha(${c.id}, '${c.nombre}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                    <i class="fa-solid fa-trash me-1"></i> Eliminar
                </button>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalCancha"));
        modal.show();

    } catch (error) {
        console.error(error);
    }
}

async function abrirModificarCancha(id, nombre, precio, tiempo_cancelacion) {
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

    try {
        const res = await fetch(`/api/canchas/cancha_id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Cancha modificada correctamente.', confirmButtonColor: '#00C16E' });
            await recargarCanchas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminarCancha(id, nombre) {
    bootstrap.Modal.getInstance(document.getElementById("modalCancha")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar cancha?',
        html: `Se eliminara <b>${nombre}</b> con todas sus reservas asociadas.`,
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/api/canchas/cancha_id=${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'plataform': 'web' }
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Cancha eliminada correctamente.', confirmButtonColor: '#00C16E' });
            await recargarCanchas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function recargarCanchas() {
    const res = await fetch("/api/canchas", { credentials: "include" });
    const canchas = await res.json();
    const contenedor = document.getElementById("contenedor-canchas");
    contenedor.innerHTML = "";
    canchas.forEach(c => {
        const col = document.createElement("div");
        col.className = "col-md-4 col-sm-6";
        col.innerHTML = `
            <div class="cancha-card p-0" onclick="verDetalle(${c.id})">
                <img src="${c.imagen_url}" alt="${c.nombre}" class="cancha-img"
                     onerror="this.style.display='none'">
                <div class="p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="text-white fw-bold mb-0">${c.nombre}</h6>
                        <span class="badge-tipo">${c.tipo_cancha}</span>
                    </div>
                    <p class="text-light-50 small mb-1">
                        <i class="fa-solid fa-dollar-sign me-1" style="color:#00C16E"></i> $${c.precio_hora_reserva}/hora
                    </p>
                    <p class="text-light-50 small mb-0">
                        <i class="fa-solid fa-users me-1" style="color:#00C16E"></i> ${c.capacidad} jugadores
                    </p>
                </div>
            </div>
        `;
        contenedor.appendChild(col);
    });
}
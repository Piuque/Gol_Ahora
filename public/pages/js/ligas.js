let ligasData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await cargarLigas();
    document.getElementById("buscador").addEventListener("input", () => {
        const query = document.getElementById("buscador").value.toLowerCase();
        const filtradas = ligasData.filter(l => l.nombre.toLowerCase().includes(query));
        renderLigas(filtradas);
    });
});

async function cargarLigas() {
    const contenedor = document.getElementById("contenedor-ligas");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;
    try {
        const res = await fetch("/admin/ligas", { credentials: "include", headers: { "x-user-id": userId } });
        if (res.status === 401 || res.status === 403) { window.location.href = '/acceder'; return; }
        if (!res.ok) throw new Error("Error del servidor");
        ligasData = await res.json();
        if (!ligasData || ligasData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay ligas registradas.</p>`;
            return;
        }
        renderLigas(ligasData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function renderLigas(ligas) {
    const contenedor = document.getElementById("contenedor-ligas");
    if (ligas.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron ligas.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    ligas.forEach(l => {
        const colorEstado = l.estado === 'En curso' ? '#00C16E' : l.estado === 'Finalizado' ? '#6c757d' : '#f59e0b';
        const div = document.createElement("div");
        div.className = "liga-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(l.id);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${l.nombre}</p>
                    <span class="badge" style="background-color:${colorEstado};">${l.estado || 'Programado'}</span>
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-calendar me-1" style="color:#00C16E"></i> ${l.fecha_inicio} → ${l.fecha_fin} &nbsp;·&nbsp;
                    <i class="fa-solid fa-user me-1" style="color:#00C16E"></i> ${l.tutor || 'Sin tutor'}
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
        const res = await fetch(`/admin/ligas/${id}`, { credentials: "include", headers: { "x-user-id": userId } });
        const l = await res.json();

        const equiposHTML = l.equipos && l.equipos.length > 0 ? l.equipos.map(e => `
            <div class="d-flex justify-content-between align-items-center py-1" style="border-bottom: 1px solid rgba(255,255,255,0.07);">
                <span class="text-white small"><i class="fa-solid fa-shield-halved me-2" style="color:#00C16E"></i>${e.nombre}</span>
                <button onclick="eliminarEquipoLiga(${e.id_equipo}, ${l.id})" class="btn btn-sm text-white py-0" style="background-color:#ef4444; font-size:0.75rem;">
                    <i class="fa-solid fa-x"></i>
                </button>
            </div>
        `).join('') : `<p class="text-light-50 small">Sin equipos inscriptos.</p>`;

        const partidosHTML = l.partidos && l.partidos.length > 0 ? l.partidos.map(p => `
            <div class="partido-item">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="text-white">${p.equipo_local} vs ${p.equipo_visitante}</span>
                    ${p.goles_local !== null ?
                        `<span class="badge" style="background-color:#00C16E;">${p.goles_local} - ${p.goles_visitante}</span>` :
                        `<button onclick="registrarResultado(${p.id}, 'liga', ${l.id})" class="btn btn-sm text-white py-0" style="background-color:#0d6efd; font-size:0.75rem;">
                            Cargar resultado
                        </button>`
                    }
                </div>
                <p class="text-light-50 small mb-0">${p.fecha || 'Fecha por confirmar'}</p>
            </div>
        `).join('') : `<p class="text-light-50 small">Sin partidos generados.</p>`;

        document.getElementById("modal-titulo").textContent = l.nombre;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Estado</span><span class="info-value">${l.estado || '-'}</span></div>
            <div class="info-row"><span class="info-label">Inicio</span><span class="info-value">${l.fecha_inicio}</span></div>
            <div class="info-row"><span class="info-label">Fin</span><span class="info-value">${l.fecha_fin}</span></div>
            <div class="info-row"><span class="info-label">Tutor</span><span class="info-value">${l.tutor || '-'}</span></div>
            <div class="d-flex gap-2 mt-3">
                <button onclick="abrirModificar(${l.id}, '${l.nombre}', '${l.fecha_inicio}', '${l.fecha_fin}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#0d6efd;">
                    <i class="fa-solid fa-pen me-1"></i> Modificar
                </button>
                <button onclick="confirmarEliminar(${l.id}, '${l.nombre}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#ef4444;">
                    <i class="fa-solid fa-trash me-1"></i> Eliminar
                </button>
            </div>
            <div class="d-flex gap-2 mt-2">
                <button onclick="inscribirEquipo(${l.id})" class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#6c757d;">
                    <i class="fa-solid fa-user-plus me-1"></i> Inscribir Equipo
                </button>
                <button onclick="generarFixture(${l.id})" class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#f59e0b;">
                    <i class="fa-solid fa-list-ol me-1"></i> Generar Fixture
                </button>
            </div>
            <p class="text-light-50 small mt-3 mb-1">Equipos inscriptos</p>
            ${equiposHTML}
            <p class="text-light-50 small mt-3 mb-2">Partidos</p>
            ${partidosHTML}
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalLiga"));
        modal.show();
    } catch (e) { console.error(e); }
}

async function abrirRegistrar() {
    const userId = localStorage.getItem("userId");

    const [resProfesores, resEntrenadores] = await Promise.all([
        fetch("/admin/profesores", { credentials: "include", headers: { "x-user-id": userId } }),
        fetch("/admin/entrenadores", { credentials: "include", headers: { "x-user-id": userId } })
    ]);
    const profesores = await resProfesores.json();
    const entrenadores = await resEntrenadores.json();

    const profesionalOptions = [
        ...profesores.map(p => `<option value="${p.id}">[Profesor] ${p.nombre} ${p.apellido}</option>`),
        ...entrenadores.map(e => `<option value="${e.id}">[Entrenador] ${e.nombre} ${e.apellido}</option>`)
    ].join('');

    const { value: formValues } = await Swal.fire({
        title: 'Nueva Liga',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre</label>
                <input id="swal-nombre" class="swal2-input" placeholder="Ej: Liga Primavera 2026">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha inicio</label>
                <input id="swal-inicio" type="date" class="swal2-input">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha fin</label>
                <input id="swal-fin" type="date" class="swal2-input">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Tutor</label>
                <select id="swal-tutor" class="swal2-input">
                    <option value="">Sin tutor</option>
                    ${profesionalOptions}
                </select>
            </div>
        `,
        confirmButtonText: 'Crear Liga',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const nombre = document.getElementById('swal-nombre').value;
            const fecha_inicio = document.getElementById('swal-inicio').value;
            const fecha_fin = document.getElementById('swal-fin').value;
            if (!nombre || !fecha_inicio || !fecha_fin) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }
            return { nombre, fecha_inicio, fecha_fin, id_usuario_tutor: document.getElementById('swal-tutor').value || null };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch("/admin/ligas", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            credentials: "include",
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Liga creada.', confirmButtonColor: '#00C16E' });
            await cargarLigas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function abrirModificar(id, nombre, fecha_inicio, fecha_fin) {
    bootstrap.Modal.getInstance(document.getElementById("modalLiga")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Liga',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre</label>
                <input id="swal-nombre" class="swal2-input" value="${nombre}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha inicio</label>
                <input id="swal-inicio" type="date" class="swal2-input" value="${fecha_inicio}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha fin</label>
                <input id="swal-fin" type="date" class="swal2-input" value="${fecha_fin}">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            nombre: document.getElementById('swal-nombre').value,
            fecha_inicio: document.getElementById('swal-inicio').value,
            fecha_fin: document.getElementById('swal-fin').value
        })
    });

    if (!formValues) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/ligas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Liga modificada.', confirmButtonColor: '#00C16E' });
            await cargarLigas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, nombre) {
    bootstrap.Modal.getInstance(document.getElementById("modalLiga")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar liga?',
        html: `Se eliminara <b>${nombre}</b> con todos sus partidos.`,
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/ligas/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Liga eliminada.', confirmButtonColor: '#00C16E' });
            await cargarLigas();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function inscribirEquipo(id_liga) {
    bootstrap.Modal.getInstance(document.getElementById("modalLiga")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = localStorage.getItem("userId");

    const { value: formValues } = await Swal.fire({
        title: 'Inscribir Equipo',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre del equipo</label>
                <input id="swal-equipo" class="swal2-input" placeholder="Ej: Los Leones">
            </div>
        `,
        confirmButtonText: 'Inscribir',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const nombre = document.getElementById('swal-equipo').value;
            if (!nombre) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
            return { nombre };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(`/admin/ligas/${id_liga}/inscripciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Equipo inscripto.', confirmButtonColor: '#00C16E' });
            verDetalle(id_liga);
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function generarFixture(id_liga) {
    const userId = localStorage.getItem("userId");
    const confirm = await Swal.fire({
        icon: 'question',
        title: 'Generar Fixture?',
        text: 'Se generaran los partidos automaticamente con los equipos inscriptos.',
        confirmButtonText: 'Si, generar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/admin/ligas/${id_liga}/fixture`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: data.message, confirmButtonColor: '#00C16E' });
            verDetalle(id_liga);
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function registrarResultado(id_partido, tipo, id_competencia) {
    const userId = localStorage.getItem("userId");
    const { value: formValues } = await Swal.fire({
        title: 'Registrar Resultado',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Goles local</label>
                <input id="swal-local" type="number" min="0" class="swal2-input" value="0">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Goles visitante</label>
                <input id="swal-visitante" type="number" min="0" class="swal2-input" value="0">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            goles_local: parseInt(document.getElementById('swal-local').value),
            goles_visitante: parseInt(document.getElementById('swal-visitante').value)
        })
    });

    if (!formValues) return;

    try {
        const url = tipo === 'liga'
            ? `/admin/ligas/${id_competencia}/partidos/${id_partido}/resultado`
            : `/admin/torneos/${id_competencia}/partidos/${id_partido}/resultado`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Resultado registrado.', confirmButtonColor: '#00C16E' });
            if (tipo === 'liga' && id_competencia) verDetalle(id_competencia);
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function eliminarEquipoLiga(id_equipo, id_liga) {
    const userId = localStorage.getItem("userId");
    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar equipo?',
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/admin/ligas/${id_liga}/equipos/${id_equipo}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Equipo eliminado.', confirmButtonColor: '#00C16E' });
            verDetalle(id_liga);
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
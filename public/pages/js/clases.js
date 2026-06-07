let clasesData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await cargarClases();

    document.getElementById("buscador").addEventListener("input", () => {
        const query = document.getElementById("buscador").value.toLowerCase();
        const filtradas = clasesData.filter(c =>
            c.nombre.toLowerCase().includes(query) ||
            (c.cancha && c.cancha.toLowerCase().includes(query))
        );
        renderClases(filtradas);
    });
});

async function cargarClases() {
    const contenedor = document.getElementById("contenedor-clases");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;

    try {
        const res = await fetch("/admin/clases", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!res.ok) throw new Error("Error del servidor");

        clasesData = await res.json();

        if (!clasesData || clasesData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay clases programadas.</p>`;
            return;
        }
        renderClases(clasesData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function renderClases(clases) {
    const contenedor = document.getElementById("contenedor-clases");
    if (clases.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron clases.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    clases.forEach(c => {
        const div = document.createElement("div");
        div.className = "clase-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(c.id);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${c.nombre}</p>
                    <span class="badge" style="background-color:#0d6efd;">${c.inscriptos}/${c.capacidad_max} inscriptos</span>
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-user me-1" style="color:#00C16E"></i> ${c.profesor || 'Sin asignar'} &nbsp;·&nbsp;
                    <i class="fa-solid fa-futbol me-1" style="color:#00C16E"></i> ${c.cancha || '-'} &nbsp;·&nbsp;
                    <i class="fa-solid fa-calendar me-1" style="color:#00C16E"></i> ${c.fecha || '-'} ${c.hora_inicio || ''}-${c.hora_fin || ''}
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
        const res = await fetch(`/admin/clases/${id}`, {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        const c = await res.json();

        document.getElementById("modal-titulo").textContent = c.nombre;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Profesor</span><span class="info-value">${c.profesor || 'Sin asignar'}</span></div>
            <div class="info-row"><span class="info-label">Cancha</span><span class="info-value">${c.cancha || '-'}</span></div>
            <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${c.fecha || '-'}</span></div>
            <div class="info-row"><span class="info-label">Horario</span><span class="info-value">${c.hora_inicio} - ${c.hora_fin}</span></div>
            <div class="info-row"><span class="info-label">Capacidad</span><span class="info-value">${c.inscriptos}/${c.capacidad_max} inscriptos</span></div>
            <div class="d-flex gap-2 mt-3">
                <button onclick="abrirModificar(${c.id}, '${c.nombre}', ${c.capacidad_max}, ${c.id_profesional})"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#0d6efd;">
                    <i class="fa-solid fa-pen me-1"></i> Modificar
                </button>
                <button onclick="confirmarEliminar(${c.id}, '${c.nombre}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color:#ef4444;">
                    <i class="fa-solid fa-trash me-1"></i> Eliminar
                </button>
            </div>
            <button onclick="asignarAlumno(${c.id})" class="btn w-100 btn-sm fw-bold text-white mt-2" style="background-color:#00C16E;">
                <i class="fa-solid fa-user-plus me-1"></i> Asignar Alumno
            </button>
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalClase"));
        modal.show();
    } catch (e) { console.error(e); }
}

async function abrirRegistrar() {
    const userId = localStorage.getItem("userId");

    const [resProfesores, resCanchas] = await Promise.all([
        fetch("/admin/profesores", { credentials: "include", headers: { "x-user-id": userId } }),
        fetch("/admin/canchas/listar", { credentials: "include", headers: { "x-user-id": userId } })
    ]);
    const profesores = await resProfesores.json();
    const canchas = await resCanchas.json();

    const profOptions = profesores.map(p => `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
    const canchaOptions = canchas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Nueva Clase',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre de la clase</label>
                <input id="swal-nombre" class="swal2-input" placeholder="Ej: Futbol 5 Mañana">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Capacidad maxima</label>
                <input id="swal-capacidad" type="number" class="swal2-input" placeholder="Ej: 10">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Profesor</label>
                <select id="swal-profesor" class="swal2-input"><option value="">Sin asignar</option>${profOptions}</select>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Cancha</label>
                <select id="swal-cancha" class="swal2-input">${canchaOptions}</select>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha</label>
                <input id="swal-fecha" type="date" class="swal2-input">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Hora inicio</label>
                <select id="swal-hora-inicio" class="swal2-input">
                    ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
                        .map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Hora fin</label>
                <select id="swal-hora-fin" class="swal2-input">
                    ${['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']
                        .map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>
        `,
        confirmButtonText: 'Crear Clase',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const nombre = document.getElementById('swal-nombre').value;
            const capacidad_max = parseInt(document.getElementById('swal-capacidad').value);
            const fecha = document.getElementById('swal-fecha').value;
            if (!nombre || !capacidad_max || !fecha) {
                Swal.showValidationMessage('Nombre, capacidad y fecha son obligatorios');
                return false;
            }
            return {
                nombre,
                capacidad_max,
                id_profesional: document.getElementById('swal-profesor').value || null,
                id_cancha: parseInt(document.getElementById('swal-cancha').value),
                fecha,
                hora_inicio: document.getElementById('swal-hora-inicio').value,
                hora_fin: document.getElementById('swal-hora-fin').value
            };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch("/admin/clases", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            credentials: "include",
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Clase creada correctamente.', confirmButtonColor: '#00C16E' });
            await cargarClases();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function abrirModificar(id, nombre, capacidad_max, id_profesional) {
    bootstrap.Modal.getInstance(document.getElementById("modalClase")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = localStorage.getItem("userId");
    const resProfesores = await fetch("/admin/profesores", { credentials: "include", headers: { "x-user-id": userId } });
    const profesores = await resProfesores.json();
    const profOptions = profesores.map(p => `<option value="${p.id}" ${p.id === id_profesional ? 'selected' : ''}>${p.nombre} ${p.apellido}</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Clase',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre</label>
                <input id="swal-nombre" class="swal2-input" value="${nombre}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Capacidad maxima</label>
                <input id="swal-capacidad" type="number" class="swal2-input" value="${capacidad_max}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Profesor</label>
                <select id="swal-profesor" class="swal2-input"><option value="">Sin asignar</option>${profOptions}</select>
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            nombre: document.getElementById('swal-nombre').value,
            capacidad_max: parseInt(document.getElementById('swal-capacidad').value),
            id_profesional: document.getElementById('swal-profesor').value || null
        })
    });

    if (!formValues) return;

    try {
        const res = await fetch(`/admin/clases/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Clase modificada.', confirmButtonColor: '#00C16E' });
            await cargarClases();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, nombre) {
    bootstrap.Modal.getInstance(document.getElementById("modalClase")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar clase?',
        html: `Se eliminara <b>${nombre}</b> y todos sus inscriptos.`,
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/clases/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Clase eliminada.', confirmButtonColor: '#00C16E' });
            await cargarClases();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function asignarAlumno(id_clase) {
    bootstrap.Modal.getInstance(document.getElementById("modalClase")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = localStorage.getItem("userId");
    const res = await fetch("/admin/clientes", { credentials: "include", headers: { "x-user-id": userId } });
    const clientes = await res.json();
    const clienteOptions = clientes.map(c => `<option value="${c.id_usuario}">${c.nombre} ${c.apellido} - DNI: ${c.dni}</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Asignar Alumno',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Seleccionar cliente</label>
                <select id="swal-cliente" class="swal2-input">${clienteOptions}</select>
            </div>
        `,
        confirmButtonText: 'Asignar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            id_cliente: parseInt(document.getElementById('swal-cliente').value),
            id_clase
        })
    });

    if (!formValues) return;

    try {
        const res = await fetch("/admin/clases/asignacion-particular", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Alumno asignado correctamente.', confirmButtonColor: '#00C16E' });
            await cargarClases();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
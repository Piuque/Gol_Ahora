let profesionalesData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const buscador = document.getElementById("buscador");
    const selector = document.getElementById("selector-tipo");

    await cargarProfesionales();

    selector.addEventListener("change", () => {
        buscador.value = "";
        cargarProfesionales();
    });

    buscador.addEventListener("input", () => {
        const query = buscador.value.toLowerCase();
        const filtrados = profesionalesData.filter(p =>
            `${p.nombre} ${p.apellido}`.toLowerCase().includes(query) ||
            p.dni.includes(query)
        );
        renderProfesionales(filtrados);
    });
});

async function cargarProfesionales() {
    const contenedor = document.getElementById("contenedor-profesionales");
    const tipo = document.getElementById("selector-tipo").value;
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;

    try {
        const res = await fetch(`/api/${tipo}`, { credentials: "include" });
        profesionalesData = await res.json();

        if (!profesionalesData || profesionalesData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay ${tipo} registrados.</p>`;
            return;
        }
        renderProfesionales(profesionalesData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function renderProfesionales(profesionales) {
    const contenedor = document.getElementById("contenedor-profesionales");
    const tipo = document.getElementById("selector-tipo").value;

    if (profesionales.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron resultados.</p>`;
        return;
    }

    contenedor.innerHTML = "";
    profesionales.forEach(p => {
        const iniciales = `${p.nombre[0]}${p.apellido[0]}`.toUpperCase();
        const esProfesor = tipo === "profesores";
        const div = document.createElement("div");
        div.className = "profesional-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(p.id);
        div.innerHTML = `
            <div class="avatar">${iniciales}</div>
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${p.nombre} ${p.apellido}</p>
                    <span class="badge-rol ${esProfesor ? 'badge-profesor' : 'badge-entrenador'}">
                        ${esProfesor ? 'Profesor' : 'Entrenador'}
                    </span>
                </div>
                <p class="text-light-50 small mb-0">DNI: ${p.dni} · ${p.email}</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

async function verDetalle(id) {
    try {
        const [resUser, resCerts] = await Promise.all([
            fetch(`/api/users/user_id=${id}/full_info`, { credentials: "include" }),
            fetch(`/api/certificaciones/usuario_id=${id}`, { credentials: "include" })
        ]);

        const p = await resUser.json();
        const certs = await resCerts.json();

        const certHTML = certs.length > 0 ? certs.map(c => `
            <div class="cert-item">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="text-white fw-bold">Matricula: ${c.matricula}</span>
                    <button onclick="eliminarCert(${c.id})" class="btn btn-sm text-white py-0" style="background-color:#ef4444; font-size:0.75rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <p class="text-light-50 small mb-0">Vence: ${c.fecha_caducidad}</p>
                <a href="${c.link_archivo}" target="_blank" style="color:#00C16E; font-size:0.8rem;">Ver archivo</a>
            </div>
        `).join('') : `<p class="text-light-50 small">Sin certificaciones registradas.</p>`;

        document.getElementById("modal-nombre").textContent = `${p.nombre} ${p.apellido}`;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">DNI</span><span class="info-value">${p.dni}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${p.email}</span></div>
            <div class="info-row"><span class="info-label">Telefono</span><span class="info-value">${p.telefono}</span></div>
            <div class="info-row"><span class="info-label">Genero</span><span class="info-value">${p.genero}</span></div>
            <div class="info-row"><span class="info-label">Nacimiento</span><span class="info-value">${p.fecha_nacimiento}</span></div>
            <div class="info-row"><span class="info-label">Rol</span><span class="info-value">${p.user_level}</span></div>
            <p class="text-light-50 small mt-3 mb-2">Certificaciones</p>
            ${certHTML}
            <button onclick="agregarCert(${id})" class="btn w-100 btn-sm fw-bold text-white mt-2" style="background-color:#00C16E;">
                <i class="fa-solid fa-plus me-1"></i> Agregar Certificacion
            </button>
            <div class="d-flex gap-2 mt-3">
                <button onclick="abrirModificar(${id}, '${p.nombre}', '${p.apellido}', '${p.email}', '${p.telefono}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                    <i class="fa-solid fa-pen me-1"></i> Modificar
                </button>
                <button onclick="confirmarEliminar(${id}, '${p.nombre} ${p.apellido}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                    <i class="fa-solid fa-trash me-1"></i> Dar de baja
                </button>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalProfesional"));
        modal.show();

    } catch (e) { console.error(e); }
}

async function agregarCert(id_usuario) {
    bootstrap.Modal.getInstance(document.getElementById("modalProfesional")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Agregar Certificacion',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Matricula</label>
                <input id="swal-matricula" class="swal2-input" placeholder="Ej: MP-12345">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Fecha de caducidad</label>
                <input id="swal-caducidad" type="date" class="swal2-input">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Link del archivo</label>
                <input id="swal-link" class="swal2-input" placeholder="https://...">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => {
            const matricula = document.getElementById('swal-matricula').value;
            const fecha_caducidad = document.getElementById('swal-caducidad').value;
            const link_archivo = document.getElementById('swal-link').value;
            if (!matricula || !fecha_caducidad || !link_archivo) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }
            const hoy = new Date();
            if (new Date(fecha_caducidad) <= hoy) {
                Swal.showValidationMessage('La fecha de caducidad debe ser futura');
                return false;
            }
            return { matricula, fecha_caducidad, link_archivo, id_usuario };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch("/api/certificaciones/agregar", {
            method: "POST",
            headers: { "Content-Type": "application/json", "plataform": "web" },
            credentials: "include",
            body: JSON.stringify({ ...formValues, tipo_certificacion: 0 })
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Certificacion agregada.', confirmButtonColor: '#00C16E' });
            verDetalle(id_usuario);
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function eliminarCert(id) {
    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar certificacion?',
        confirmButtonText: 'Si, eliminar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });
    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/certificaciones/certificacion_id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'plataform': 'web' }
    });
    const data = await res.json();
    if (res.ok) {
        await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Certificacion eliminada.', confirmButtonColor: '#00C16E' });
        await cargarProfesionales();
    } else {
        await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
    }
}

async function abrirModificar(id, nombre, apellido, email, telefono) {
    bootstrap.Modal.getInstance(document.getElementById("modalProfesional")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const { value: formValues } = await Swal.fire({
        title: 'Modificar Profesional',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Nombre</label>
                <input id="swal-nombre" class="swal2-input" value="${nombre}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Apellido</label>
                <input id="swal-apellido" class="swal2-input" value="${apellido}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Email</label>
                <input id="swal-email" class="swal2-input" value="${email}">
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Telefono</label>
                <input id="swal-telefono" class="swal2-input" value="${telefono}">
            </div>
        `,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: () => ({
            nombre: document.getElementById('swal-nombre').value,
            apellido: document.getElementById('swal-apellido').value,
            email: document.getElementById('swal-email').value,
            telefono: document.getElementById('swal-telefono').value
        })
    });

    if (!formValues) return;

    try {
        const res = await fetch(`/api/users/user_id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Profesional modificado.', confirmButtonColor: '#00C16E' });
            await cargarProfesionales();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, nombre) {
    bootstrap.Modal.getInstance(document.getElementById("modalProfesional")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Dar de baja?',
        html: `Se eliminara a <b>${nombre}</b> y todas sus certificaciones.`,
        confirmButtonText: 'Si, dar de baja',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/api/users/user_id=${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'plataform': 'web' }
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Profesional dado de baja.', confirmButtonColor: '#00C16E' });
            await cargarProfesionales();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
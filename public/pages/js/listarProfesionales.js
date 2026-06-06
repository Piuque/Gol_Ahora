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
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;

    try {
        const res = await fetch(`/admin/${tipo}`, {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
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
        div.onclick = () => verDetalle(p.id, tipo);
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

async function verDetalle(id, tipo) {
    const userId = localStorage.getItem("userId");
    try {
        const tipoSingular = tipo === "profesores" ? "profesores" : "entrenadores";
        const [resUser, resCerts] = await Promise.all([
            fetch(`/admin/${tipoSingular}/${id}`, {
                credentials: "include",
                headers: { "x-user-id": userId }
            }),
            fetch(`/admin/certificaciones/${id}`, {
                credentials: "include",
                headers: { "x-user-id": userId }
            })
        ]);

        const p = await resUser.json();
        const certs = await resCerts.json();

        const certHTML = Array.isArray(certs) && certs.length > 0 ? certs.map(c => `
            <div class="cert-item mb-2 p-2" style="background:#071524; border-radius:8px;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-white fw-bold small">Matricula: ${c.matricula}</span>
                    <span class="badge" style="background-color:${c.validada ? '#00C16E' : '#f59e0b'};">
                        ${c.validada ? 'VALIDADA' : 'PENDIENTE DE VALIDAR'}
                    </span>
                </div>
                <p class="text-light-50 small mb-1">Vence: ${c.fecha_caducidad}</p>
                <a href="${c.link_archivo}" target="_blank" style="color:#00C16E; font-size:0.8rem;">Ver archivo</a>
                <div class="d-flex gap-2 mt-2">
                    <button onclick="cambiarValidacion(${c.id}, ${!c.validada}, ${id}, '${tipo}')"
                        class="btn btn-sm fw-bold text-white w-100"
                        style="background-color:${c.validada ? '#f59e0b' : '#00C16E'}; font-size:0.75rem;">
                        ${c.validada ? 'Marcar Pendiente' : 'Validar'}
                    </button>
                </div>
            </div>
        `).join('') : `<p class="text-light-50 small">Sin certificaciones registradas.</p>`;

        document.getElementById("modal-nombre").textContent = `${p.nombre} ${p.apellido}`;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">DNI</span><span class="info-value">${p.dni || '-'}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${p.email || '-'}</span></div>
            <div class="info-row"><span class="info-label">Telefono</span><span class="info-value">${p.telefono || '-'}</span></div>
            <div class="info-row"><span class="info-label">Nacimiento</span><span class="info-value">${p.fecha_nacimiento || '-'}</span></div>
            <div class="info-row"><span class="info-label">Rol</span><span class="info-value">${p.user_level || '-'}</span></div>
            <p class="text-light-50 small mt-3 mb-2">Certificaciones</p>
            ${certHTML}
            <div class="d-flex gap-2 mt-3">
                <button onclick="abrirModificar(${id}, '${p.nombre}', '${p.apellido}', '${p.email}', '${p.telefono}', '${tipo}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                    <i class="fa-solid fa-pen me-1"></i> Modificar
                </button>
                <button onclick="confirmarEliminar(${id}, '${p.nombre} ${p.apellido}', '${tipo}')"
                    class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                    <i class="fa-solid fa-trash me-1"></i> Dar de baja
                </button>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalProfesional"));
        modal.show();

    } catch (e) { console.error(e); }
}

async function cambiarValidacion(idCert, validada, idUsuario, tipo) {
    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/certificaciones/${idCert}/validar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify({ validada })
        });
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById("modalProfesional")).hide();
            await new Promise(resolve => setTimeout(resolve, 300));
            verDetalle(idUsuario, tipo);
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al actualizar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function abrirModificar(id, nombre, apellido, email, telefono, tipo) {
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

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/${tipo}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify(formValues)
        });
        const data = await res.json();
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Profesional modificado.', confirmButtonColor: '#00C16E' });
            await cargarProfesionales();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarEliminar(id, nombre, tipo) {
    bootstrap.Modal.getInstance(document.getElementById("modalProfesional")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Dar de baja?',
        html: `Se eliminara a <b>${nombre}</b>.`,
        confirmButtonText: 'Si, dar de baja',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/${tipo}/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Profesional dado de baja.', confirmButtonColor: '#00C16E' });
            await cargarProfesionales();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al eliminar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}
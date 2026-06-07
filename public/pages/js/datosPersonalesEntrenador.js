/* ==========================================================================
   GOL AHORA — datosPersonalesEntrenador.js
   Rutas reales del backend:
     GET    /entrenador/info
     GET    /entrenador/entrenamientos
     GET    /entrenador/entrenamientos/{id}/alumnos
     DELETE /entrenador/entrenamientos/{id_entrenamiento}/alumnos/{id_alumno}
   ========================================================================== */

const API = window.location.origin;

/* -----------------------------------------------------------------------
   INIT
----------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    ConsultarNombreSesion();
    ActivarMenuToggle();
    AsignarListenersFormularios();

    const path = window.location.pathname.split("/").pop();

    if (path === "interfazEntrenador.html" || path === "") {
        ConsultarDashboardOperativo();
    } else if (path === "certificacionesEntrenador.html") {
        ConsultarCertificacionesLegajo();
    } else if (path === "perfilEntrenador.html") {
        ConsultarPerfilFicha();
        const formModalPerfil = document.getElementById('form-modal-perfil');
        if (formModalPerfil) {
            formModalPerfil.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    telefono: document.getElementById('perfil-input-telefono')?.value.trim(),
                    email:    document.getElementById('perfil-input-email')?.value.trim()
                };
                try {
                    const res = await fetch(`${API}/entrenador/modificarPerfil`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        bootstrap.Modal.getInstance(document.getElementById('modalModificarPerfil'))?.hide();
                        _setText('disp-telefono', payload.telefono || '—');
                        _setText('disp-email',    payload.email    || '—');
                        _setText('card-resumen-correo', payload.email || '');
                        _perfilCache.telefono = payload.telefono;
                        _perfilCache.email    = payload.email;
                        Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Datos actualizados', text: 'Tu teléfono y correo fueron guardados correctamente.', confirmButtonColor: '#00C16E' });
                    } else throw new Error();
                } catch {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los cambios.', confirmButtonColor: '#00C16E' });
                }
            });
        }
    }
});

/* -----------------------------------------------------------------------
   SIDEBAR TOGGLE
----------------------------------------------------------------------- */
function ActivarMenuToggle() {
    const btn     = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');
    if (btn && wrapper) btn.addEventListener('click', () => wrapper.classList.toggle('toggled'));
}

/* -----------------------------------------------------------------------
   NOMBRE DE SESIÓN  →  GET /entrenador/info
----------------------------------------------------------------------- */
async function ConsultarNombreSesion() {
    try {
        const res = await fetch(`${API}/entrenador/info`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        const d = await res.json();

        const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        _setText('top-navbar-user-name',  completo);
        _setText('sidebar-user-fullname', completo);
        _setText('card-resumen-nombre',   completo);
        _setText('card-resumen-username', d.username ? `@${d.username}` : '');
        _setText('card-resumen-correo',   d.email    || '');
    } catch {
        _setText('top-navbar-user-name',  'Entrenador');
        _setText('sidebar-user-fullname', 'Entrenador');
    }
}

/* -----------------------------------------------------------------------
   DASHBOARD  →  GET /entrenador/entrenamientos
   JSON array: [{ id_entrenamiento, nombre, capacidad_max, cancha_nombre,
                  nivel, hora_inicio, hora_fin, fecha_turno, inscriptos }]
----------------------------------------------------------------------- */
async function ConsultarDashboardOperativo() {
    try {
        const res = await fetch(`${API}/entrenador/entrenamientos`, { method: "GET", credentials: "include" });
        if (res.ok) InyectarTablaEntrenamientos(await res.json());
        else        InyectarTablaEntrenamientos([]);
        InyectarTablaAlumnos([]);
    } catch {
        InyectarTablaEntrenamientos([]);
        InyectarTablaAlumnos([]);
    }
}

/* — Tabla Entrenamientos — */
function InyectarTablaEntrenamientos(lista) {
    const tbody = document.getElementById('tabla-entrenamientos-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4" style="color:var(--text-light-50)">
            <i class="fa-solid fa-dumbbell fa-lg me-2"></i>No posee entrenamientos en su agenda.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(e => {
        const horario = `${e.hora_inicio || ''} – ${e.hora_fin || ''}`;
        const fecha   = e.fecha_turno ? `<br><small class="text-light-50">${e.fecha_turno}</small>` : '';
        const nivel   = e.nivel ? `<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2 ms-1">${e.nivel}</span>` : '';

        return `<tr>
            <td class="fw-semibold text-white">
                <i class="fa-solid fa-dumbbell text-sports me-2"></i>${e.nombre}${nivel}
            </td>
            <td class="text-light-75">${horario}${fecha}</td>
            <td class="text-light-75">${e.cancha_nombre || '—'}</td>
            <td class="text-light-75">Capacidad: ${e.capacidad_max || '—'}</td>
            <td><span class="badge bg-success bg-opacity-10 border border-success border-opacity-25 text-success px-2">${e.inscriptos || 0} inscriptos</span></td>
            <td class="text-center">
                <button class="btn btn-xs btn-outline-success border-sports text-sports"
                    onclick="ConsultarAlumnosPorEntrenamiento('${e.id_entrenamiento}', \`${_esc(e.nombre)}\`)">
                    <i class="fa-solid fa-users me-1"></i>Ver alumnos
                </button>
            </td>
        </tr>`;
    }).join('');
}

/* -----------------------------------------------------------------------
   ALUMNOS POR ENTRENAMIENTO  →  GET /entrenador/entrenamientos/{id}/alumnos
   JSON array: [{ id_usuario, nombre, apellido, dni, telefono, asistencia }]
----------------------------------------------------------------------- */
window.ConsultarAlumnosPorEntrenamiento = async function(idEntrenamiento, nombreEntrenamiento) {
    const titulo = document.getElementById('titulo-tabla-alumnos');
    if (titulo) titulo.textContent = `Alumnos — ${nombreEntrenamiento}`;

    const tbody = document.getElementById('tabla-alumnos-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3" style="color:var(--text-light-50);">
        <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
        Cargando alumnos del entrenamiento...
    </td></tr>`;

    try {
        const res = await fetch(`${API}/entrenador/entrenamientos/${idEntrenamiento}/alumnos`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        InyectarTablaAlumnos(await res.json(), idEntrenamiento);
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3" style="color:var(--text-light-50);">
            <i class="fa-solid fa-triangle-exclamation me-2 text-warning"></i>No se pudieron cargar los alumnos.</td></tr>`;
    }
};

/* — Tabla Alumnos — */
function InyectarTablaAlumnos(lista, idEntrenamiento) {
    const tbody = document.getElementById('tabla-alumnos-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color:var(--text-light-50)">
            <i class="fa-solid fa-users fa-lg me-2"></i>No hay alumnos inscriptos en este entrenamiento.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const asistenciaBadge = a.asistencia
            ? `<span class="badge px-2" style="background:rgba(0,193,110,0.1);border:1px solid rgba(0,193,110,0.3);color:#00C16E;">${a.asistencia}</span>`
            : `<span class="badge px-2" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);">—</span>`;

        return `<tr>
            <td class="fw-semibold">
                <div class="d-flex align-items-center gap-2">
                    <div class="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center fw-bold"
                        style="width:30px;height:30px;font-size:0.7rem;flex-shrink:0;">
                        ${_initials(a.nombre, a.apellido)}
                    </div>
                    <span class="text-white">${a.nombre} ${a.apellido}</span>
                </div>
            </td>
            <td class="text-light-50 small">${a.dni || '—'}</td>
            <td class="text-light-75">${a.telefono || '—'}</td>
            <td>${asistenciaBadge}</td>
            <td class="text-center">
                <button class="btn btn-xs btn-outline-danger font-xs"
                    onclick="ProcesarBajaAlumno('${idEntrenamiento}', '${a.id_usuario}', '${_esc(a.nombre)} ${_esc(a.apellido)}')">
                    <i class="fa-solid fa-user-minus me-1"></i>Dar Baja
                </button>
            </td>
        </tr>`;
    }).join('');
}

/* -----------------------------------------------------------------------
   BAJA DE ALUMNO  →  DELETE /entrenador/entrenamientos/{id_entrenamiento}/alumnos/{id_alumno}
----------------------------------------------------------------------- */
window.ProcesarBajaAlumno = function(idEntrenamiento, idAlumno, nombre) {
    Swal.fire({
        title: '¿Dar de baja?',
        html: `Se dará de baja a <strong>${nombre}</strong> de este entrenamiento.`,
        icon: 'warning', iconColor: '#f25c54',
        showCancelButton: true,
        confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, dar de baja', cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API}/entrenador/entrenamientos/${idEntrenamiento}/alumnos/${idAlumno}`, {
                method: "DELETE",
                credentials: "include"
            });
            if (res.ok) {
                Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Baja registrada', text: `${nombre} fue removido del entrenamiento.`, confirmButtonColor: '#00C16E' });
                ConsultarAlumnosPorEntrenamiento(idEntrenamiento, '');
            } else throw new Error();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la baja.', confirmButtonColor: '#00C16E' });
        }
    });
};

/* -----------------------------------------------------------------------
   CERTIFICACIONES
----------------------------------------------------------------------- */
async function ConsultarCertificacionesLegajo() {
    const container = document.getElementById('contenedor-certificaciones-cards');
    if (!container) return;

    container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">
        <div class="spinner-border text-success" role="status"></div>
        <p class="mt-3 small">Cargando certificaciones...</p>
    </div>`;

    try {
        const res = await fetch(`${API}/entrenador/certificaciones`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        renderizarCardsCertificadosHTML(await res.json());
    } catch {
        container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">
            <i class="fa-solid fa-graduation-cap fa-3x mb-3 d-block" style="color:var(--sports-green);opacity:0.3;"></i>
            <p class="small">No posee certificados cargados en su legajo.<br>
            <span style="color:var(--text-light-50)">Usá el botón <strong>Agregar Certificación</strong> para iniciar.</span></p>
        </div>`;
    }
}

function renderizarCardsCertificadosHTML(lista) {
    const container = document.getElementById('contenedor-certificaciones-cards');
    if (!container) return;

    if (!lista || lista.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">
            <i class="fa-solid fa-graduation-cap fa-3x mb-3 d-block" style="color:var(--sports-green);opacity:0.3;"></i>
            <p class="small">No posee certificados cargados en su legajo.</p>
        </div>`;
        return;
    }

    container.innerHTML = lista.map(c => `
        <div class="col-md-6 col-xl-4">
            <div class="card card-sport h-100 p-3 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                        <h6 class="fw-bold text-white mb-0" style="flex:1;min-width:0;word-break:break-word;">${c.nombre}</h6>
                        <span style="display:inline-block;flex-shrink:0;max-width:140px;background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.25);border-radius:4px;padding:3px 8px;font-size:0.7rem;color:#ffc107;text-align:right;line-height:1.4;">Pendiente de evaluación</span>
                    </div>
                    <p class="small text-light-75 mb-1">
                        <i class="fa-solid fa-building-columns text-sports me-1"></i>${c.institucion}
                    </p>
                    <small style="color:var(--text-light-50)">
                        <i class="fa-regular fa-calendar me-1"></i>Emisión: ${c.fecha_emision}
                    </small>
                </div>
                ${c.archivo_url ? `
                    <div class="mt-3">
                        <a href="${c.archivo_url}" target="_blank"
                            class="btn btn-xs btn-outline-success border-sports text-sports w-100">
                            <i class="fa-solid fa-file-pdf me-1"></i>Ver adjunto
                        </a>
                    </div>` : ''}
            </div>
        </div>`).join('');
}

async function ProcesarAltaCertificacionConAdjunto() {
    const nom  = document.getElementById('cert-nombre')?.value.trim();
    const ins  = document.getElementById('cert-institucion')?.value.trim();
    const fec  = document.getElementById('cert-fecha')?.value;
    const file = document.getElementById('cert-archivo');

    if (!nom || !ins || !fec || !file?.files[0]) {
        Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completá todos los campos y adjuntá el comprobante.', confirmButtonColor: '#00C16E' });
        return;
    }

    const formData = new FormData();
    formData.append('nombre',        nom);
    formData.append('institucion',   ins);
    formData.append('fecha_emision', fec);
    formData.append('archivo',       file.files[0]);

    try {
        const res = await fetch(`${API}/entrenador/certificaciones/alta`, {
            method: "POST", credentials: "include", body: formData
        });
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalAltaCertificacion'))?.hide();
            Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Certificación enviada', text: 'Quedará pendiente de evaluación por el administrador.', confirmButtonColor: '#00C16E' });
            document.getElementById('form-alta-certificacion').reset();
            ConsultarCertificacionesLegajo();
        } else throw new Error();
    } catch {
        Swal.fire({ icon: 'error', title: 'Error al subir', text: 'No se pudo cargar el archivo. Intentá más tarde.', confirmButtonColor: '#00C16E' });
    }
}

/* -----------------------------------------------------------------------
   PERFIL  →  GET /entrenador/info
----------------------------------------------------------------------- */
let _perfilCache = {};

async function ConsultarPerfilFicha() {
    try {
        const res = await fetch(`${API}/entrenador/info`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        const d = await res.json();
        _perfilCache = d;

        _setText('disp-nombre',       d.nombre       || '—');
        _setText('disp-apellido',     d.apellido     || '—');
        _setText('disp-dni',          d.dni          || '—');
        _setText('disp-nacionalidad', d.nacionalidad || '—');
        _setText('disp-genero',       d.genero       || '—');
        _setText('disp-telefono',     d.telefono     || '—');
        _setText('disp-email',        d.email        || '—');

        const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        _setText('card-resumen-nombre',       completo);
        _setText('card-resumen-username',     d.username     ? `@${d.username}` : '');
        _setText('card-resumen-correo',       d.email        || '');
        _setText('card-resumen-especialidad', d.especialidad || '—');
        _setText('card-resumen-estado',       d.estado       || 'Activo');

    } catch {
        console.warn("No se pudo cargar el perfil del entrenador.");
    }
}

window.AbrirModalModificarPerfil = function() {
    const telInput  = document.getElementById('perfil-input-telefono');
    const mailInput = document.getElementById('perfil-input-email');
    if (telInput)  telInput.value  = _perfilCache.telefono || '';
    if (mailInput) mailInput.value = _perfilCache.email    || '';

    const el = document.getElementById('modalModificarPerfil');
    let inst = bootstrap.Modal.getInstance(el);
    if (!inst) inst = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
    inst.show();
};

/* -----------------------------------------------------------------------
   SOLICITAR BAJA DE PERFIL
----------------------------------------------------------------------- */
window.solicitarBajaPerfil = function() {
    Swal.fire({
        title: '¿Solicitar baja del perfil?',
        html: 'Esta acción iniciará el proceso de desvinculación de sus comisiones de entrenamiento. Requiere validación del administrador.',
        icon: 'warning', iconColor: '#f25c54',
        showCancelButton: true,
        confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, solicitar baja', cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API}/entrenador/baja`, { method: "POST", credentials: "include" });
            if (res.ok) Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Solicitud registrada', text: 'Quedará pendiente de validación.', confirmButtonColor: '#00C16E' });
            else throw new Error();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la solicitud.', confirmButtonColor: '#00C16E' });
        }
    });
};

/* -----------------------------------------------------------------------
   CERRAR SESIÓN
----------------------------------------------------------------------- */
window.CerrarSesion = function() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Serás redirigido al inicio de la aplicación.',
        icon: 'question', iconColor: '#00C16E',
        showCancelButton: true,
        confirmButtonColor: '#00C16E', cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-right-from-bracket me-1"></i>Sí, cerrar sesión',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try { await fetch(`${API}/logout`, { method: "POST", credentials: "include" }); } catch {}
        window.location.href = "index.html";
    });
};

/* -----------------------------------------------------------------------
   LISTENERS
----------------------------------------------------------------------- */
function AsignarListenersFormularios() {
    const formCert = document.getElementById("form-alta-certificacion");
    if (formCert) formCert.addEventListener("submit", (e) => { e.preventDefault(); ProcesarAltaCertificacionConAdjunto(); });
}

/* -----------------------------------------------------------------------
   HELPERS
----------------------------------------------------------------------- */
function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function _initials(nombre, apellido) {
    return `${(nombre||'')[0]||''}${(apellido||'')[0]||''}`.toUpperCase();
}

function _esc(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
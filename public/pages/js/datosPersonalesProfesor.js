/* ==========================================================================
   GOL AHORA — datosPersonalesProfesor.js
   Rutas reales del backend:
     GET    /profesor/info
     GET    /profesor/clases
     GET    /profesor/clases/{id}/alumnos
     DELETE /profesor/clases/{id_clase}/alumnos/{id_alumno}
   ========================================================================== */

const API = window.location.origin;

/* -----------------------------------------------------------------------
   INIT
----------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    ConsultarNombreSesion();
    ActivarMenuToggle();
    AsignarListenersFormularios();

    const segmentos = window.location.pathname.split("/").filter(Boolean);
    const path = segmentos[segmentos.length - 1] || "";

    if (path === "certificaciones" || path === "certificacionesProfesor.html") {
        ConsultarCertificacionesLegajo();
    } else if (path === "perfil" || path === "perfilProfesor.html") {
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
                    const res = await fetch(`${API}/profesor/modificarPerfil`, {
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
    if (typeof activarMenuToggleTecnico === 'function') activarMenuToggleTecnico();
}

/* -----------------------------------------------------------------------
   NOMBRE DE SESIÓN  →  GET /profesor/info
   JSON: { nombre, apellido, username, email, ... }
----------------------------------------------------------------------- */
async function ConsultarNombreSesion() {
    try {
        const res = await fetch(`${API}/profesor/info`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        const d = await res.json();

        const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        if (typeof renderizarSidebarTecnico === 'function') renderizarSidebarTecnico(d);
        _setText('card-resumen-nombre',   completo);
        _setText('card-resumen-username', d.username ? `@${d.username}` : '');
        _setText('card-resumen-correo',   d.email    || '');
    } catch {
        if (typeof renderizarSidebarTecnico === 'function') {
            renderizarSidebarTecnico({ nombre: 'Profesor', apellido: '' });
        }
    }
}

/* -----------------------------------------------------------------------
   CERTIFICACIONES  (certificacionesProfesor.html)
----------------------------------------------------------------------- */
async function ConsultarCertificacionesLegajo() {
    const container = document.getElementById('contenedor-certificaciones-cards');
    if (!container) return;

    container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">
        <div class="spinner-border text-success" role="status"></div>
        <p class="mt-3 small">Cargando certificaciones...</p>
    </div>`;

    try {
        const res = await fetch(`${API}/profesor/certificaciones/lista`, { method: "GET", credentials: "include" });
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

    container.innerHTML = lista.map(c => renderizarCardCertificacion(c)).join('');
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
        const res = await fetch(`${API}/profesor/certificaciones/alta`, {
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
   PERFIL  →  GET /profesor/info
   JSON: { nombre, apellido, dni, nacionalidad, genero, telefono, email,
           username, fecha_nacimiento, direccion: { localidad, provincia, ... } }
----------------------------------------------------------------------- */
let _perfilCache = {};

async function ConsultarPerfilFicha() {
    try {
        const res = await fetch(`${API}/profesor/info`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        const d = await res.json();
        _perfilCache = d;
        if (typeof renderizarSidebarTecnico === 'function') renderizarSidebarTecnico(d);

        _setText('disp-nombre',       d.nombre       || '—');
        _setText('disp-apellido',     d.apellido     || '—');
        _setText('disp-dni',          d.dni          || '—');
        _setText('disp-nacionalidad', d.nacionalidad || '—');
        _setText('disp-genero',       d.genero       || '—');
        _setText('disp-telefono',     d.telefono     || '—');
        _setText('disp-email',        d.email        || '—');

        const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        _setText('card-resumen-nombre',   completo);
        _setText('card-resumen-username', d.username ? `@${d.username}` : '');
        _setText('card-resumen-correo',   d.email    || '');
        _setText('card-resumen-especialidad', d.especialidad || '—');
        _setText('card-resumen-estado',       d.estado       || 'Activo');

    } catch {
        console.warn("No se pudo cargar el perfil del profesor.");
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
        html: 'Esta acción iniciará el proceso de desvinculación de sus comisiones de enseñanza. Requiere validación del administrador.',
        icon: 'warning', iconColor: '#f25c54',
        showCancelButton: true,
        confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, solicitar baja', cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API}/profesor/baja`, { method: "POST", credentials: "include" });
            if (res.ok) Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Solicitud registrada', text: 'Quedará pendiente de validación.', confirmButtonColor: '#00C16E' });
            else throw new Error();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la solicitud.', confirmButtonColor: '#00C16E' });
        }
    });
};

/* -----------------------------------------------------------------------
   LISTENERS DE FORMULARIOS
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
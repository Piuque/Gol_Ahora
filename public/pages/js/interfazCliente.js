/* ==========================================================================
   GOL AHORA — interfazCliente.js
   ========================================================================== */

const API = window.location.origin;

let datosPerfilGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionYPerfil();

    // Evento del botón hamburguesa para pantallas móviles o colapsar
    const menuToggle = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');
    if (menuToggle && wrapper) {
        menuToggle.addEventListener('click', () => {
            wrapper.classList.toggle('toggled');
        });
    }
});

/* -----------------------------------------------------------------------
   CARGA INICIAL — GET /api/cliente/perfil
----------------------------------------------------------------------- */
async function verificarSesionYPerfil() {
    try {
        const response = await fetch(`${API}/api/cliente/perfil`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            cerrarSesion();
            return;
        }

        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        datosPerfilGlobal = await response.json();
        renderizarSidebar(datosPerfilGlobal);

    } catch (error) {
        console.error('Fallo al cargar el panel:', error);

        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No pudimos cargar tu información. Verificá tu conexión o contactá al soporte.',
            confirmButtonColor: '#00C16E',
            allowOutsideClick: false
        });

        document.getElementById('nav-welcome').innerHTML =
            `<i class="fa-solid fa-triangle-exclamation text-danger me-2"></i>Servicio no disponible`;
        document.querySelector('.id-nombre-completo').textContent = 'Usuario no encontrado';
    }
}

/* -----------------------------------------------------------------------
   RENDERIZADO EN SIDEBAR
----------------------------------------------------------------------- */
function renderizarSidebar(datos) {
    const fechaActual = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });
    document.getElementById('nav-welcome').innerHTML =
        `<i class="fa-regular fa-calendar text-sports me-2"></i>${fechaActual}`;

    document.querySelector('.id-nombre-completo').textContent =
        `${datos.nombre} ${datos.apellido}`;

    document.querySelector('.input-Dni').textContent       = datos.dni       || 'No registrado';
    document.querySelector('.input-Email').textContent     = datos.email     || 'No registrado';
    document.querySelector('.input-Telefono').textContent  = datos.telefono  || 'No registrado';
    document.querySelector('.input-Genero').textContent    = datos.genero    || 'No definido';
    document.querySelector('.input-Nacionalidad').textContent = datos.nacionalidad || 'No definida';

    if (datos.fecha_nacimiento) {
        document.querySelector('.input-Fecha').textContent = datos.fecha_nacimiento.split('T')[0];
    } else {
        document.querySelector('.input-Fecha').textContent = 'No registrada';
    }

    // Dirección — soporta objeto anidado o campos planos
    let dir = 'No registrada';
    if (datos.calle && datos.numero) {
        dir = `${datos.calle} ${datos.numero}${datos.localidad ? ', ' + datos.localidad : ''}`;
    } else if (datos.direccion?.calle) {
        dir = `${datos.direccion.calle} ${datos.direccion.numero || ''}`;
        if (datos.direccion.localidad) dir += `, ${datos.direccion.localidad}`;
    }
    document.querySelector('.input-Direccion').textContent = dir;
}

/* -----------------------------------------------------------------------
   HELPERS DE PRESENTACIÓN
----------------------------------------------------------------------- */
function fmt(val, fallback = 'No registrado') {
    return (val && String(val).trim()) ? String(val).trim() : fallback;
}

function fmtFecha(iso) {
    if (!iso) return 'No registrada';
    return iso.split('T')[0].split('-').reverse().join('/');
}

function buildDireccion(d) {
    if (!d) return 'No registrada';
    let parts = [];
    if (d.calle)         parts.push(d.calle);
    if (d.numero)        parts.push(d.numero);
    if (d.localidad)     parts.push(d.localidad);
    if (d.provincia)     parts.push(d.provincia);
    if (d.codigo_postal) parts.push(`CP ${d.codigo_postal}`);
    return parts.length ? parts.join(', ') : 'No registrada';
}

/* -----------------------------------------------------------------------
   GESTIÓN DE CUENTA — panel principal
----------------------------------------------------------------------- */
function abrirGestionPerfil() {
    if (!datosPerfilGlobal) {
        Swal.fire({ icon: 'warning', title: 'Aviso',
            text: 'Tus datos aún no se han cargado completamente.',
            confirmButtonColor: '#00C16E' });
        return;
    }

    const d = datosPerfilGlobal;

    // Dirección — soporta objeto anidado o campos planos
    const dirObj = d.direccion || { calle: d.calle, numero: d.numero, localidad: d.localidad, provincia: d.provincia, codigo_postal: d.codigo_postal };

    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '600px',
        showConfirmButton: false,
        showCloseButton: true,
        html: `
        <div style="font-family:'Poppins',sans-serif;text-align:left;padding:4px 6px 0;">

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
                <div style="width:46px;height:46px;border-radius:50%;background:rgba(0,193,110,0.12);border:1px solid rgba(0,193,110,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid fa-user" style="color:#00C16E;font-size:1.1rem;"></i>
                </div>
                <div>
                    <div style="font-size:1.05rem;font-weight:700;color:#fff;">${fmt(d.nombre)} ${fmt(d.apellido)}</div>
                    <div style="font-size:0.7rem;color:rgba(255,255,255,0.45);margin-top:1px;">@${fmt(d.username,'—')} &nbsp;·&nbsp;
                        <span style="color:#00C16E;font-weight:600;">Activo</span>
                    </div>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:14px;">
                <div style="font-size:0.65rem;font-weight:700;color:#00C16E;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Datos Personales</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;">
                    ${_fila('DNI',              fmt(d.dni))}
                    ${_fila('Teléfono',         fmt(d.telefono))}
                    ${_fila('Email',            fmt(d.email))}
                    ${_fila('Fecha nacimiento', fmtFecha(d.fecha_nacimiento))}
                    ${_fila('Género',           fmt(d.genero, 'No definido'))}
                    ${_fila('Nacionalidad',     fmt(d.nacionalidad, 'No definida'))}
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:14px;">
                <div style="font-size:0.65rem;font-weight:700;color:#00C16E;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Domicilio</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;">
                    ${_fila('Calle y número',   [fmt(dirObj.calle,'—'), fmt(dirObj.numero,'')].filter(Boolean).join(' '))}
                    ${_fila('Localidad',        fmt(dirObj.localidad))}
                    ${_fila('Provincia',        fmt(dirObj.provincia))}
                    ${_fila('Código postal',    fmt(dirObj.codigo_postal))}
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:18px;">
                <div style="font-size:0.65rem;font-weight:700;color:#00C16E;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Cuenta</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;">
                    ${_fila('Usuario',          fmt(d.username))}
                    ${_fila('Miembro desde',    fmtFecha(d.fecha_registro))}
                </div>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="imprimirPerfil()"
                    style="flex:1;min-width:130px;padding:9px 12px;border-radius:7px;border:1px solid rgba(100,200,120,0.35);background:rgba(0,193,110,0.08);color:#00C16E;font-weight:600;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
                    <i class="fa-solid fa-file-pdf"></i> Imprimir / PDF
                </button>
                <button onclick="Swal.close(); modificarPerfil()"
                    style="flex:1;min-width:130px;padding:9px 12px;border-radius:7px;border:1px solid rgba(26,115,232,0.35);background:rgba(26,115,232,0.1);color:#6ea8fe;font-weight:600;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
                    <i class="fa-solid fa-pen-to-square"></i> Modificar datos
                </button>
                <button onclick="Swal.close(); cambiarPasswordCliente()"
                    style="flex:1;min-width:130px;padding:9px 12px;border-radius:7px;border:1px solid rgba(255,193,7,0.35);background:rgba(255,193,7,0.08);color:#ffc107;font-weight:600;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
                    <i class="fa-solid fa-key"></i> Cambiar contraseña
                </button>
                <button onclick="Swal.close(); solicitarBajaCuenta()"
                    style="flex:1;min-width:130px;padding:9px 12px;border-radius:7px;border:1px solid rgba(242,92,84,0.3);background:rgba(242,92,84,0.08);color:#f25c54;font-weight:600;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
                    <i class="fa-solid fa-user-xmark"></i> Solicitar baja
                </button>
            </div>

        </div>`
    });
}

function _fila(label, valor) {
    return `
        <div>
            <div style="font-size:0.68rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">${label}</div>
            <div style="font-size:0.85rem;color:#fff;font-weight:500;">${valor || '—'}</div>
        </div>`;
}

/* -----------------------------------------------------------------------
   IMPRIMIR / EXPORTAR PDF
----------------------------------------------------------------------- */
function imprimirPerfil() {
    const d = datosPerfilGlobal;
    const dirObj = d.direccion || { calle: d.calle, numero: d.numero, localidad: d.localidad, provincia: d.provincia, codigo_postal: d.codigo_postal };

    const ventana = window.open('', '_blank', 'width=700,height=900');
    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Ficha de Cliente — ${fmt(d.nombre)} ${fmt(d.apellido)}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; }
                .logo { font-size: 1.3rem; font-weight: 800; color: #00C16E; margin-bottom: 4px; }
                .subtitulo { font-size: 0.8rem; color: #666; margin-bottom: 28px; padding-bottom: 14px; border-bottom: 2px solid #00C16E; }
                h2 { font-size: 1rem; font-weight: 700; color: #00C16E; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; margin-top: 22px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 4px; }
                .campo label { font-size: 0.68rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
                .campo span  { font-size: 0.9rem; color: #1a1a1a; font-weight: 500; }
                .pie { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 0.72rem; color: #aaa; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="logo">⚽ Gol Ahora</div>
            <div class="subtitulo">Ficha de Cliente — generada el ${new Date().toLocaleDateString('es-AR', {day:'2-digit',month:'long',year:'numeric'})}</div>

            <h2>Datos Personales</h2>
            <div class="grid">
                <div class="campo"><label>Nombre completo</label><span>${fmt(d.nombre)} ${fmt(d.apellido)}</span></div>
                <div class="campo"><label>Usuario</label><span>@${fmt(d.username,'—')}</span></div>
                <div class="campo"><label>DNI</label><span>${fmt(d.dni)}</span></div>
                <div class="campo"><label>Teléfono</label><span>${fmt(d.telefono)}</span></div>
                <div class="campo"><label>Email</label><span>${fmt(d.email)}</span></div>
                <div class="campo"><label>Fecha de nacimiento</label><span>${fmtFecha(d.fecha_nacimiento)}</span></div>
                <div class="campo"><label>Género</label><span>${fmt(d.genero,'No definido')}</span></div>
                <div class="campo"><label>Nacionalidad</label><span>${fmt(d.nacionalidad,'No definida')}</span></div>
            </div>

            <h2>Domicilio</h2>
            <div class="grid">
                <div class="campo"><label>Calle y número</label><span>${[fmt(dirObj.calle,'—'), fmt(dirObj.numero,'')].filter(Boolean).join(' ')}</span></div>
                <div class="campo"><label>Localidad</label><span>${fmt(dirObj.localidad)}</span></div>
                <div class="campo"><label>Provincia</label><span>${fmt(dirObj.provincia)}</span></div>
                <div class="campo"><label>Código postal</label><span>${fmt(dirObj.codigo_postal)}</span></div>
            </div>

            <h2>Cuenta</h2>
            <div class="grid">
                <div class="campo"><label>Miembro desde</label><span>${fmtFecha(d.fecha_registro)}</span></div>
                <div class="campo"><label>Estado</label><span>Activo</span></div>
            </div>

            <div class="pie">Gol Ahora — documento generado automáticamente. No requiere firma.</div>
            <script>window.onload = () => { window.print(); }<\/script>
        </body>
        </html>
    `);
    ventana.document.close();
}

/* -----------------------------------------------------------------------
   MODIFICAR PERFIL — formulario inline en SweetAlert
----------------------------------------------------------------------- */
async function modificarPerfil() {
    const d = datosPerfilGlobal;
    const dirObj = d.direccion || { calle: d.calle, numero: d.numero, localidad: d.localidad, provincia: d.provincia, codigo_postal: d.codigo_postal };

    let listaGeneros = [];
    try {
        const resGeneros = await fetch(`${API}/api/generos/con-id`);
        if (resGeneros.ok) listaGeneros = await resGeneros.json();
    } catch (_) { /* sin géneros de BD */ }

    let opcionesGenerosHTML = `<option value="" disabled>Seleccione un género</option>`;
    const idActual = (d.id_genero !== null && d.id_genero !== undefined) ? parseInt(d.id_genero, 10) : -1;

    listaGeneros.forEach(g => {
        const seleccionado = (idActual === parseInt(g.id_genero, 10)) ? 'selected' : '';
        opcionesGenerosHTML += `<option value="${g.id_genero}" ${seleccionado}>${g.genero}</option>`;
    });

    const selectGeneroHTML = `
        <div>
            <label style="font-size:0.68rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Género</label>
            <select id="mod-genero" style="width:100%;background:rgba(7,21,36,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 10px;border-radius:7px;font-size:0.85rem;">
                ${opcionesGenerosHTML}
            </select>
        </div>
    `;

    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '600px',
        showConfirmButton: false,
        showCloseButton: true,
        html: `
        <div style="font-family:'Poppins',sans-serif;text-align:left;padding:4px 6px 0;">
            <h5 style="color:#00C16E;font-weight:700;margin-bottom:4px;"><i class="fa-solid fa-pen-to-square me-2"></i>Modificar Datos Personales</h5>
            <p style="font-size:0.78rem;color:rgba(255,255,255,0.45);margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);">
                Modifica tus datos de contacto. La localidad y nacionalidad deben gestionarse desde administración.
            </p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-bottom:14px;">
                ${_inputEdit('mod-nombre',     'Nombre',              d.nombre        || '')}
                ${_inputEdit('mod-apellido',   'Apellido',            d.apellido      || '')}
                ${_inputEdit('mod-username',   'Usuario',             d.username      || '')}
                ${_inputEdit('mod-email',      'Email',               d.email         || '', 'email')}
                ${_inputEdit('mod-dni',        'DNI',                 d.dni           || '', 'text', true)}
                ${_inputEdit('mod-telefono',   'Teléfono',            d.telefono      || '', 'tel')}
                ${_inputEdit('mod-nacimiento', 'Fecha de nacimiento', (d.fecha_nacimiento||'').split('T')[0], 'date')}
                ${selectGeneroHTML}
            </div>

            <div style="font-size:0.65rem;font-weight:700;color:#00C16E;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Domicilio</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-bottom:18px;">
                ${_inputEdit('mod-calle',     'Calle',         dirObj.calle          || '')}
                ${_inputEdit('mod-numero',    'Número',        dirObj.numero         || '')}
                ${_inputEdit('mod-cp',        'Código postal', dirObj.codigo_postal  || '')}
                
                ${_inputEdit('mod-localidad', 'Localidad',     dirObj.localidad      || '', 'text', true)}
                ${_inputEdit('mod-provincia', 'Provincia',     dirObj.provincia      || '', 'text', true)}
            </div>

            <div id="mod-error" style="display:none;background:rgba(242,92,84,0.1);border:1px solid rgba(242,92,84,0.3);color:#f25c54;font-size:0.8rem;padding:8px 12px;border-radius:6px;margin-bottom:10px;"></div>

            <div style="display:flex;gap:8px;">
                <button onclick="guardarModificacionPerfil()"
                    style="flex:1;padding:10px;border-radius:7px;border:none;background:#00C16E;color:#071524;font-weight:700;font-size:0.9rem;cursor:pointer;">
                    <i class="fa-solid fa-floppy-disk me-2"></i>Guardar cambios
                </button>
                <button onclick="Swal.close(); abrirGestionPerfil()"
                    style="flex:1;padding:10px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.6);font-weight:600;font-size:0.9rem;cursor:pointer;">
                    Cancelar
                </button>
            </div>
        </div>`
    });
}

function _inputEdit(id, label, value, type = 'text', readonly = false) {
    const roStyle = readonly ? 'opacity:0.4;cursor:not-allowed;' : '';
    const roAttr  = readonly ? 'readonly' : '';
    return `
        <div>
            <label for="${id}" style="font-size:0.68rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">${label}</label>
            <input id="${id}" type="${type}" value="${value}" ${roAttr}
                style="width:100%;background:rgba(7,21,36,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 10px;border-radius:7px;font-size:0.85rem;${roStyle}"
                onfocus="if(!this.readOnly)this.style.borderColor='#00C16E'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
        </div>`;
}

async function guardarModificacionPerfil() {
    const errorEl = document.getElementById('mod-error');
    errorEl.style.display = 'none'; // Limpiamos errores previos

    const selectElement = document.getElementById('mod-genero');
    let idGeneroAEnviar = null;

    // Validación estricta del campo Género
    if (selectElement && selectElement.value !== "") {
        idGeneroAEnviar = parseInt(selectElement.value, 10);
    }

    if (idGeneroAEnviar === null || isNaN(idGeneroAEnviar)) {
        errorEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-2"></i>Por favor, selecciona un género válido de la lista.';
        errorEl.style.display = 'block';
        return;
    }

    const payload = {
        username:         document.getElementById('mod-username')?.value.trim(),
        nombre:           document.getElementById('mod-nombre')?.value.trim(),
        apellido:         document.getElementById('mod-apellido')?.value.trim(),
        email:            document.getElementById('mod-email')?.value.trim(),
        fecha_nacimiento: document.getElementById('mod-nacimiento')?.value || null,
        dni:              datosPerfilGlobal.dni,
        telefono:         document.getElementById('mod-telefono')?.value.trim(),
        id_genero:        idGeneroAEnviar,
        id_nacionalidad:  datosPerfilGlobal.id_nacionalidad || null,
        calle:            document.getElementById('mod-calle')?.value.trim(),
        numero:           document.getElementById('mod-numero')?.value.trim(),
        codigo_postal:    document.getElementById('mod-cp')?.value.trim(),
        id_localidad:     datosPerfilGlobal.id_localidad || null
    };

    if (!payload.nombre || !payload.apellido || !payload.email) {
        errorEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-2"></i>Nombre, apellido y email son obligatorios.';
        errorEl.style.display = 'block';
        return;
    }

    const btn = document.querySelector('[onclick="guardarModificacionPerfil()"]');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:0.7;">Guardando...</span>';

    try {
        const res = await fetch(`${API}/api/cliente/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Error ${res.status}`);
        }

        await verificarSesionYPerfil();

        Swal.close();
        Swal.fire({ icon: 'success', iconColor: '#00C16E', title: '¡Datos actualizados!',
            text: 'Tu información personal fue guardada correctamente.',
            confirmButtonColor: '#00C16E', background: '#0A2540', color: '#fff' });

    } catch (err) {
        errorEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i>${err.message || 'No se pudo guardar. Intentá de nuevo.'}`;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

/* -----------------------------------------------------------------------
   CAMBIAR CONTRASEÑA
----------------------------------------------------------------------- */
function cambiarPasswordCliente() {
    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '480px',
        showConfirmButton: false,
        showCloseButton: true,
        html: `
        <div style="font-family:'Poppins',sans-serif;text-align:left;padding:4px 6px 0;">
            <h5 style="color:#ffc107;font-weight:700;margin-bottom:4px;"><i class="fa-solid fa-key me-2"></i>Cambiar contraseña</h5>
            <p style="font-size:0.78rem;color:rgba(255,255,255,0.45);margin-bottom:16px;">Ingresá tu contraseña actual y la nueva (mínimo 6 caracteres).</p>
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
                ${_inputEdit('pwd-actual', 'Contraseña actual', '', 'password')}
                ${_inputEdit('pwd-nueva', 'Nueva contraseña', '', 'password')}
                ${_inputEdit('pwd-confirm', 'Confirmar nueva contraseña', '', 'password')}
            </div>
            <div id="pwd-error" style="display:none;background:rgba(242,92,84,0.1);border:1px solid rgba(242,92,84,0.3);color:#f25c54;font-size:0.8rem;padding:8px 12px;border-radius:6px;margin-bottom:10px;"></div>
            <button onclick="guardarNuevaPassword()"
                style="width:100%;padding:10px;border-radius:7px;border:none;background:#ffc107;color:#071524;font-weight:700;font-size:0.9rem;cursor:pointer;">
                <i class="fa-solid fa-floppy-disk me-2"></i>Actualizar contraseña
            </button>
        </div>`
    });
}

async function guardarNuevaPassword() {
    const errorEl = document.getElementById('pwd-error');
    errorEl.style.display = 'none';

    const password_actual = document.getElementById('pwd-actual')?.value || '';
    const password_nueva = document.getElementById('pwd-nueva')?.value || '';
    const confirmar_password = document.getElementById('pwd-confirm')?.value || '';

    if (!password_actual || !password_nueva || !confirmar_password) {
        errorEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-2"></i>Completá todos los campos.';
        errorEl.style.display = 'block';
        return;
    }
    if (password_nueva.length < 6) {
        errorEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-2"></i>La nueva contraseña debe tener al menos 6 caracteres.';
        errorEl.style.display = 'block';
        return;
    }
    if (password_nueva !== confirmar_password) {
        errorEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-2"></i>Las contraseñas nuevas no coinciden.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API}/api/cliente/perfil/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', plataform: 'web' },
            credentials: 'include',
            body: JSON.stringify({ password_actual, password_nueva, confirmar_password })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        Swal.fire({
            icon: 'success', iconColor: '#00C16E', title: 'Contraseña actualizada',
            text: 'Tu contraseña fue cambiada correctamente.',
            confirmButtonColor: '#00C16E', background: '#0A2540', color: '#fff'
        });
    } catch (err) {
        errorEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i>${err.message || 'No se pudo actualizar la contraseña.'}`;
        errorEl.style.display = 'block';
    }
}

/* -----------------------------------------------------------------------
   SOLICITAR BAJA DE CUENTA
----------------------------------------------------------------------- */
function solicitarBajaCuenta() {
    Swal.fire({
        title: '¿Solicitar baja de cuenta?',
        html: `<p style="color:rgba(255,255,255,0.7);font-size:0.9rem;margin:0;">
                    Esta acción enviará una solicitud al administrador.<br>
                    <strong style="color:#f25c54;">Tu historial de turnos no se recuperará.</strong>
               </p>`,
        icon: 'warning',
        iconColor: '#f25c54',
        background: '#0A2540',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#f25c54',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, solicitar baja',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API}/api/cliente/perfil`, {
                method: 'DELETE', credentials: 'include'
            });
            if (!res.ok) throw new Error();
        } catch { /* endpoint puede no estar listo aún */ }

        await Swal.fire({
            icon: 'success', iconColor: '#00C16E', background: '#0A2540', color: '#fff',
            title: 'Solicitud enviada',
            text: 'Un administrador procesará la baja de tu cuenta a la brevedad.',
            confirmButtonColor: '#00C16E'
        });
        cerrarSesion();
    });
}

/* -----------------------------------------------------------------------
   CERRAR SESIÓN
----------------------------------------------------------------------- */
function cerrarSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Serás redirigido al inicio de la aplicación.',
        icon: 'question',
        iconColor: '#00C16E',
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor:  '#6c757d',
        confirmButtonText:  '<i class="fa-solid fa-right-from-bracket me-1"></i>Sí, cerrar sesión',
        cancelButtonText:   'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        try {
            await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
        } catch {}

        localStorage.clear();
        document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "x-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = '/acceder';
    });
}
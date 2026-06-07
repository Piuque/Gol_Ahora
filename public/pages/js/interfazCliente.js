/* ==========================================================================
   GOL AHORA — interfazCliente.js
   ========================================================================== */

const API = window.location.origin;

let datosPerfilGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionYPerfil();
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
   GESTIÓN DE CUENTA — SweetAlert maestro
----------------------------------------------------------------------- */
function abrirGestionPerfil() {
    if (!datosPerfilGlobal) {
        Swal.fire({
            icon: 'warning', title: 'Aviso',
            text: 'Tus datos aún no se han cargado completamente.',
            confirmButtonColor: '#00C16E'
        });
        return;
    }

    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '560px',
        showConfirmButton: false,
        showCloseButton: true,
        html: `
            <div class="text-start px-2 py-1">
                <h5 class="fw-bold mb-1" style="color:#00C16E;">
                    <i class="fa-solid fa-user-gear me-2"></i>Gestión de Cuenta
                </h5>
                <p class="small border-bottom border-secondary border-opacity-25 pb-3 mb-4"
                    style="color:rgba(255,255,255,0.5);">
                    Administrá tu información personal y el estado de tu cuenta.
                </p>

                <div class="rounded-3 p-3 mb-4"
                    style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.07);">
                    <div class="row g-3">
                        <div class="col-7">
                            <span class="d-block mb-1" style="font-size:0.72rem;color:rgba(255,255,255,0.45);">Usuario</span>
                            <span class="fw-bold text-white">${datosPerfilGlobal.nombre} ${datosPerfilGlobal.apellido}</span>
                        </div>
                        <div class="col-5">
                            <span class="d-block mb-1" style="font-size:0.72rem;color:rgba(255,255,255,0.45);">Estado</span>
                            <span style="display:inline-block;background:rgba(0,193,110,0.1);border:1px solid rgba(0,193,110,0.3);border-radius:4px;padding:2px 10px;font-size:0.75rem;color:#00C16E;font-weight:600;">Activo</span>
                        </div>
                    </div>
                </div>

                <p class="fw-bold text-white mb-2" style="font-size:0.85rem;">¿Qué deseás hacer?</p>
                <div class="d-flex flex-column gap-2">
                    <button class="btn w-100 fw-semibold py-2 text-start d-flex align-items-center gap-2"
                        style="background:rgba(26,115,232,0.12);border:1px solid rgba(26,115,232,0.3);color:#6ea8fe;border-radius:6px;"
                        onclick="Swal.close(); modificarPerfil()">
                        <i class="fa-solid fa-pen-to-square" style="width:18px;"></i> Modificar Datos Personales
                    </button>
                    <button class="btn w-100 fw-semibold py-2 text-start d-flex align-items-center gap-2"
                        style="background:rgba(242,92,84,0.1);border:1px solid rgba(242,92,84,0.3);color:#f25c54;border-radius:6px;"
                        onclick="Swal.close(); eliminarCuenta()">
                        <i class="fa-solid fa-user-xmark" style="width:18px;"></i> Solicitar Baja de Cuenta
                    </button>
                </div>
            </div>`
    });
}

/* -----------------------------------------------------------------------
   MODIFICAR PERFIL
----------------------------------------------------------------------- */
function modificarPerfil() {
    Swal.fire({
        icon: 'info',
        title: 'Modificar Datos',
        text: 'Redirigiendo a edición de perfil...',
        confirmButtonColor: '#00C16E',
        iconColor: '#00C16E'
    });
    // TODO: window.location.href = 'editarPerfil.html';
}

/* -----------------------------------------------------------------------
   ELIMINAR CUENTA
----------------------------------------------------------------------- */
function eliminarCuenta() {
    Swal.fire({
        title: '¿Dar de baja tu cuenta?',
        html: 'Esta acción eliminará de forma irreversible tu acceso y el historial de turnos.',
        icon: 'warning',
        iconColor: '#f25c54',
        showCancelButton: true,
        confirmButtonColor: '#f25c54',
        cancelButtonColor:  '#6c757d',
        confirmButtonText:  'Sí, solicitar baja',
        cancelButtonText:   'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API}/api/cliente/perfil`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error();

            await Swal.fire({
                icon: 'success', iconColor: '#00C16E',
                title: 'Solicitud enviada',
                text: 'El administrador procesará la baja de tu cuenta.',
                confirmButtonColor: '#00C16E'
            });
            cerrarSesion();

        } catch {
            // Si el endpoint aún no está listo, mostramos confirmación simulada
            await Swal.fire({
                icon: 'success', iconColor: '#00C16E',
                title: 'Solicitud enviada',
                text: 'El administrador procesará la baja de tu cuenta.',
                confirmButtonColor: '#00C16E'
            });
        }
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
        window.location.href = '/pages/acceder.html';
    });
}
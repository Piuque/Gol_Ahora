let datosPerfilGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionYPerfil();
});

// =========================================================
// CONEXIÓN DIRECTA Y ESTRICTA CON LA API REAL
// =========================================================
async function verificarSesionYPerfil() {
    try {
        // NOTA: Si tus compañeros usaron otro endpoint para traer los datos (ej: '/cliente/info' o '/api/usuario/perfil'), solo cambialo en esta línea.
        const response = await fetch('/api/cliente/perfil', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'plataform': 'web'
            },
            credentials: 'include'
        });

        // Si el token expiró o alguien intenta entrar directo por la URL sin loguearse
        if (response.status === 401 || response.status === 403) {
            cerrarSesion();
            return;
        }

        if (!response.ok) {
            throw new Error(`El servidor respondió con error: ${response.status}`);
        }

        // Si todo está ok, guardamos los datos reales y renderizamos
        datosPerfilGlobal = await response.json();
        renderizarSidebar(datosPerfilGlobal);

    } catch (error) {
        console.error('Fallo crítico al cargar el panel:', error);

        // SIN DATOS FALSOS: Si falla la BD, mostramos error elegante y bloqueamos el panel
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No pudimos cargar tu información desde la base de datos. Verificá tu conexión o contactá al soporte.',
            background: '#071524',
            color: '#fff',
            confirmButtonColor: '#00C16E',
            allowOutsideClick: false
        }).then(() => {
            // Opcional: Podrías redirigirlo al login si falla la carga
            // cerrarSesion();
        });

        // Dejamos la vista limpia indicando el error
        document.getElementById('nav-welcome').innerHTML = `<i class="fa-solid fa-triangle-exclamation text-danger me-2"></i>Servicio no disponible`;
        document.querySelector('.id-nombre-completo').textContent = 'Usuario no encontrado';
    }
}

// =========================================================
// RENDERIZADO EN PANTALLA (Inyección de datos reales)
// =========================================================
function renderizarSidebar(datos) {
    const fechaActual = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('nav-welcome').innerHTML = `<i class="fa-regular fa-calendar text-sports me-2"></i>${fechaActual}`;

    // Asignación de datos reales de la BD a los campos HTML
    document.querySelector('.id-nombre-completo').textContent = `${datos.nombre} ${datos.apellido}`;
    document.querySelector('.input-Dni').textContent = datos.dni || 'No registrado';
    document.querySelector('.input-Email').textContent = datos.email;
    document.querySelector('.input-Telefono').textContent = datos.telefono || 'No registrado';

    // Tratamiento seguro de la fecha de nacimiento (evitando errores si viene nula)
    if (datos.fecha_nacimiento) {
        document.querySelector('.input-Fecha').textContent = datos.fecha_nacimiento.split('T')[0];
    } else {
        document.querySelector('.input-Fecha').textContent = 'No registrada';
    }

    document.querySelector('.input-Genero').textContent = datos.genero || 'No definido';
    document.querySelector('.input-Nacionalidad').textContent = datos.nacionalidad || 'No definida';

    // Tratamiento inteligente de la dirección (soportando diferentes formatos de la BD)
    let direccionCompleta = 'No registrada en el sistema';
    if (datos.calle && datos.numero) {
        direccionCompleta = `${datos.calle} ${datos.numero}, ${datos.localidad || ''}`;
    } else if (datos.direccion && datos.direccion.calle) {
        direccionCompleta = `${datos.direccion.calle} ${datos.direccion.numero || ''}`;
    }
    document.querySelector('.input-Direccion').textContent = direccionCompleta;
}

// =========================================================
// VENTANA MAESTRA DE GESTIÓN DE CUENTA
// =========================================================
function abrirGestionPerfil() {
    if (!datosPerfilGlobal) {
        Swal.fire({
            icon: 'warning', title: 'Aviso', text: 'Tus datos aún no se han cargado completamente.',
            background: '#0A2540', color: '#fff', confirmButtonColor: '#00C16E'
        });
        return;
    }

    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '600px',
        showConfirmButton: false,
        showCloseButton: true,
        html: `
            <div class="text-start px-2">
                <h3 class="fw-bold text-sports mb-2"><i class="fa-solid fa-user-gear me-2"></i>Gestión de Cuenta</h3>
                <p class="text-light-50 small border-bottom border-secondary border-opacity-25 pb-3 mb-4">Administrá tu información personal y el estado de tu cuenta en la plataforma.</p>

                <div class="bg-dark-navy p-3 rounded-3 border border-secondary border-opacity-10 mb-4" style="background-color: rgba(0,0,0,0.15);">
                    <div class="row g-3">
                        <div class="col-6">
                            <span class="text-light-50 d-block" style="font-size: 0.75rem;">Usuario</span>
                            <span class="fw-bold">${datosPerfilGlobal.nombre} ${datosPerfilGlobal.apellido}</span>
                        </div>
                        <div class="col-6">
                            <span class="text-light-50 d-block" style="font-size: 0.75rem;">Estado de cuenta</span>
                            <span class="badge bg-success">Activo</span>
                        </div>
                    </div>
                </div>

                <p class="fw-bold text-white mb-2" style="font-size: 0.9rem;">¿Qué deseas hacer?</p>
                <div class="d-flex flex-column gap-2">
                    <button class="btn btn-outline-warning w-100 fw-bold py-2 text-start" onclick="Swal.close(); modificarPerfil()">
                        <i class="fa-solid fa-pen-to-square me-2" style="width: 20px;"></i> Modificar Datos Personales
                    </button>
                    <button class="btn btn-outline-danger w-100 fw-bold py-2 text-start" onclick="Swal.close(); eliminarCuenta()">
                        <i class="fa-solid fa-user-xmark me-2" style="width: 20px;"></i> Solicitar Baja de Cuenta
                    </button>
                </div>
            </div>
        `
    });
}

function modificarPerfil() {
    // ESTA FUNCIÓN SE DEBE ENLAZAR AL HTML/API DE MODIFICAR DATOS CUANDO LO ARMES
    Swal.fire({
        background: '#071524',
        color: '#fff',
        icon: 'info',
        title: 'Modificar Datos',
        text: 'Redirigiendo a edición de perfil...',
        confirmButtonColor: '#00C16E'
    });
}

function eliminarCuenta() {
    Swal.fire({
        title: '¿Dar de baja tu cuenta?',
        text: "Esta acción eliminará de forma irreversible tu acceso y el historial de turnos.",
        icon: 'warning',
        background: '#071524',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, solicitar baja',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {

            // LÓGICA REAL DE ELIMINACIÓN DE BD (Descomentar cuando el backend tenga la ruta lista)
            /*
            try {
                const res = await fetch('/api/cliente/perfil', { method: 'DELETE', credentials: 'include' });
                if (!res.ok) throw new Error("No se pudo eliminar");

                await Swal.fire({ icon: 'success', title: 'Cuenta eliminada', background: '#071524', color: '#fff', confirmButtonColor: '#00C16E' });
                cerrarSesion();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#071524', color: '#fff', confirmButtonColor: '#00C16E' });
            }
            */

            // Mensaje simulado hasta que el backend conecte el DELETE
            await Swal.fire({
                icon: 'success',
                title: 'Solicitud enviada',
                text: 'El administrador procesará la baja de tu cuenta.',
                background: '#071524', color: '#fff', confirmButtonColor: '#00C16E'
            });
        }
    });
}

// =========================================================
// SALIDA SEGURA
// =========================================================
function cerrarSesion() {
    localStorage.clear();
    // Vaciamos cookies por seguridad
    document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "x-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/pages/acceder.html';
}
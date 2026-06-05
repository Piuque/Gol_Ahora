document.addEventListener('DOMContentLoaded', () => {
    // Al cargar la página, vamos directo a buscar las reservas reales
    cargarReservas();
});

// ==========================================
// FUNCIÓN PARA OBTENER RESERVAS DESDE LA API
// ==========================================
async function cargarReservas() {
    const contenedor = document.getElementById('contenedor-reservas');

    try {
        // Usamos ruta relativa. Funciona mágico tanto en Localhost como en Render.
        const response = await fetch('/api/cliente/reservas', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'plataform': 'web' // Cabecera estándar de su proyecto
            },
            credentials: 'include' // Envía automáticamente las cookies de sesión (login)
        });

        // Verificación de seguridad
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html'; // Lo mandamos al login si caducó la sesión
            return;
        }

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const reservas = await response.json();
        renderizarTarjetas(reservas);

    } catch (error) {
        console.error('Error al cargar reservas:', error);

        // Mostrar mensaje de error si el backend falla o la ruta no existe
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <h5 class="text-white">Hubo un problema al cargar tus reservas</h5>
                <p class="text-light-50 small">${error.message}</p>
                <p class="text-light-50 small" style="color: #ffc107 !important;">
                    (Verificar que  la ruta GET /api/cliente/reservas exista)
                </p>
            </div>`;
    }
}

// ==========================================
// RENDERIZADO DE LAS TARJETAS EN PANTALLA
// ==========================================
function renderizarTarjetas(reservas) {
    const contenedor = document.getElementById('contenedor-reservas');
    contenedor.innerHTML = '';

    if (!reservas || reservas.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-regular fa-calendar-xmark fa-3x mb-3 opacity-50"></i>
                <p>Aún no tenés reservas registradas.</p>
                <a href="nuevaReserva.html" class="btn btn-sm btn-sports mt-2">¡Reservar ahora!</a>
            </div>`;
        return;
    }

    reservas.forEach(reserva => {
        let claseBadge = '';
        let ocultarBotones = '';

        if (reserva.estado === 'Confirmada') {
            claseBadge = 'bg-success text-white';
        } else if (reserva.estado === 'Pendiente') {
            claseBadge = 'bg-warning text-dark';
        } else if (reserva.estado === 'Cancelada' || reserva.estado === 'Finalizada') {
            claseBadge = 'bg-danger text-white';
            if(reserva.estado === 'Finalizada') claseBadge = 'bg-secondary text-white';
            ocultarBotones = 'd-none'; // Ocultamos Editar y Cancelar
        }

        const cardHTML = `
            <div class="reserva-card d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="fw-bold text-white mb-0" style="font-size: 1.1rem; line-height: 1.4;">${reserva.cancha_nombre || 'Cancha ' + reserva.id_cancha}</h5>
                </div>
                <div class="mb-3">
                    <span class="badge ${claseBadge}">${reserva.estado}</span>
                </div>
                
                <div class="mb-4 flex-grow-1">
                    <div class="text-light-75 small mb-3 d-flex align-items-center">
                        <i class="fa-solid fa-calendar-day text-sports me-3" style="font-size: 1.1rem;"></i>
                        <span style="font-size: 0.95rem;">${formatearFecha(reserva.fecha)}</span>
                    </div>
                    <div class="text-light-75 small mb-0 d-flex align-items-center">
                        <i class="fa-solid fa-clock text-sports me-3" style="font-size: 1.1rem;"></i>
                        <span style="font-size: 0.95rem;">${reserva.hora_inicio} a ${reserva.hora_fin} hs</span>
                    </div>
                </div>

                <div class="d-flex flex-column gap-2 mt-auto pt-3 border-top border-secondary">
                    <button class="btn btn-sm btn-outline-light w-100 fw-bold py-2" onclick="consultarReserva(${reserva.id_reserva})">
                        <i class="fa-solid fa-eye me-1"></i> Ver Detalles
                    </button>
                    <button class="btn btn-sm btn-outline-warning w-100 fw-bold py-2 ${ocultarBotones}" onclick="modificarReserva(${reserva.id_reserva})">
                        <i class="fa-solid fa-pen me-1"></i> Modificar Turno
                    </button>
                    <button class="btn btn-sm btn-outline-danger w-100 fw-bold py-2 ${ocultarBotones}" onclick="cancelarReserva(${reserva.id_reserva})">
                        <i class="fa-solid fa-xmark me-1"></i> Cancelar
                    </button>
                </div>
            </div>
        `;

        contenedor.innerHTML += cardHTML;
    });
}

function formatearFecha(fechaString) {
    if (!fechaString) return "Fecha no especificada";
    // Forzamos la zona horaria para evitar que reste un día
    const fechaReal = new Date(fechaString + 'T00:00:00');
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let fecha = fechaReal.toLocaleDateString('es-AR', opciones);
    return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

// ==========================================
// FUNCIONES DE LOS BOTONES
// ==========================================
async function consultarReserva(id) {
    await Swal.fire({
        background: '#071524',
        color: '#fff',
        icon: 'info',
        title: `Reserva #${id}`,
        text: 'Esta función se conectará pronto para ver cobros.',
        confirmButtonColor: '#00C16E'
    });
}

async function modificarReserva(id) {
    // Aquí podrías luego redirigir a modificarReserva.html?id=X
    await Swal.fire({
        background: '#071524',
        color: '#fff',
        icon: 'warning',
        title: 'Modificar Turno',
        text: 'La funcionalidad de modificación de horarios irá aquí.',
        confirmButtonColor: '#00C16E'
    });
}

// ==========================================
// CANCELAR RESERVA (CONECTADO A LA API REAL)
// ==========================================
async function cancelarReserva(id) {
    const result = await Swal.fire({
        title: '¿Cancelar reserva?',
        text: "Esta acción no se puede deshacer y liberarás la cancha.",
        icon: 'warning',
        background: '#071524',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Volver'
    });

    if (result.isConfirmed) {
        try {
            // Hacemos la petición DELETE a la API de tus compañeros
            const res = await fetch(`/api/cliente/reservas/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'plataform': 'web'
                },
                credentials: 'include'
            });

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Cancelada!',
                    text: 'La reserva ha sido cancelada correctamente.',
                    background: '#071524',
                    color: '#fff',
                    confirmButtonColor: '#00C16E'
                });

                // Recargamos la lista para que la tarjeta se pinte de rojo y se oculten los botones
                cargarReservas();
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "No se pudo cancelar en el servidor");
            }

        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                background: '#071524',
                color: '#fff',
                confirmButtonColor: '#00C16E'
            });
        }
    }
}
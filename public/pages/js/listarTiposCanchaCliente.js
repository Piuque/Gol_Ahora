/* ==========================================================================
   GOL AHORA — listarTiposCanchaCliente.js (CONECTADO A RENDER)
   ========================================================================== */

// Apuntamos al servidor alojado en Render
const API = "https://gol-ahora.onrender.com";

// MODO DE PRUEBA: Cambiado a false para consumir la API real.
const USAR_MOCKS = false;

const MOCKS_TIPOS_CANCHA = [
    {
        "id": 1, "tipo": "Fútbol 5 (Sintético)", "duracion_min": 60, "duracion_max": 240,
        "ancho": "20.00", "largo": "40.00", "capacidad": 10, "superficie": "Césped sintético",
        "descripcion_superficie": "Base de caucho y arena. Dureza media y buen agarre. Ideal para partidos rápidos.",
        "imagen_url": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop"
    },
    // ... (Dejo los mocks acá por si alguna vez se cae el server y necesitas probar diseño visual rápido)
];

document.addEventListener('DOMContentLoaded', () => {
    cargarTiposDeCancha();
});

async function cargarTiposDeCancha() {
    const contenedor = document.getElementById('contenedor-tipos');

    if (USAR_MOCKS) {
        setTimeout(() => {
            renderizarTarjetas(MOCKS_TIPOS_CANCHA);
        }, 500);
        return;
    }

    try {
        // Petición GET a la ruta exacta definida en clienteRoutes.js
        const response = await fetch(`${API}/api/cliente/tipos_canchas`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'plataform': 'web'
            },
            credentials: 'include' // Fundamental para que pasen las cookies de sesión
        });

        // Si la sesión expiró o no tiene permisos, lo mandamos al login
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const tipos = await response.json();
        renderizarTarjetas(tipos);

    } catch (error) {
        console.error('Error al cargar tipos de cancha desde la API:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <h5 class="text-white">Problemas de conexión</h5>
                <p class="text-light-50 small">No pudimos conectar con el servidor para cargar las modalidades. Intentá nuevamente.</p>
                <button onclick="cargarTiposDeCancha()" class="btn btn-outline-danger mt-3 btn-sm">Reintentar</button>
            </div>`;
    }
}

function renderizarTarjetas(tipos) {
    const contenedor = document.getElementById('contenedor-tipos');
    contenedor.innerHTML = '';

    if (!tipos || tipos.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-solid fa-ban fa-3x mb-3 opacity-50"></i>
                <p>En este momento no hay formatos de cancha disponibles en el sistema.</p>
                <a href="misReservas.html" class="btn btn-sm btn-outline-light mt-2">Volver atrás</a>
            </div>`;
        return;
    }

    tipos.forEach(tipo => {
        // Validación para la imagen de respaldo
        const imagenUrl = tipo.imagen_url ? tipo.imagen_url : 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop';

        const cardHTML = `
            <div class="tipo-cancha-card" onclick="avanzarPaso(${tipo.id})">
                
                <div class="img-wrapper">
                    <img src="${imagenUrl}" alt="Imagen de ${tipo.tipo}" onerror="this.src='https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop'">
                    <div class="img-overlay"></div>
                </div>
                
                <div class="p-3 d-flex flex-column flex-grow-1">
                    <h5 class="fw-bold text-white mb-2" style="font-size: 1.1rem; line-height: 1.3;">${tipo.tipo}</h5>
                    
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <span class="caracteristica-badge"><i class="fa-solid fa-users"></i> ${tipo.capacidad} Jugadores</span>
                        <span class="caracteristica-badge"><i class="fa-solid fa-ruler-combined"></i> ${tipo.ancho}x${tipo.largo}m</span>
                    </div>
                    
                    <div class="flex-grow-1 border-top border-secondary border-opacity-25 pt-3">
                        <div class="text-light-75 small mb-1 d-flex align-items-center">
                            <i class="fa-solid fa-layer-group text-sports me-2"></i>
                            <span class="fw-bold text-white">${tipo.superficie}</span>
                        </div>
                        <p class="text-light-50" style="font-size: 0.75rem; line-height: 1.4; margin-left: 22px;">
                            ${tipo.descripcion_superficie}
                        </p>
                    </div>
                    
                    <div class="mt-auto pt-3 text-center">
                        <button class="btn btn-sm btn-outline-light w-100 fw-bold py-2 border-0 text-sports">
                            Seleccionar formato <i class="fa-solid fa-arrow-right ms-1"></i>
                        </button>
                    </div>
                </div>

            </div>
        `;
        contenedor.innerHTML += cardHTML;
    });
}

function avanzarPaso(idTipo) {
    // Redirige pasando el ID elegido como parámetro en la URL
    window.location.href = `listarCanchasCliente.html?idTipo=${idTipo}`;
}
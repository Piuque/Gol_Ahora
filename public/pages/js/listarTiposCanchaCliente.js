/* ==========================================================================
   GOL AHORA — listarTiposCanchaCliente.js
   ========================================================================== */

// MODO DE PRUEBA
const USAR_MOCKS = true;

const MOCKS_TIPOS_CANCHA = [
    {
        "id": 1, "tipo": "Fútbol 5 (Sintético)", "duracion_min": 60, "duracion_max": 240,
        "ancho": "20.00", "largo": "40.00", "capacidad": 10, "superficie": "Césped sintético",
        "descripcion_superficie": "Base de caucho y arena. Dureza media y buen agarre. Ideal para partidos rápidos.",
        "imagen_url": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop"
    },
    {
        "id": 2, "tipo": "Fútbol 7 (Sintético)", "duracion_min": 60, "duracion_max": 240,
        "ancho": "30.00", "largo": "50.00", "capacidad": 14, "superficie": "Césped sintético Premium",
        "descripcion_superficie": "Fibras de última generación, amortigua el impacto articular. Espacio equilibrado.",
        "imagen_url": "https://images.unsplash.com/photo-1518605368461-1ee7c514baf1?q=80&w=800&auto=format&fit=crop"
    },
    {
        "id": 3, "tipo": "Fútbol 11 (Césped)", "duracion_min": 90, "duracion_max": 240,
        "ancho": "68.00", "largo": "105.00", "capacidad": 22, "superficie": "Césped Natural",
        "descripcion_superficie": "Superficie profesional de césped natural con riego automatizado. Experiencia oficial.",
        "imagen_url": "https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=800&auto=format&fit=crop"
    },
    {
        "id": 4, "tipo": "Fútbol 5 (Parquet)", "duracion_min": 60, "duracion_max": 180,
        "ancho": "20.00", "largo": "40.00", "capacidad": 10, "superficie": "Parquet Indoor",
        "descripcion_superficie": "Cancha techada con piso de madera pulida. Uso obligatorio de calzado flat/liso sin tapones.",
        "imagen_url": "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800&auto=format&fit=crop"
    },
    {
        "id": 5, "tipo": "Fútbol 6 (Sintético)", "duracion_min": 60, "duracion_max": 180,
        "ancho": "25.00", "largo": "45.00", "capacidad": 12, "superficie": "Césped sintético",
        "descripcion_superficie": "Formato intermedio muy popular. Espacio extra para mayor despliegue físico.",
        "imagen_url": "https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?q=80&w=800&auto=format&fit=crop"
    }
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
        const response = await fetch('/api/usuario/tipos-cancha', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const tipos = await response.json();
        renderizarTarjetas(tipos);

    } catch (error) {
        console.error('Error al cargar tipos de cancha:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <h5 class="text-white">Problemas de conexión</h5>
                <p class="text-light-50 small">No pudimos cargar los formatos disponibles. Intentá nuevamente.</p>
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
                <p>En este momento no hay formatos de cancha disponibles para reservar.</p>
                <a href="misReservas.html" class="btn btn-sm btn-outline-light mt-2">Volver atrás</a>
            </div>`;
        return;
    }

    tipos.forEach(tipo => {
        const imagenUrl = tipo.imagen_url ? tipo.imagen_url : 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop';

        // Se eliminó el acordeón, ahora toda la tarjeta es clickeable
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
    window.location.href = `listarCanchasCliente.html?idTipo=${idTipo}`;
}
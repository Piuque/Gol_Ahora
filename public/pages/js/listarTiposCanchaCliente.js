/* ==========================================================================
   GOL AHORA — listarTiposCanchaCliente.js (Guardando Imagen en Memoria)
   ========================================================================== */

const API = "https://gol-ahora.onrender.com";
let tiposGlobales = []; // Variable para guardar los datos

document.addEventListener('DOMContentLoaded', () => {
    cargarTiposDeCancha();
});

async function cargarTiposDeCancha() {
    const contenedor = document.getElementById('contenedor-tipos');

    try {
        const response = await fetch(`${API}/api/cliente/tipos_canchas`, {
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
        tiposGlobales = tipos; // Guardamos en la variable global
        renderizarTarjetas(tipos);

    } catch (error) {
        console.error('Error al cargar tipos de cancha:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <h5 class="text-white">Problemas de conexión</h5>
                <p class="text-light-50 small">No pudimos conectar con el servidor.</p>
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
                <p>En este momento no hay formatos de cancha disponibles.</p>
            </div>`;
        return;
    }

    tipos.forEach(tipo => {
        let imagenUrl = tipo.imagen_url;
        if (imagenUrl && imagenUrl.startsWith('/')) imagenUrl = API + imagenUrl;
        else if (!imagenUrl || imagenUrl === "string") imagenUrl = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop';

        // Guardamos la URL final saneada en el objeto para usarla luego
        tipo.imagenSaneada = imagenUrl;

        const cardHTML = `
            <div class="tipo-cancha-card" onclick="avanzarPaso(${tipo.id})">
                <div class="img-wrapper">
                    <img src="${imagenUrl}" alt="${tipo.tipo}" onerror="this.src='https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop'">
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
    // 1. Buscamos el tipo seleccionado
    const tipoSeleccionado = tiposGlobales.find(t => t.id === idTipo);

    // 2. Guardamos su imagen en la memoria del navegador
    if (tipoSeleccionado) {
        sessionStorage.setItem('imagen_tipo_cancha', tipoSeleccionado.imagenSaneada);
    }

    window.location.href = `listarCanchasCliente.html?idTipo=${idTipo}`;
}
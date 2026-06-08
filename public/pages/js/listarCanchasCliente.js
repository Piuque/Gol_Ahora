/* ==========================================================================
   GOL AHORA — listarCanchasCliente.js (Paso 2)
   ========================================================================== */

const API = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener el ID del formato elegido desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const idTipoCancha = urlParams.get('idTipo');

    // Si entra a la página sin ID, lo devolvemos al Paso 1
    if (!idTipoCancha) {
        window.location.href = '/cliente/tipos-cancha';
        return;
    }

    cargarCanchasFiltradas(idTipoCancha);
});

async function cargarCanchasFiltradas(idTipoCancha) {
    const contenedor = document.getElementById('contenedor-canchas');

    try {
        // Petición GET a la ruta específica por ID que me enviaste
        const response = await fetch(`${API}/api/cliente/tipos_cancha/${idTipoCancha}/canchas`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/acceder';
            return;
        }

        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const canchas = await response.json();
        renderizarTarjetas(canchas);

    } catch (error) {
        console.error('Error al cargar canchas desde la API:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-plug-circle-xmark fa-3x mb-3"></i>
                <h5 class="text-white">Problemas de conexión</h5>
                <p class="text-light-50 small">No pudimos conectar con el servidor para buscar las canchas. Intentá nuevamente.</p>
                <button onclick="cargarCanchasFiltradas(${idTipoCancha})" class="btn btn-outline-danger mt-3 btn-sm">Reintentar</button>
            </div>`;
    }
}

// Reemplaza SOLO la función renderizarTarjetas en tu js/listarCanchasCliente.js

function renderizarTarjetas(canchas) {
    const contenedor = document.getElementById('contenedor-canchas');
    contenedor.innerHTML = '';

    const canchasValidas = canchas.filter(c => c && (c.id !== undefined || c.id_cancha !== undefined));
    if (canchasValidas.length === 0) {
        document.getElementById('badge-categoria').textContent = 'Sin resultados';
        contenedor.innerHTML = `<div class="w-100 text-center text-light-50 py-5"><p>No hay canchas configuradas para este formato.</p></div>`;
        return;
    }

    document.getElementById('badge-categoria').textContent = canchasValidas[0].tipo_cancha || 'Modalidad';

    const imagenHeredada = sessionStorage.getItem('imagen_tipo_cancha');
    const imgFallback = 'https://images.unsplash.com/photo-1518605368461-1ee7c514baf1?q=80&w=800&auto=format&fit=crop';

    function normalizarImagen(url) {
        if (!url || url === 'string') return null;
        if (url.startsWith('/')) return API + url;
        return url;
    }

    canchasValidas.forEach(cancha => {
        const imgFinal = normalizarImagen(cancha.imagen_url) || imagenHeredada || imgFallback;

        const nombreSeguro = (cancha.nombre || 'Cancha').replace(/"/g, '&quot;');
        const formatoSeguro = (cancha.tipo_cancha || 'Formato Estándar').replace(/"/g, '&quot;');

        const precioVal = cancha.precio_hora_reserva !== undefined ? cancha.precio_hora_reserva : cancha.precio;
        const idReal = cancha.id_cancha || cancha.id;
        const precioFormateado = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(parseFloat(precioVal) || 0);

        const cardHTML = `
            <div class="cancha-card" onclick="avanzarPaso(${idReal})">
                <div class="img-wrapper">
                    <img src="${imgFinal}" alt="${nombreSeguro}" onerror="this.onerror=null; this.src='${imgFallback}'">
                    <div class="img-overlay"></div>
                </div>
                <div class="p-4 d-flex flex-column flex-grow-1">
                    <h5 class="fw-bold text-white mb-1" style="font-size: 1.15rem;">${nombreSeguro}</h5>
                    <p class="text-light-50 small mb-4"><i class="fa-solid fa-layer-group text-sports me-2"></i>Formato: ${formatoSeguro}</p>
                    <div class="mt-auto pt-3 border-top border-secondary border-opacity-25 d-flex flex-column gap-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-light-50 small">Precio por turno</span>
                            <span class="precio-badge">${precioFormateado}</span>
                        </div>
                        <button class="btn btn-sports w-100 fw-bold py-2 shadow-sm">Elegir Cancha <i class="fa-solid fa-arrow-right ms-1"></i></button>
                    </div>
                </div>
            </div>`;
        contenedor.innerHTML += cardHTML;
    });
}

function avanzarPaso(idCancha) {
    // Redirige al paso 3: Seleccionar Fecha y Hora
    window.location.href = `/cliente/seleccionarFechaHora?idCancha=${idCancha}`;
}
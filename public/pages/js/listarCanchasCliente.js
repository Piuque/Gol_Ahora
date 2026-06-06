/* ==========================================================================
   GOL AHORA — listarCanchasCliente.js (Paso 2)
   ========================================================================== */

const API = "https://gol-ahora.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener el ID del formato elegido desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const idTipoCancha = urlParams.get('idTipo');

    // Si entra a la página sin ID, lo devolvemos al Paso 1
    if (!idTipoCancha) {
        window.location.href = 'listarTiposCanchaCliente.html';
        return;
    }

    cargarCanchasFiltradas(idTipoCancha);
});

async function cargarCanchasFiltradas(idTipoCancha) {
    const contenedor = document.getElementById('contenedor-canchas');

    try {
        // Petición GET a la ruta específica por ID que me enviaste
        const response = await fetch(`${API}/api/cliente/canchas/${idTipoCancha}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
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

function renderizarTarjetas(canchas) {
    const contenedor = document.getElementById('contenedor-canchas');
    contenedor.innerHTML = '';

    if (!canchas || canchas.length === 0) {
        document.getElementById('badge-categoria').textContent = 'Sin resultados';
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-regular fa-folder-open fa-3x mb-3 opacity-50"></i>
                <p>Actualmente no hay canchas configuradas para este formato.</p>
                <a href="listarTiposCanchaCliente.html" class="btn btn-sm btn-outline-light mt-2">Elegir otra modalidad</a>
            </div>`;
        return;
    }

    // Actualizamos el badge leyendo el JSON exacto (tipo_cancha)
    document.getElementById('badge-categoria').textContent = canchas[0].tipo_cancha || 'Modalidad Seleccionada';

    canchas.forEach(cancha => {

        // ==========================================
        // SOLUCIÓN PARA LA CARGA DE LA IMAGEN
        // ==========================================
        let imagenUrl = cancha.imagen_url;

        // Si la URL arranca con "/" significa que es relativa. Le concatenamos la URL de Render.
        if (imagenUrl && imagenUrl.startsWith('/')) {
            imagenUrl = API + imagenUrl;
        }
        // Si viene vacía, nula o dice "string" (por culpa del Swagger), usamos la imagen default.
        else if (!imagenUrl || imagenUrl === "string") {
            imagenUrl = 'https://images.unsplash.com/photo-1518605368461-1ee7c514baf1?q=80&w=800&auto=format&fit=crop';
        }
        // ==========================================

        // Mapeo seguro del precio basado en tu JSON
        const precioNumero = parseFloat(cancha.precio_hora_reserva) || 0;
        const precioFormateado = new Intl.NumberFormat('es-AR', {
            style: 'currency', currency: 'ARS', minimumFractionDigits: 0
        }).format(precioNumero);

        const cardHTML = `
            <div class="cancha-card" onclick="avanzarPaso(${cancha.id})">
                
                <div class="img-wrapper">
                    <img src="${imagenUrl}" alt="${cancha.nombre}" onerror="this.src='https://images.unsplash.com/photo-1518605368461-1ee7c514baf1?q=80&w=800&auto=format&fit=crop'">
                    <div class="img-overlay"></div>
                </div>
                
                <div class="p-4 d-flex flex-column flex-grow-1">
                    
                    <h5 class="fw-bold text-white mb-1" style="font-size: 1.15rem; line-height: 1.3;">${cancha.nombre}</h5>
                    <p class="text-light-50 small mb-4"><i class="fa-solid fa-layer-group text-sports me-2"></i>Formato: ${cancha.tipo_cancha}</p>
                    
                    <div class="mt-auto pt-3 border-top border-secondary border-opacity-25 d-flex flex-column gap-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-light-50 small">Reserva (1 hora)</span>
                            <span class="precio-badge">
                                ${precioFormateado}
                            </span>
                        </div>
                        
                        <button class="btn btn-sports w-100 fw-bold py-2 shadow-sm">
                            Elegir Cancha <i class="fa-solid fa-arrow-right ms-1"></i>
                        </button>
                    </div>

                </div>
            </div>
        `;
        contenedor.innerHTML += cardHTML;
    });
}

function avanzarPaso(idCancha) {
    // Redirige al paso 3: Seleccionar Fecha y Hora
    window.location.href = `seleccionarFechaHora.html?idCancha=${idCancha}`;
}
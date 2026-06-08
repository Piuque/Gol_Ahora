let misEntrenamientosInscriptos = [];
let catalogoEntrenamientosDisponibles = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarMisEntrenamientos();
});

// =========================================================
// 1. CARGAR ENTRENAMIENTOS REALES
// =========================================================
async function cargarMisEntrenamientos() {
    const contenedor = document.getElementById('contenedor-entrenamientos');

    try {
        const response = await fetch('/api/cliente/entrenamientos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/acceder';
            return;
        }

        if (!response.ok) {
            throw new Error(`Error de conexión: ${response.status}`);
        }

        const data = await response.json();
        misEntrenamientosInscriptos = data || [];
        renderizarTarjetasInscriptas(misEntrenamientosInscriptos);

    } catch (error) {
        console.error('Error al cargar entrenamientos desde BD:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <p>Error al conectar con la base de datos.</p>
                <button onclick="cargarMisEntrenamientos()" class="btn btn-sm btn-outline-danger mt-2">Reintentar</button>
            </div>`;
    }
}

function renderizarTarjetasInscriptas(lista) {
    const contenedor = document.getElementById('contenedor-entrenamientos');
    contenedor.innerHTML = '';

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-solid fa-dumbbell fa-3x mb-3 opacity-50"></i>
                <p>No tenés entrenamientos agendados actualmente.</p>
                <button onclick="explorarEntrenamientos()" class="btn btn-sm btn-outline-danger mt-2">Explorar Catálogo</button>
            </div>`;
        return;
    }

    lista.forEach(et => {
        const cardHTML = `
            <div class="entrenamiento-card d-flex flex-column text-center">
                <div class="icon-wrapper text-danger">
                    <i class="fa-solid fa-dumbbell"></i>
                </div>
                <h5 class="fw-bold text-white mb-2" style="font-size: 1.1rem; line-height: 1.4;">${et.nombre_entrenamiento}</h5>
                <span class="badge bg-danger text-white mx-auto mb-3" style="max-width: fit-content;">Asignado</span>
                
                <div class="mb-4 flex-grow-1 text-start px-2">
                    <div class="text-light-75 small mb-2 d-flex align-items-center">
                        <i class="fa-solid fa-user-gear text-danger me-3"></i>
                        <span>${et.entrenador || et.profesor || 'Preparador asignado'}</span>
                    </div>
                    <div class="text-light-75 small mb-0 d-flex align-items-center">
                        <i class="fa-solid fa-users text-danger me-3"></i>
                        <span>Capacidad: ${et.capacidad_maxima} atletas</span>
                    </div>
                </div>

                <div class="mt-auto pt-3 border-top border-secondary d-flex flex-column gap-2">
                    <button class="btn btn-sm btn-outline-light w-100 fw-bold py-2" onclick="verInfoInscripta(${et.id_entrenamiento})">
                        <i class="fa-solid fa-circle-info me-1"></i> Ver Info
                    </button>
                    <button class="btn btn-sm btn-outline-danger w-100 fw-bold py-2" onclick="darseDeBaja(${et.id_inscripcion})">
                        <i class="fa-solid fa-xmark me-1"></i> Cancelar Inscripción
                    </button>
                </div>
            </div>
        `;
        contenedor.innerHTML += cardHTML;
    });
}

// =========================================================
// 2. VER INFORMACIÓN INDIVIDUAL
// =========================================================
function verInfoInscripta(idEntrenamiento) {
    const et = misEntrenamientosInscriptos.find(item => item.id_entrenamiento === idEntrenamiento);
    if (!et) return;

    Swal.fire({
        background: '#071524',
        color: '#fff',
        title: `<h4 class="text-danger fw-bold mb-0 border-bottom border-secondary pb-3">${et.nombre_entrenamiento}</h4>`,
        html: `
            <div class="text-start mt-3 px-2" style="font-size: 0.9rem;">
                <div class="mb-3">
                    <strong class="text-light-50 small d-block text-uppercase">Preparador Físico</strong>
                    <span class="text-white"><i class="fa-solid fa-user-shield text-danger me-2"></i>${et.entrenador || et.profesor || 'Por definir'}</span>
                </div>
                <div class="mb-3">
                    <strong class="text-light-50 small d-block text-uppercase">Capacidad Máxima del Grupo</strong>
                    <span class="text-white"><i class="fa-solid fa-users text-danger me-2"></i>Hasta ${et.capacidad_maxima} personas por sesión</span>
                </div>
            </div>
        `,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Cerrar'
    });
}

// =========================================================
// 3. DARSE DE BAJA
// =========================================================
async function darseDeBaja(idInscripcion) {
    const result = await Swal.fire({
        title: '¿Cancelar tu inscripción?',
        text: "Liberarás tu lugar en este grupo de entrenamiento.",
        icon: 'warning',
        background: '#071524', color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar inscripción', cancelButtonText: 'Volver'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/cliente/entrenamientos/inscripcion/${idInscripcion}`, {
                method: 'DELETE',
                headers: { 'plataform': 'web' },
                credentials: 'include'
            });

            if (res.ok) {
                await Swal.fire({ icon: 'success', title: 'Baja exitosa', background: '#071524', color: '#fff', confirmButtonColor: '#00C16E' });
                cargarMisEntrenamientos();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "El servidor rechazó la solicitud de baja.");
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#071524', color: '#fff', confirmButtonColor: '#dc3545' });
        }
    }
}

// =========================================================
// 4. CATÁLOGO REAL DESDE EL BACKEND
// =========================================================
async function explorarEntrenamientos() {
    try {
        const response = await fetch('/api/cliente/entrenamientos/disponibles', {
            method: 'GET',
            headers: { 'plataform': 'web' },
            credentials: 'include'
        });

        if (!response.ok) throw new Error("Fallo al obtener entrenamientos disponibles");

        catalogoEntrenamientosDisponibles = await response.json();

        if (!catalogoEntrenamientosDisponibles || catalogoEntrenamientosDisponibles.length === 0) {
            Swal.fire({ icon: 'info', title: 'Sin disponibilidad', text: 'Actualmente no hay entrenamientos disponibles.', background: '#071524', color: '#fff', confirmButtonColor: '#dc3545' });
            return;
        }

        let htmlCatalogo = '<div class="d-flex flex-column gap-3 mt-3">';

        catalogoEntrenamientosDisponibles.forEach(et => {
            const estaLieno = et.inscriptos >= et.capacidad_maxima;
            const opacidad = estaLieno ? 'opacity: 0.6;' : '';
            const textoCupo = estaLieno ? '<span class="text-danger fw-bold small">Agotado</span>' : `<span class="text-success fw-bold small">${et.inscriptos || 0} de ${et.capacidad_maxima} ocupados</span>`;

            htmlCatalogo += `
                <div class="p-3 bg-dark-navy border border-secondary border-opacity-25 rounded-3 text-start hover-catalogo" 
                     style="cursor:pointer; transition: all 0.3s ease; background-color: #0A2540; ${opacidad}" 
                     onclick="toggleDetallesEntrenamiento(${et.id_entrenamiento})">
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="text-danger fw-bold mb-0">${et.nombre_entrenamiento}</h6>
                        <i class="fa-solid fa-chevron-down text-light-50" id="icono-entrenamiento-${et.id_entrenamiento}" style="transition: transform 0.3s ease;"></i>
                    </div>
                    <div class="text-light-50 small mt-1">Entrenador: ${et.entrenador || et.profesor || 'Por asignar'}</div>

                    <div id="detalles-entrenamiento-${et.id_entrenamiento}" class="d-none mt-3 pt-3 border-top border-secondary border-opacity-25">
                        <div class="d-flex justify-content-between mb-2 small">
                            <span class="text-light-50">Horarios pautados:</span>
                            <span class="text-white fw-bold">${et.horarios || 'A definir'}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3 small">
                            <span class="text-light-50">Disponibilidad de cupo:</span>
                            ${textoCupo}
                        </div>
                        
                        ${!estaLieno ? `
                            <button class="btn btn-danger btn-sm w-100 fw-bold text-white mt-2" 
                                    onclick="event.stopPropagation(); iniciarInscripcionEntrenamiento(${et.id_entrenamiento})">
                                Inscribirse y Pagar
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm w-100 fw-bold text-white mt-2" disabled>Cupos Completos</button>
                        `}
                    </div>
                </div>
            `;
        });

        htmlCatalogo += '</div>';

        Swal.fire({
            title: '<h4 class="text-danger fw-bold mb-0 text-start border-bottom border-secondary pb-3"><i class="fa-solid fa-magnifying-glass me-2"></i>Explorar Entrenamientos</h4>',
            html: htmlCatalogo,
            background: '#071524', color: '#fff',
            showConfirmButton: false, showCloseButton: true,
            width: '600px'
        });

    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la oferta de entrenamientos.', background: '#071524', color: '#fff', confirmButtonColor: '#dc3545' });
    }
}

window.toggleDetallesEntrenamiento = function(idEntrenamiento) {
    const contenedorDetalles = document.getElementById(`detalles-entrenamiento-${idEntrenamiento}`);
    const icono = document.getElementById(`icono-entrenamiento-${idEntrenamiento}`);
    if (contenedorDetalles.classList.contains('d-none')) {
        contenedorDetalles.classList.remove('d-none');
        icono.style.transform = "rotate(180deg)";
    } else {
        contenedorDetalles.classList.add('d-none');
        icono.style.transform = "rotate(0deg)";
    }
}

// =========================================================
// 5. INSCRIPCIÓN CON PAGO Y CONFIRMACIÓN
// =========================================================
async function iniciarInscripcionEntrenamiento(idEntrenamiento) {
    const et = catalogoEntrenamientosDisponibles.find(e => e.id_entrenamiento === idEntrenamiento);
    if (!et) return;

    const monto = parseFloat(et.monto) || 0;
    if (monto <= 0) {
        Swal.fire({ icon: 'warning', title: 'Monto no disponible', text: 'No se pudo determinar el costo de este entrenamiento. Contactá al club.', background: '#071524', color: '#fff', confirmButtonColor: '#dc3545' });
        return;
    }

    const pago = await abrirConfirmacionPago({
        titulo: '<span style="color:#dc3545;font-size:1rem;"><i class="fa-solid fa-dumbbell me-2"></i>Confirmar inscripción</span>',
        colorAccent: '#dc3545',
        monto,
        resumenHtml: `
            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
                <div style="font-weight:700;color:#fff;margin-bottom:6px;">${et.nombre_entrenamiento}</div>
                <div style="font-size:0.8rem;color:rgba(255,255,255,0.55);">Entrenador: ${et.entrenador || et.profesor || 'Por asignar'}</div>
                <div style="font-size:0.8rem;color:rgba(255,255,255,0.55);">Horarios: ${et.horarios || 'A definir'}</div>
            </div>`
    });

    if (!pago) return;

    try {
        const res = await fetch(`/api/cliente/entrenamientos/inscripcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', plataform: 'web' },
            body: JSON.stringify({
                id_entrenamiento: idEntrenamiento,
                id_metodo_de_pago: pago.id_metodo_de_pago,
                monto
            }),
            credentials: 'include'
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo procesar la inscripción.');

        await Swal.fire({
            icon: 'success',
            title: '¡Inscripción solicitada!',
            html: `<p style="font-size:0.88rem;line-height:1.5;">Tu solicitud fue registrada. Un administrador confirmará el pago y tu lugar en el entrenamiento.</p>
                   <p style="font-size:0.78rem;opacity:0.65;margin:0;">Si no se confirma en las próximas 3 horas, la solicitud puede cancelarse automáticamente.</p>`,
            background: '#071524', color: '#fff', confirmButtonColor: '#00C16E'
        });

        Swal.close();
        cargarMisEntrenamientos();
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Inscripción rechazada', text: error.message, background: '#071524', color: '#fff', confirmButtonColor: '#dc3545' });
    }
}
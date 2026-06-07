let misClasesInscriptas = [];
let catalogoClasesDisponibles = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarMisClases();
});

// =========================================================
// 1. CARGAR CLASES (Inscripciones activas reales)
// =========================================================
async function cargarMisClases() {
    const contenedor = document.getElementById('contenedor-clases');

    try {
        const response = await fetch('/cliente/clases', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        if (!response.ok) {
            throw new Error(`Error de conexión: ${response.status}`);
        }

        const data = await response.json();
        misClasesInscriptas = data || [];
        renderizarTarjetasInscriptas(misClasesInscriptas);

    } catch (error) {
        console.error('Error al cargar clases desde BD:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <p>Error al conectar con la base de datos.</p>
                <button onclick="cargarMisClases()" class="btn btn-sm btn-outline-danger mt-2">Reintentar</button>
            </div>`;
    }
}

function renderizarTarjetasInscriptas(lista) {
    const contenedor = document.getElementById('contenedor-clases');
    contenedor.innerHTML = '';

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-solid fa-graduation-cap fa-3x mb-3 opacity-50"></i>
                <p>No tenés inscripciones a clases actualmente.</p>
                <button onclick="explorarClases()" class="btn btn-sm btn-outline-warning mt-2 text-dark fw-bold">Explorar Catálogo</button>
            </div>`;
        return;
    }

    lista.forEach(clase => {
        const cardHTML = `
            <div class="clase-card d-flex flex-column text-center">
                <div class="icon-wrapper text-warning">
                    <i class="fa-solid fa-graduation-cap"></i>
                </div>
                <h5 class="fw-bold text-white mb-2" style="font-size: 1.1rem; line-height: 1.4;">${clase.nombre_clase}</h5>
                <span class="badge bg-warning text-dark mx-auto mb-3" style="max-width: fit-content;">Inscripto</span>
                
                <div class="mb-4 flex-grow-1 text-start px-2">
                    <div class="text-light-75 small mb-2 d-flex align-items-center">
                        <i class="fa-solid fa-user-tie text-warning me-3"></i>
                        <span>${clase.profesor || 'Por asignar'}</span>
                    </div>
                    <div class="text-light-75 small mb-0 d-flex align-items-center">
                        <i class="fa-solid fa-users text-warning me-3"></i>
                        <span>Capacidad: ${clase.capacidad_maxima} alumnos</span>
                    </div>
                </div>

                <div class="mt-auto pt-3 border-top border-secondary d-flex flex-column gap-2">
                    <button class="btn btn-sm btn-outline-light w-100 fw-bold py-2" onclick="verInfoInscripta(${clase.id_clase})">
                        <i class="fa-solid fa-circle-info me-1"></i> Ver Info
                    </button>
                    <button class="btn btn-sm btn-outline-danger w-100 fw-bold py-2" onclick="darseDeBaja(${clase.id_inscripcion})">
                        <i class="fa-solid fa-xmark me-1"></i> Darse de Baja
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
function verInfoInscripta(idClase) {
    const clase = misClasesInscriptas.find(item => item.id_clase === idClase);
    if (!clase) return;

    Swal.fire({
        background: '#071524',
        color: '#fff',
        title: `<h4 class="text-warning fw-bold mb-0 border-bottom border-secondary pb-3">${clase.nombre_clase}</h4>`,
        html: `
            <div class="text-start mt-3 px-2" style="font-size: 0.9rem;">
                <div class="mb-3">
                    <strong class="text-light-50 small d-block text-uppercase">Profesor a Cargo</strong>
                    <span class="text-white"><i class="fa-solid fa-user-tie text-warning me-2"></i>${clase.profesor || 'No asignado'}</span>
                </div>
                <div class="mb-3">
                    <strong class="text-light-50 small d-block text-uppercase">Capacidad Máxima</strong>
                    <span class="text-white"><i class="fa-solid fa-users text-warning me-2"></i>Hasta ${clase.capacidad_maxima} alumnos matriculados</span>
                </div>
            </div>
        `,
        confirmButtonColor: '#ffc107',
        confirmButtonText: '<span class="text-dark fw-bold">Cerrar</span>'
    });
}

// =========================================================
// 3. DARSE DE BAJA
// =========================================================
async function darseDeBaja(idInscripcion) {
    const result = await Swal.fire({
        title: '¿Cancelar tu inscripción?',
        text: "Liberarás tu lugar en esta clase.",
        icon: 'warning',
        background: '#071524', color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, darme de baja', cancelButtonText: 'Volver'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/cliente/clases/inscripcion/${idInscripcion}`, {
                method: 'DELETE',
                headers: { 'plataform': 'web' },
                credentials: 'include'
            });

            if (res.ok) {
                await Swal.fire({ icon: 'success', title: 'Baja Exitosa', background: '#071524', color: '#fff', confirmButtonColor: '#00C16E' });
                cargarMisClases();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "El servidor rechazó la solicitud de baja.");
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#071524', color: '#fff', confirmButtonColor: '#00C16E' });
        }
    }
}

// =========================================================
// 4. CATÁLOGO REAL DESDE EL BACKEND
// =========================================================
async function explorarClases() {
    try {
        const response = await fetch('/cliente/clases/disponibles', {
            method: 'GET',
            headers: { 'plataform': 'web' },
            credentials: 'include'
        });

        if (!response.ok) throw new Error("Fallo al obtener clases disponibles");

        catalogoClasesDisponibles = await response.json();

        if (!catalogoClasesDisponibles || catalogoClasesDisponibles.length === 0) {
            Swal.fire({ icon: 'info', title: 'Sin clases', text: 'Actualmente no hay clases ofertadas en la academia.', background: '#071524', color: '#fff', confirmButtonColor: '#ffc107' });
            return;
        }

        let htmlCatalogo = '<div class="d-flex flex-column gap-3 mt-3">';

        catalogoClasesDisponibles.forEach(clase => {
            const estaLlena = clase.inscriptos >= clase.capacidad_maxima;
            const opacidad = estaLlena ? 'opacity: 0.6;' : '';
            const textoCupo = estaLlena ? '<span class="text-danger fw-bold small">Agotado</span>' : `<span class="text-success fw-bold small">${clase.inscriptos || 0} de ${clase.capacidad_maxima} inscriptos</span>`;

            htmlCatalogo += `
                <div class="p-3 bg-dark-navy border border-secondary border-opacity-25 rounded-3 text-start hover-catalogo" 
                     style="cursor:pointer; transition: all 0.3s ease; background-color: #0A2540; ${opacidad}" 
                     onclick="toggleDetallesClase(${clase.id_clase})">
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="text-warning fw-bold mb-0">${clase.nombre_clase}</h6>
                        <i class="fa-solid fa-chevron-down text-light-50" id="icono-clase-${clase.id_clase}" style="transition: transform 0.3s ease;"></i>
                    </div>
                    <div class="text-light-50 small mt-1">Profesor: ${clase.profesor || 'Por asignar'}</div>

                    <div id="detalles-clase-${clase.id_clase}" class="d-none mt-3 pt-3 border-top border-secondary border-opacity-25">
                        <div class="d-flex justify-content-between mb-2 small">
                            <span class="text-light-50">Horarios cursada:</span>
                            <span class="text-white fw-bold">${clase.horarios || 'A definir'}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3 small">
                            <span class="text-light-50">Disponibilidad de cupo:</span>
                            ${textoCupo}
                        </div>
                        
                        ${!estaLlena ? `
                            <button class="btn btn-warning btn-sm w-100 fw-bold text-dark mt-2" 
                                    onclick="event.stopPropagation(); iniciarInscripcionClase(${clase.id_clase})">
                                Inscribirse y Pagar
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm w-100 fw-bold text-white mt-2" disabled>Curso Completo</button>
                        `}
                    </div>
                </div>
            `;
        });

        htmlCatalogo += '</div>';

        Swal.fire({
            title: '<h4 class="text-warning fw-bold mb-0 text-start border-bottom border-secondary pb-3"><i class="fa-solid fa-magnifying-glass me-2"></i>Catálogo de Academia</h4>',
            html: htmlCatalogo,
            background: '#071524', color: '#fff',
            showConfirmButton: false, showCloseButton: true,
            width: '600px'
        });

    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el catálogo de clases desde el servidor.', background: '#071524', color: '#fff', confirmButtonColor: '#ffc107' });
    }
}

window.toggleDetallesClase = function(idClase) {
    const contenedorDetalles = document.getElementById(`detalles-clase-${idClase}`);
    const icono = document.getElementById(`icono-clase-${idClase}`);
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
async function iniciarInscripcionClase(idClase) {
    const clase = catalogoClasesDisponibles.find(c => c.id_clase === idClase);
    if (!clase) return;

    const monto = parseFloat(clase.monto) || 0;
    if (monto <= 0) {
        Swal.fire({ icon: 'warning', title: 'Monto no disponible', text: 'No se pudo determinar el costo de esta clase. Contactá al club.', background: '#071524', color: '#fff', confirmButtonColor: '#ffc107' });
        return;
    }

    const pago = await abrirConfirmacionPago({
        titulo: '<span style="color:#ffc107;font-size:1rem;"><i class="fa-solid fa-graduation-cap me-2"></i>Confirmar inscripción</span>',
        colorAccent: '#ffc107',
        monto,
        resumenHtml: `
            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
                <div style="font-weight:700;color:#fff;margin-bottom:6px;">${clase.nombre_clase}</div>
                <div style="font-size:0.8rem;color:rgba(255,255,255,0.55);">Profesor: ${clase.profesor || 'Por asignar'}</div>
                <div style="font-size:0.8rem;color:rgba(255,255,255,0.55);">Horarios: ${clase.horarios || 'A definir'}</div>
            </div>`
    });

    if (!pago) return;

    try {
        const res = await fetch(`/cliente/clases/inscripcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', plataform: 'web' },
            body: JSON.stringify({
                id_clase: idClase,
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
            html: `<p style="font-size:0.88rem;line-height:1.5;">Tu solicitud fue registrada. Un administrador confirmará el pago y tu lugar en la clase.</p>
                   <p style="font-size:0.78rem;opacity:0.65;margin:0;">Si no se confirma en las próximas 3 horas, la solicitud puede cancelarse automáticamente.</p>`,
            background: '#071524', color: '#fff', confirmButtonColor: '#00C16E'
        });

        Swal.close();
        cargarMisClases();
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Inscripción rechazada', text: error.message, background: '#071524', color: '#fff', confirmButtonColor: '#ffc107' });
    }
}
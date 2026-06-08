/* ==========================================================================
   GOL AHORA — misClases.js
   ========================================================================== */

const API = window.location.origin;

let misClasesInscriptas = [];
let catalogoClasesDisponibles = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarMisClases();
});

// =========================================================
// 1. CARGAR MIS CLASES (Inscripciones activas)
// =========================================================
async function cargarMisClases() {
    const contenedor = document.getElementById('contenedor-clases');

    try {
        const response = await fetch(`${API}/api/cliente/clases`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }

        if (!response.ok) throw new Error(`Error de conexión: ${response.status}`);

        const data = await response.json();
        misClasesInscriptas = data || [];
        renderizarTarjetasInscriptas(misClasesInscriptas);

    } catch (error) {
        console.error('Error al cargar clases:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <p>Error al conectar con la base de datos.</p>
                <button onclick="cargarMisClases()" class="btn btn-sm btn-outline-danger mt-2">Reintentar</button>
            </div>
        `;
    }
}

// =========================================================
// 2. RENDERIZAR CLASES INSCRIPTAS
// =========================================================
function renderizarTarjetasInscriptas(clases) {
    const contenedor = document.getElementById('contenedor-clases');

    if (clases.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center py-5">
                <div class="rounded-circle bg-dark-navy d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px; background-color: rgba(255, 193, 7, 0.1);">
                    <i class="fa-solid fa-graduation-cap fa-2x text-warning"></i>
                </div>
                <h5 class="fw-bold text-white mb-2">No estás inscripto en ninguna clase</h5>
                <p class="text-light-50 small mb-4">Anotate para mejorar tu nivel con nuestros profesionales.</p>
                <button onclick="explorarClases()" class="btn btn-warning fw-bold text-dark px-4 py-2">
                    Ver Clases Disponibles
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    clases.forEach(clase => {
        html += `
            <div class="card bg-navy border-secondary border-opacity-25 text-white" style="min-width: 320px; max-width: 320px; flex-shrink: 0; border-radius: 12px; overflow: hidden;">
                <div class="card-header bg-dark-navy border-bottom border-secondary border-opacity-25 p-3 d-flex justify-content-between align-items-start">
                    <div>
                        <span class="badge bg-warning text-dark mb-2">Inscripción Activa</span>
                        <h5 class="fw-bold mb-0 text-white">${clase.nombre || clase.nombre_clase || 'Clase Formativa'}</h5>
                    </div>
                    <i class="fa-solid fa-futbol text-light-50 mt-1"></i>
                </div>
                <div class="card-body p-3">
                    <div class="mb-3">
                        <small class="text-light-50 d-block mb-1"><i class="fa-solid fa-user-tie me-2"></i>Profesor</small>
                        <span class="fw-medium">${clase.profesor || 'A confirmar'}</span>
                    </div>
                    <div class="mb-4">
                        <small class="text-light-50 d-block mb-1"><i class="fa-regular fa-clock me-2"></i>Horarios</small>
                        <span class="fw-medium text-warning">${clase.horarios || 'A definir'}</span>
                    </div>
                    <button onclick="darBajaClase(${clase.id_inscripcion})" class="btn btn-outline-danger w-100 btn-sm">
                        <i class="fa-solid fa-xmark me-2"></i>Dar de baja
                    </button>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

// =========================================================
// 3. EXPLORAR CLASES Y MODAL DE INSCRIPCIÓN
// =========================================================
async function explorarClases() {
    Swal.fire({
        title: 'Cargando clases...',
        background: '#0A2540', color: '#fff',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const res = await fetch(`${API}/api/cliente/clases/disponibles`, { credentials: 'include' });
        if (!res.ok) throw new Error();

        catalogoClasesDisponibles = await res.json();

        if(catalogoClasesDisponibles.length === 0) {
            Swal.fire({
                icon: 'info', title: 'Sin clases', text: 'Actualmente no hay clases con cupos disponibles.',
                background: '#0A2540', color: '#fff', confirmButtonColor: '#ffc107'
            });
            return;
        }

        let htmlClases = `<div class="d-flex flex-column gap-3 text-start mt-3">`;
        catalogoClasesDisponibles.forEach(c => {
            htmlClases += `
                <div class="p-3 border border-secondary border-opacity-25 rounded bg-dark">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold text-warning mb-0">${c.nombre || c.nombre_clase}</h6>
                        <span class="badge bg-success">$${c.monto_mensual || c.precio || 0} / mes</span>
                    </div>
                    <p class="small text-light-50 mb-1"><i class="fa-solid fa-user-tie me-2"></i>${c.profesor || 'A designar'}</p>
                    <p class="small text-light-50 mb-3"><i class="fa-regular fa-clock me-2"></i>${c.horarios || 'Consultar'}</p>
                    <button onclick="inscribirAClase(${c.id_clase}, ${c.monto_mensual || c.precio || 0}, '${c.nombre || c.nombre_clase}')" class="btn btn-warning btn-sm w-100 fw-bold text-dark">
                        Inscribirme ahora
                    </button>
                </div>
            `;
        });
        htmlClases += `</div>`;

        Swal.fire({
            title: 'Clases Disponibles',
            html: htmlClases,
            background: '#0A2540', color: '#fff',
            showConfirmButton: false, showCloseButton: true, width: '500px'
        });

    } catch (e) {
        Swal.fire({
            icon: 'error', title: 'Error', text: 'No pudimos cargar el catálogo de clases.',
            background: '#0A2540', color: '#fff', confirmButtonColor: '#f25c54'
        });
    }
}

// =========================================================
// 4. FLUJO DE PAGO CON VALIDACIÓN
// =========================================================
async function inscribirAClase(idClase, monto, nombreClase) {
    // Cerramos el modal del catálogo
    Swal.close();

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'Abonar Inscripción a Clase',
        html: `
            <div class="text-start" style="font-family:'Poppins', sans-serif;">
                <p class="mb-1 text-light-50 small">Clase seleccionada:</p>
                <p class="fw-bold text-white fs-5 mb-3">${nombreClase}</p>
                
                <div class="d-flex justify-content-between align-items-center p-3 mb-4 rounded border border-secondary border-opacity-25" style="background-color: rgba(0,0,0,0.2);">
                    <span class="text-light-50 fw-medium">Total a pagar:</span>
                    <span class="text-success fw-bold fs-4">$${monto}</span>
                </div>

                <label class="form-label small text-light-50 mb-1 fw-bold text-uppercase">Método de Pago</label>
                <select id="swal-metodo" class="form-select bg-dark text-white border-secondary mb-3 shadow-none">
                    <option value="" disabled selected>Seleccioná una opción...</option>
                    <option value="1">Tarjeta de Crédito / Débito</option>
                    <option value="2">Transferencia Bancaria</option>
                    <option value="3">Mercado Pago</option>
                </select>

                <div id="swal-tarjeta-form" class="d-none p-3 rounded border border-secondary border-opacity-25" style="background-color: rgba(255,255,255,0.02);">
                    <div class="mb-3">
                        <label class="form-label small text-light-50 mb-1">Número de Tarjeta</label>
                        <div class="input-group">
                            <span class="input-group-text bg-dark border-secondary text-light-50"><i class="fa-regular fa-credit-card"></i></span>
                            <input type="text" id="tarjeta-num" class="form-control bg-dark text-white border-secondary shadow-none" placeholder="0000 0000 0000 0000" maxlength="19">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small text-light-50 mb-1">Nombre del Titular</label>
                        <input type="text" id="tarjeta-nombre" class="form-control bg-dark text-white border-secondary shadow-none" placeholder="Como aparece en la tarjeta">
                    </div>
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="form-label small text-light-50 mb-1">Vencimiento</label>
                            <input type="text" id="tarjeta-venc" class="form-control bg-dark text-white border-secondary shadow-none text-center" placeholder="MM/YY" maxlength="5">
                        </div>
                        <div class="col-6">
                            <label class="form-label small text-light-50 mb-1">CVV</label>
                            <input type="text" id="tarjeta-cvv" class="form-control bg-dark text-white border-secondary shadow-none text-center" placeholder="123" maxlength="4">
                        </div>
                    </div>
                </div>

                <div id="swal-transferencia-info" class="d-none p-3 rounded border border-warning border-opacity-25 mt-2" style="background-color: rgba(255, 193, 7, 0.05);">
                    <p class="mb-2 small text-warning fw-bold"><i class="fa-solid fa-building-columns me-2"></i>Datos para transferir:</p>
                    <p class="mb-0 small text-light-75">CBU: <strong class="text-white">0000003123456789123456</strong><br>Alias: <strong class="text-white">EL.BUEN.DEPORTE</strong></p>
                    <hr class="border-secondary border-opacity-25 my-2">
                </div>
            </div>
        `,
        background: '#0A2540',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fa-solid fa-check me-2"></i>Confirmar Pago',
        cancelButtonText: 'Cancelar',
        width: '500px',
        didOpen: () => {
            const selectMetodo = document.getElementById('swal-metodo');
            const formTarjeta = document.getElementById('swal-tarjeta-form');
            const infoTransf = document.getElementById('swal-transferencia-info');
            const infoMP = document.getElementById('swal-mp-info');

            // Mostrar/Ocultar campos según el método
            selectMetodo.addEventListener('change', (e) => {
                formTarjeta.classList.add('d-none');
                infoTransf.classList.add('d-none');
                infoMP.classList.add('d-none');

                if(e.target.value === '1') formTarjeta.classList.remove('d-none');
                if(e.target.value === '2') infoTransf.classList.remove('d-none');
                if(e.target.value === '3') infoMP.classList.remove('d-none');
            });

            // ---------------------------------------------------------
            // Mismos validadores y separadores que confirmarReservaCliente
            // ---------------------------------------------------------

            // Tarjeta: Solo números y espacios cada 4 dígitos
            document.getElementById('tarjeta-num').addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '').substring(0, 16);
                e.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            });

            // Nombre: Solo letras y espacios
            document.getElementById('tarjeta-nombre').addEventListener('input', function (e) {
                e.target.value = e.target.value.replace(/[^a-zA-Z\sñÑáéíóúÁÉÍÓÚ]/g, '');
            });

            // Vencimiento: Formato MM/YY automático
            document.getElementById('tarjeta-venc').addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '').substring(0, 4);
                if (value.length >= 3) {
                    e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
                } else {
                    e.target.value = value;
                }
            });

            // CVV: Máximo 4 números
            document.getElementById('tarjeta-cvv').addEventListener('input', function (e) {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
            });
        },
        preConfirm: () => {
            const metodo = document.getElementById('swal-metodo').value;

            if (!metodo) {
                Swal.showValidationMessage('Debés seleccionar un método de pago.');
                return false;
            }

            // Validaciones estrictas si eligen Tarjeta
            if (metodo === '1') {
                const num = document.getElementById('tarjeta-num').value.replace(/\s/g, '');
                const nombre = document.getElementById('tarjeta-nombre').value.trim();
                const venc = document.getElementById('tarjeta-venc').value;
                const cvv = document.getElementById('tarjeta-cvv').value;

                if (num.length !== 16) {
                    Swal.showValidationMessage('El número de tarjeta debe contener exactamente 16 dígitos.');
                    return false;
                }
                if (nombre.length < 3) {
                    Swal.showValidationMessage('Ingresá el nombre completo del titular de la tarjeta.');
                    return false;
                }
                if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(venc)) {
                    Swal.showValidationMessage('La fecha de vencimiento es inválida (Formato: MM/YY).');
                    return false;
                }

                // Validación de que no esté vencida
                const [mm, yy] = venc.split('/');
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = parseInt(now.getFullYear().toString().substr(-2));

                if (parseInt(yy) < currentYear || (parseInt(yy) === currentYear && parseInt(mm) < currentMonth)) {
                    Swal.showValidationMessage('La tarjeta ingresada se encuentra vencida.');
                    return false;
                }

                if (cvv.length < 3) {
                    Swal.showValidationMessage('El código CVV es incorrecto (debe tener 3 o 4 dígitos).');
                    return false;
                }
            }

            return { id_metodo_de_pago: parseInt(metodo) };
        }
    });

    if (!isConfirmed) return;

    // Procesamos el POST con el pago validado
    try {
        Swal.fire({
            title: 'Procesando pago...',
            text: 'Aguardá unos segundos por favor.',
            background: '#0A2540', color: '#fff',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const res = await fetch(`${API}/api/cliente/clases/inscripcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            body: JSON.stringify({
                id_clase: idClase,
                id_metodo_de_pago: formValues.id_metodo_de_pago,
                monto: monto
            }),
            credentials: 'include'
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo procesar la inscripción.');

        // Mensaje dinámico según el método elegido
        if (formValues.id_metodo_de_pago === 1 || formValues.id_metodo_de_pago === 3) {
            // Tarjeta o MP (Confirmación Inmediata)
            await Swal.fire({
                icon: 'success',
                title: '¡Inscripción confirmada!',
                html: `<p style="font-size:0.95rem;">Tu pago ha sido acreditado exitosamente. <b>Tu lugar en la clase está asegurado.</b></p>`,
                background: '#071524', color: '#fff', confirmButtonColor: '#00C16E'
            });
        } else {
            // Transferencia (Requiere validación)
            await Swal.fire({
                icon: 'success',
                title: '¡Inscripción solicitada!',
                html: `<p style="font-size:0.95rem;">Tu solicitud fue registrada. Recordá pasar por la recepción del club con el <b>comprobante de transferencia</b> para confirmar tu lugar definitivamente.</p>`,
                background: '#071524', color: '#fff', confirmButtonColor: '#ffc107'
            });
        }

        cargarMisClases();

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Ocurrió un problema',
            text: error.message,
            background: '#0A2540', color: '#fff', confirmButtonColor: '#f25c54'
        });
    }
}

// =========================================================
// 5. DAR DE BAJA
// =========================================================
async function darBajaClase(idInscripcion) {
    const result = await Swal.fire({
        title: '¿Dar de baja?',
        text: 'Se cancelará tu participación en esta clase.',
        icon: 'warning',
        iconColor: '#f25c54',
        background: '#0A2540', color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar inscripción',
        cancelButtonText: 'Volver',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`${API}/api/cliente/clases/inscripcion/${idInscripcion}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Error al cancelar la inscripción.');

        await Swal.fire({
            icon: 'success', title: 'Cancelada', text: 'Tu inscripción ha sido dada de baja correctamente.',
            background: '#0A2540', color: '#fff', confirmButtonColor: '#00C16E'
        });

        cargarMisClases();

    } catch (error) {
        Swal.fire({
            icon: 'error', title: 'Error', text: error.message,
            background: '#0A2540', color: '#fff', confirmButtonColor: '#f25c54'
        });
    }
}
/* Helpers compartidos para flujos de pago del cliente (clases, entrenamientos, etc.) */

const PAGO_API = window.location.origin;

async function fetchMetodosPagoCliente() {
    try {
        const response = await fetch(`${PAGO_API}/api/cliente/metodos_pago`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', plataform: 'web' },
            credentials: 'include'
        });
        if (response.ok) return await response.json();
    } catch (_) { /* fallback abajo */ }

    return [
        { id_metodo_pago: 1, nombre: 'Efectivo' },
        { id_metodo_pago: 2, nombre: 'Tarjeta de Crédito' },
        { id_metodo_pago: 3, nombre: 'Tarjeta de Débito' },
        { id_metodo_pago: 4, nombre: 'Transferencia Bancaria' },
        { id_metodo_pago: 5, nombre: 'Mercado Pago' }
    ];
}

function iconoMetodoPago(nombre) {
    const n = (nombre || '').toLowerCase();
    if (n.includes('efectivo')) return 'fa-money-bill-wave';
    if (n.includes('crédito') || n.includes('credito') || n.includes('débito') || n.includes('debito')) return 'fa-credit-card';
    if (n.includes('transferencia')) return 'fa-money-bill-transfer';
    if (n.includes('mercado') || n.includes('mp')) return 'fa-handshake';
    return 'fa-wallet';
}

function formatearMontoARS(valor) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', minimumFractionDigits: 0
    }).format(parseFloat(valor) || 0);
}

/**
 * Abre un modal de confirmación con resumen y selección de método de pago.
 * @returns {Promise<{id_metodo_de_pago: number, nombreMetodo: string}|null>}
 */
async function abrirConfirmacionPago({ titulo, resumenHtml, monto, colorAccent = '#00C16E' }) {
    const metodos = await fetchMetodosPagoCliente();
    const uid = `pago-${Date.now()}`;

    let metodosHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:14px;">';
    metodos.forEach(m => {
        metodosHtml += `
            <div class="metodo-inscripcion" data-id="${m.id_metodo_pago}" data-nombre="${m.nombre}"
                 onclick="window._seleccionarMetodoInscripcion('${uid}', ${m.id_metodo_pago}, '${m.nombre.replace(/'/g, "\\'")}')"
                 style="border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 6px;text-align:center;cursor:pointer;transition:all 0.2s;">
                <i class="fa-solid ${iconoMetodoPago(m.nombre)}" style="font-size:1.2rem;color:rgba(255,255,255,0.45);display:block;margin-bottom:6px;"></i>
                <span style="font-size:0.68rem;font-weight:600;color:#fff;">${m.nombre}</span>
            </div>`;
    });
    metodosHtml += '</div>';

    window._estadoPagoInscripcion = window._estadoPagoInscripcion || {};
    window._estadoPagoInscripcion[uid] = { idMetodo: null, nombreMetodo: '' };

    window._seleccionarMetodoInscripcion = function(prefix, id, nombre) {
        const st = window._estadoPagoInscripcion[prefix];
        st.idMetodo = id;
        st.nombreMetodo = nombre;
        document.querySelectorAll('.metodo-inscripcion').forEach(el => {
            const sel = parseInt(el.dataset.id, 10) === id;
            el.style.borderColor = sel ? colorAccent : 'rgba(255,255,255,0.12)';
            el.style.background = sel ? `${colorAccent}22` : 'transparent';
        });
        const tarjeta = (nombre || '').toLowerCase();
        const wrapTarjeta = document.getElementById(`${prefix}-tarjeta`);
        const wrapEfectivo = document.getElementById(`${prefix}-efectivo`);
        const wrapTransf = document.getElementById(`${prefix}-transferencia`);
        if (wrapTarjeta) wrapTarjeta.style.display = (tarjeta.includes('crédito') || tarjeta.includes('credito') || tarjeta.includes('débito') || tarjeta.includes('debito')) ? 'block' : 'none';
        if (wrapEfectivo) wrapEfectivo.style.display = tarjeta.includes('efectivo') ? 'block' : 'none';
        if (wrapTransf) wrapTransf.style.display = tarjeta.includes('transferencia') ? 'block' : 'none';
    };

    const result = await Swal.fire({
        background: '#0A2540',
        color: '#fff',
        width: '560px',
        title: titulo,
        showCancelButton: true,
        confirmButtonColor: colorAccent,
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Confirmar y solicitar',
        cancelButtonText: 'Volver',
        reverseButtons: true,
        html: `
            <div style="text-align:left;font-family:'Poppins',sans-serif;">
                ${resumenHtml}
                <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);">Total a abonar</span>
                        <span style="font-size:1.2rem;font-weight:700;color:${colorAccent};">${formatearMontoARS(monto)}</span>
                    </div>
                </div>
                <div style="font-size:0.65rem;font-weight:700;color:${colorAccent};letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Método de pago</div>
                ${metodosHtml}
                <div id="${uid}-tarjeta" style="display:none;margin-bottom:10px;">
                    <input id="${uid}-numero" type="text" placeholder="Número de tarjeta (16 dígitos)" maxlength="19"
                        style="width:100%;background:rgba(7,21,36,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 10px;border-radius:7px;font-size:0.85rem;margin-bottom:8px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <input id="${uid}-venc" type="text" placeholder="MM/AA" maxlength="5"
                            style="background:rgba(7,21,36,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 10px;border-radius:7px;font-size:0.85rem;">
                        <input id="${uid}-ccv" type="password" placeholder="cvv" maxlength="3"
                            style="background:rgba(7,21,36,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:8px 10px;border-radius:7px;font-size:0.85rem;">
                    </div>
                </div>
                <div id="${uid}-transferencia" style="display:none;font-size:0.78rem;color:#38bdf8;background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:8px;padding:10px 12px;margin-bottom:10px;">
                    CBU: 0000003123456789123456 · Alias: EL.BUEN.DEPORTE<br>
                </div>
            </div>`,
        didOpen: () => {
            // === LÓGICA DE VALIDACIÓN EN TIEMPO REAL AÑADIDA AQUÍ ===
            const tarjetaInput = document.getElementById(`${uid}-numero`);
            const vencInput = document.getElementById(`${uid}-venc`);
            const cvvInput = document.getElementById(`${uid}-cvv`);

            if (tarjetaInput) {
                // Tarjeta: Solo números y separación de a 4 dígitos
                tarjetaInput.addEventListener('input', function (e) {
                    let value = e.target.value.replace(/\D/g, '').substring(0, 16);
                    e.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                });
            }

            if (vencInput) {
                // Vencimiento: Formato automático MM/YY (solo números)
                vencInput.addEventListener('input', function (e) {
                    let value = e.target.value.replace(/\D/g, '').substring(0, 4);
                    if (value.length >= 3) {
                        e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
                    } else {
                        e.target.value = value;
                    }
                });
            }

            if (cvvInput) {
                // CVV: Solo números, máximo 4
                cvvInput.addEventListener('input', function (e) {
                    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
                });
            }
        },
        preConfirm: () => {
            const st = window._estadoPagoInscripcion[uid];
            if (!st.idMetodo) {
                Swal.showValidationMessage('Seleccioná un método de pago');
                return false;
            }
            const nombre = (st.nombreMetodo || '').toLowerCase();
            if (nombre.includes('crédito') || nombre.includes('credito') || nombre.includes('débito') || nombre.includes('debito')) {
                const num = (document.getElementById(`${uid}-numero`)?.value || '').replace(/\s/g, '');
                const venc = document.getElementById(`${uid}-venc`)?.value || '';
                const cvv = document.getElementById(`${uid}-cvv`)?.value || '';
                if (num.length !== 16 || venc.length !== 5 || cvv.length < 3) {
                    Swal.showValidationMessage('Completá los datos de la tarjeta correctamente');
                    return false;
                }
            }
            return { id_metodo_de_pago: st.idMetodo, nombreMetodo: st.nombreMetodo };
        }
    });

    if (!result.isConfirmed) return null;
    return result.value;
}
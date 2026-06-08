/* ==========================================================================
   GOL AHORA — misPagos.js
   ========================================================================== */

const API = window.location.origin;

let todosLosPagos = [];
let detallesCache = {};

document.addEventListener('DOMContentLoaded', () => {
    cargarPagos();
    inicializarFiltros();
});

// ==========================================
// FILTROS
// ==========================================
const FILTRO_STYLES = {
    'todas':      { bg: 'rgba(99,179,237,0.08)',  border: 'rgba(99,179,237,0.2)',  color: '#63b3ed', bgActive: 'rgba(99,179,237,0.18)', borderActive: 'rgba(99,179,237,0.5)' },
    'Pendiente':  { bg: 'rgba(255,193,7,0.08)',  border: 'rgba(255,193,7,0.25)', color: '#ffc107', bgActive: 'rgba(255,193,7,0.22)',  borderActive: 'rgba(255,193,7,0.6)'  },
    'Pagado':     { bg: 'rgba(0,193,110,0.08)',   border: 'rgba(0,193,110,0.25)', color: '#00C16E', bgActive: 'rgba(0,193,110,0.22)',  borderActive: 'rgba(0,193,110,0.6)'  },
    'Cancelado':  { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',color: '#94a3b8', bgActive: 'rgba(148,163,184,0.2)', borderActive: 'rgba(148,163,184,0.5)' },
};

function inicializarFiltros() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filtro-btn').forEach(b => {
                const s = FILTRO_STYLES[b.dataset.filtro] || FILTRO_STYLES['todas'];
                b.style.background   = s.bg;
                b.style.borderColor  = s.border;
                b.style.color        = s.color;
                b.classList.remove('active');
            });
            const s = FILTRO_STYLES[btn.dataset.filtro] || FILTRO_STYLES['todas'];
            btn.style.background  = s.bgActive;
            btn.style.borderColor = s.borderActive;
            btn.style.color       = s.color;
            btn.classList.add('active');
            aplicarFiltro(btn.dataset.filtro);
        });
    });
}

function aplicarFiltro(filtro) {
    const filtrados = filtro === 'todas'
        ? todosLosPagos
        : todosLosPagos.filter(p => p.estado === filtro);
    renderizarTarjetas(filtrados);
}

// ==========================================
// CARGAR PAGOS
// ==========================================
async function cargarPagos() {
    const contenedor = document.getElementById('contenedor-pagos');
    try {
        const response = await fetch(`${API}/api/cliente/cobros`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        todosLosPagos = await response.json();
        detallesCache = {};

        const filtroActivo = document.querySelector('.filtro-btn.active')?.dataset.filtro || 'todas';
        aplicarFiltro(filtroActivo);

    } catch (error) {
        console.error('Error al cargar pagos:', error);
        contenedor.innerHTML = `
            <div class="w-100 text-center text-danger py-5">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                <h5 class="text-white">Hubo un problema al cargar tus pagos</h5>
                <p class="text-light-50 small">${error.message}</p>
            </div>`;
    }
}

// ==========================================
// HELPERS
// ==========================================
function formatearMonto(monto) {
    const n = parseFloat(monto);
    if (isNaN(n)) return '$ —';
    return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estadoBadge(estado) {
    if (estado === 'Pagado')     return { cls: 'bg-success text-white',  color: '#00C16E' };
    if (estado === 'Pendiente')  return { cls: 'bg-warning text-dark',   color: '#ffc107' };
    if (estado === 'Cancelado')  return { cls: 'bg-secondary text-white', color: '#94a3b8' };
    return { cls: 'bg-secondary text-white', color: '#6c757d' };
}

function iconoMetodo(metodo) {
    const m = (metodo || '').toLowerCase();
    if (m.includes('efectivo'))       return 'fa-money-bill-wave';
    if (m.includes('crédito') || m.includes('credito')) return 'fa-credit-card';
    if (m.includes('débito') || m.includes('debito'))   return 'fa-credit-card';
    if (m.includes('transferencia'))  return 'fa-money-bill-transfer';
    if (m.includes('mercado'))        return 'fa-handshake';
    return 'fa-wallet';
}

async function obtenerDetalle(id) {
    if (detallesCache[id]) return detallesCache[id];

    const response = await fetch(`${API}/api/cliente/cobros/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'plataform': 'web' },
        credentials: 'include'
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error ${response.status}`);
    }

    const detalle = await response.json();
    detallesCache[id] = detalle;
    return detalle;
}

// ==========================================
// RENDERIZADO
// ==========================================
function renderizarTarjetas(pagos) {
    const contenedor = document.getElementById('contenedor-pagos');
    contenedor.innerHTML = '';

    if (!pagos || pagos.length === 0) {
        contenedor.innerHTML = `
            <div class="w-100 text-center text-light-50 py-5">
                <i class="fa-solid fa-receipt fa-3x mb-3 opacity-50"></i>
                <p>No hay pagos para mostrar.</p>
                <a href="/cliente/misReservas" class="btn btn-sm mt-2 fw-bold" style="background:#63b3ed;border-color:#63b3ed;color:#071524;">
                    Ver mis reservas
                </a>
            </div>`;
        return;
    }

    pagos.forEach(pago => {
        const badge = estadoBadge(pago.estado);
        const puedeImprimir = pago.estado === 'Pagado';

        contenedor.innerHTML += `
            <div class="pago-card d-flex flex-column" data-id="${pago.id}">
                <div class="mb-2">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="fa-solid ${iconoMetodo(pago.metodo)}" style="color:#63b3ed;font-size:1.2rem;"></i>
                        <h5 class="fw-bold text-white mb-0" style="font-size:1rem;">Cobro #${pago.id}</h5>
                    </div>
                    <span class="badge ${badge.cls}" style="font-size:0.7rem;">${pago.estado || '—'}</span>
                </div>
                <div class="mb-3">
                    <div class="monto-display mb-3">${formatearMonto(pago.monto)}</div>
                    <div class="text-light-75 small mb-2 d-flex align-items-center">
                        <i class="fa-solid fa-calendar-day me-3" style="color:#63b3ed;font-size:1rem;"></i>
                        <span style="font-size:0.85rem;">${pago.fecha_pago || 'Sin fecha'}</span>
                    </div>
                    <div class="text-light-75 small d-flex align-items-center">
                        <i class="fa-solid fa-credit-card me-3" style="color:#63b3ed;font-size:1rem;"></i>
                        <span style="font-size:0.85rem;">${pago.metodo || 'Método no especificado'}</span>
                    </div>
                </div>
                <div class="d-flex flex-column gap-2 mt-auto pt-3 border-top border-secondary">
                    <button class="btn btn-sm btn-outline-light w-100 fw-bold py-2" onclick="verDetalles(${pago.id})">
                        <i class="fa-solid fa-eye me-1"></i> Ver Detalles
                    </button>
                    ${puedeImprimir ? `
                    <button class="btn btn-sm w-100 fw-bold py-2" onclick="imprimirRecibo(${pago.id})"
                        style="border:1px solid rgba(99,179,237,0.5);color:#63b3ed;background:rgba(99,179,237,0.08);">
                        <i class="fa-solid fa-file-pdf me-1"></i> Imprimir Recibo
                    </button>` : `
                    <button class="btn btn-sm btn-outline-secondary w-100 fw-bold py-2" disabled title="Disponible cuando el cobro esté pagado">
                        <i class="fa-solid fa-file-pdf me-1"></i> Recibo no disponible
                    </button>`}
                </div>
            </div>`;
    });
}

// ==========================================
// VER DETALLES
// ==========================================
async function verDetalles(id) {
    Swal.fire({
        background: '#0A2540',
        color: '#fff',
        title: 'Cargando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const d = await obtenerDetalle(id);
        Swal.close();

        const badge = estadoBadge(d.estado);
        const turnoHtml = d.cancha_reservada
            ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
                    <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Cancha</div><div style="font-size:0.85rem;font-weight:500;">${d.cancha_reservada}</div></div>
                    <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Turno</div><div style="font-size:0.85rem;font-weight:500;">${d.fecha_turno || '—'} ${d.hora_inicio ? '· ' + d.hora_inicio + ' hs' : ''}</div></div>
               </div>`
            : `<p style="font-size:0.78rem;color:rgba(255,255,255,0.45);margin:0;">Sin reserva asociada a este cobro.</p>`;

        const reciboHtml = d.nro_transaccion
            ? `<div style="background:rgba(0,193,110,0.06);border:1px solid rgba(0,193,110,0.15);border-radius:8px;padding:10px 14px;margin-top:12px;font-size:0.78rem;">
                    <div style="font-size:0.62rem;font-weight:700;color:#00C16E;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Recibo emitido</div>
                    <div style="color:rgba(255,255,255,0.7);">Nro. transacción: <strong style="color:#fff;">${d.nro_transaccion}</strong></div>
                    ${d.fecha_recibo ? `<div style="color:rgba(255,255,255,0.55);margin-top:4px;">Fecha: ${d.fecha_recibo}</div>` : ''}
               </div>`
            : '';

        Swal.fire({
            background: '#0A2540',
            color: '#fff',
            width: '500px',
            showConfirmButton: true,
            confirmButtonColor: '#63b3ed',
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            html: `
            <div style="font-family:'Poppins',sans-serif;text-align:left;padding:4px 4px 0;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:rgba(99,179,237,0.12);border:1px solid rgba(99,179,237,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid fa-receipt" style="color:#63b3ed;font-size:1rem;"></i>
                    </div>
                    <div>
                        <div style="font-size:1rem;font-weight:700;color:#fff;">Cobro #${d.id}</div>
                        <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);">${d.metodo || ''}</div>
                    </div>
                    <span style="margin-left:auto;background:${badge.color}22;border:1px solid ${badge.color}55;color:${badge.color};border-radius:4px;padding:3px 10px;font-size:0.72rem;font-weight:700;">${d.estado}</span>
                </div>

                <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#63b3ed;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Importe</div>
                    <div style="font-size:1.4rem;font-weight:700;color:#63b3ed;margin-bottom:10px;">${formatearMonto(d.monto)}</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Fecha del cobro</div><div style="font-size:0.85rem;font-weight:500;">${d.fecha_pago || '—'}</div></div>
                        <div><div style="font-size:0.67rem;color:rgba(255,255,255,0.4);margin-bottom:2px;">Método de pago</div><div style="font-size:0.85rem;font-weight:500;">${d.metodo || '—'}</div></div>
                    </div>
                </div>

                <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:12px;">
                    <div style="font-size:0.62rem;font-weight:700;color:#63b3ed;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Reserva asociada</div>
                    ${turnoHtml}
                </div>

                ${d.comprobante_info ? `
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 14px;font-size:0.78rem;color:rgba(255,255,255,0.55);margin-bottom:12px;">
                    <i class="fa-solid fa-circle-info me-2" style="color:#63b3ed;"></i>${d.comprobante_info}
                </div>` : ''}

                ${reciboHtml}

                ${d.estado === 'Pagado' ? `
                <button onclick="Swal.close(); imprimirRecibo(${d.id})"
                    style="width:100%;margin-top:14px;padding:10px;border-radius:7px;border:1px solid rgba(99,179,237,0.4);background:rgba(99,179,237,0.1);color:#63b3ed;font-weight:600;font-size:0.85rem;cursor:pointer;">
                    <i class="fa-solid fa-file-pdf me-2"></i>Imprimir recibo
                </button>` : ''}
            </div>`
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message,
            background: '#071524',
            color: '#fff',
            confirmButtonColor: '#ef4444'
        });
    }
}

// ==========================================
// IMPRIMIR RECIBO (PDF)
// ==========================================
async function imprimirRecibo(id) {
    try {
        const d = await obtenerDetalle(id);

        if (d.estado !== 'Pagado') {
            Swal.fire({
                icon: 'info',
                title: 'Recibo no disponible',
                text: 'Solo podés imprimir el recibo de cobros con estado Pagado.',
                background: '#0A2540',
                color: '#fff',
                confirmButtonColor: '#63b3ed'
            });
            return;
        }

        generarPdfRecibo(d);

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al generar recibo',
            text: err.message,
            background: '#071524',
            color: '#fff',
            confirmButtonColor: '#ef4444'
        });
    }
}

function nroComprobante(d) {
    return d.nro_transaccion || `COBRO-${d.id}`;
}

function pdfLinea(doc, label, valor, y, xLabel = 22, xValor = 80) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), xLabel, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.text(String(valor || '—'), xValor, y);
}

function pdfSeccion(doc, titulo, y) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(20, y - 5, 170, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 193, 110);
    doc.text(titulo.toUpperCase(), 22, y);
    return y + 9;
}

function pdfPie(doc) {
    const y = 280;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(170, 170, 170);
    doc.text('Gol Ahora — comprobante generado automáticamente. Conservalo como respaldo.', 105, y + 5, { align: 'center' });
}

function generarPdfRecibo(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nro = nroComprobante(d);

    // Encabezado
    doc.setFillColor(0, 193, 110);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('GOL AHORA', 22, 9.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('golahora.com.ar', 210 - 22, 9.5, { align: 'right' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 100);
    doc.text('RECIBO DE PAGO', 22, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(`Nro. ${nro}`, 22, 37);
    const fechaEmision = d.fecha_recibo || d.fecha_pago || new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Emitido: ${fechaEmision}`, 210 - 22, 37, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(22, 41, 188, 41);

    let y = 50;
    y = pdfSeccion(doc, 'Detalle del Cobro', y);

    pdfLinea(doc, 'ID Cobro',      '#' + d.id, y);                          y += 8;
    pdfLinea(doc, 'Monto abonado', formatearMonto(d.monto), y);             y += 8;
    pdfLinea(doc, 'Estado',        d.estado, y);                             y += 8;
    pdfLinea(doc, 'Fecha de cobro', d.fecha_pago, y);                        y += 8;
    pdfLinea(doc, 'Método de pago', d.metodo, y);                           y += 12;

    if (d.cancha_reservada) {
        y = pdfSeccion(doc, 'Servicio / Reserva', y);
        pdfLinea(doc, 'Cancha',  d.cancha_reservada, y);                     y += 8;
        pdfLinea(doc, 'Turno',   `${d.fecha_turno || '—'} · ${d.hora_inicio || '—'} hs`, y); y += 12;
    }

    if (d.comprobante_info || d.detalles_recibo) {
        y = pdfSeccion(doc, 'Observaciones', y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        const texto = (d.detalles_recibo || d.comprobante_info || '').substring(0, 200);
        doc.text(texto, 22, y);
        y += 14;
    }

    // Bloque de total destacado
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(20, y, 170, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(27, 94, 32);
    doc.text('TOTAL ABONADO', 24, y + 8);
    doc.setFontSize(14);
    doc.text(formatearMonto(d.monto), 24, y + 17);

    pdfPie(doc);

    const slug = nro.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`golahora-recibo-pago-${slug}.pdf`);
}

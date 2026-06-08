let reservasData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const buscador = document.getElementById("buscador");
    const selectorEstado = document.getElementById("selector-estado");
    await cargarReservas();
    selectorEstado.addEventListener("change", () => filtrarReservas());
    buscador.addEventListener("input", () => filtrarReservas());
});

async function cargarReservas() {
    const contenedor = document.getElementById("contenedor-reservas");
    const userId = localStorage.getItem("userId");
    contenedor.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div></div>`;
    try {
        const res = await fetch("/admin/reservas", { credentials: "include", headers: { "x-user-id": userId } });
        if (res.status === 401 || res.status === 403) { window.location.href = '/acceder'; return; }
        if (!res.ok) throw new Error("Error del servidor");
        reservasData = await res.json();
        if (!reservasData || reservasData.length === 0) {
            contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay reservas registradas.</p>`;
            return;
        }
        renderReservas(reservasData);
    } catch (e) {
        contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar.</p>`;
    }
}

function filtrarReservas() {
    const query = document.getElementById("buscador").value.toLowerCase();
    const estado = document.getElementById("selector-estado").value;
    const filtradas = reservasData.filter(r => {
        const matchNombre = `${r.cliente_nombre} ${r.cliente_apellido}`.toLowerCase().includes(query) || r.cancha.toLowerCase().includes(query);
        const matchEstado = estado === "" || r.estado_cobro === estado;
        return matchNombre && matchEstado;
    });
    renderReservas(filtradas);
}

function badgeEstado(estado) {
    const colores = { 'Pendiente': '#f59e0b', 'Pagado': '#00C16E', 'Cancelado': '#ef4444' };
    const color = colores[estado] || '#6c757d';
    return `<span class="badge" style="background-color:${color};">${estado}</span>`;
}

function renderReservas(reservas) {
    const contenedor = document.getElementById("contenedor-reservas");
    if (reservas.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron reservas.</p>`;
        return;
    }
    contenedor.innerHTML = "";
    reservas.forEach(r => {
        const div = document.createElement("div");
        div.className = "reserva-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(r);
        div.innerHTML = `
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <p class="text-white fw-bold mb-0">${r.cliente_nombre} ${r.cliente_apellido}</p>
                    ${badgeEstado(r.estado_cobro)}
                </div>
                <p class="text-light-50 small mb-0">
                    <i class="fa-solid fa-futbol me-1" style="color:#00C16E"></i> ${r.cancha} &nbsp;·&nbsp;
                    <i class="fa-solid fa-calendar me-1" style="color:#00C16E"></i> ${r.fecha} ${r.hora_inicio}-${r.hora_fin}
                </p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

function verDetalle(r) {
    document.getElementById("modal-titulo").textContent = `Reserva #${r.id}`;
    document.getElementById("modal-info").innerHTML = `
        <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${r.cliente_nombre} ${r.cliente_apellido}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${r.cliente_email}</span></div>
        <div class="info-row"><span class="info-label">Cancha</span><span class="info-value">${r.cancha}</span></div>
        <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${r.fecha}</span></div>
        <div class="info-row"><span class="info-label">Horario</span><span class="info-value">${r.hora_inicio} - ${r.hora_fin}</span></div>
        <div class="info-row"><span class="info-label">Monto</span><span class="info-value">$${r.monto}</span></div>
        <div class="info-row"><span class="info-label">Metodo de pago</span><span class="info-value">${r.metodo_pago}</span></div>
        <div class="info-row"><span class="info-label">Estado</span><span class="info-value">${badgeEstado(r.estado_cobro)}</span></div>
        <div class="d-flex gap-2 mt-3">
            <button onclick="abrirModificarReserva(${r.id})"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #0d6efd;">
                <i class="fa-solid fa-pen me-1"></i> Modificar
            </button>
            <button onclick="confirmarEliminarReserva(${r.id})"
                class="btn btn-sm fw-bold text-white flex-grow-1" style="background-color: #ef4444;">
                <i class="fa-solid fa-trash me-1"></i> Cancelar
            </button>
        </div>
        ${r.estado_cobro === 'Pendiente' ? `
        <button onclick="confirmarPago(${r.id_cobro})" class="btn w-100 btn-sm fw-bold text-white mt-2" style="background-color:#00C16E;">
            <i class="fa-solid fa-check me-1"></i> Confirmar Pago
        </button>` : ''}
    `;
    const modal = new bootstrap.Modal(document.getElementById("modalReserva"));
    modal.show();
}

async function abrirModificarReserva(id) {
    const r = reservasData.find(x => x.id === id);
    if (!r) return;

    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const duracion = calcularDuracionMinutos(r.hora_inicio, r.hora_fin) || r.duracion_min || 60;

    const { value: nuevaFecha, isConfirmed } = await Swal.fire({
        background: '#0A2540',
        color: '#fff',
        title: 'Modificar Reserva',
        html: `
            <p style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin-bottom:12px;">
                Turno actual: <strong style="color:#fff;">${r.fecha} · ${r.hora_inicio} - ${r.hora_fin}</strong>
            </p>
            <label style="font-size:0.7rem;color:rgba(255,255,255,0.45);text-transform:uppercase;display:block;margin-bottom:6px;">Nueva fecha</label>
            <input type="date" id="swal-nueva-fecha" class="swal2-input" style="width:100%;" min="${new Date().toISOString().split('T')[0]}">
            <div id="swal-slots" style="margin-top:16px;max-height:280px;overflow-y:auto;"></div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        didOpen: () => {
            document.getElementById('swal-nueva-fecha').addEventListener('change', async (e) => {
                const fecha = e.target.value;
                if (!fecha) return;
                const slotsDiv = document.getElementById('swal-slots');
                slotsDiv.innerHTML = '<div style="text-align:center;padding:12px;color:rgba(255,255,255,0.5);font-size:0.82rem;">Verificando disponibilidad...</div>';
                try {
                    const userId = localStorage.getItem("userId");
                    const resp = await fetch(`/api/cliente/canchas/${r.id_cancha}/ocupaciones?fecha=${fecha}`, {
                        credentials: 'include',
                        headers: { 'x-user-id': userId }
                    });
                    const ocupaciones = await resp.json();
                    renderizarSlotsModificar(ocupaciones, fecha, duracion, r.hora_inicio);
                } catch {
                    slotsDiv.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;">No se pudo verificar disponibilidad.</div>';
                }
            });
        },
        preConfirm: () => {
            const fecha = document.getElementById('swal-nueva-fecha')?.value;
            const slotSelected = document.querySelector('.slot-pill.selected-slot');
            if (!fecha) { Swal.showValidationMessage('Seleccioná una fecha'); return false; }
            const hoyStr = new Date().toISOString().split('T')[0];
            if (fecha < hoyStr) { Swal.showValidationMessage('No se puede modificar a una fecha pasada'); return false; }
            if (!slotSelected) { Swal.showValidationMessage('Seleccioná un horario disponible'); return false; }
            const hora_inicio = slotSelected.dataset.inicio;
            if (fecha === hoyStr) {
                const [h, m] = hora_inicio.split(':').map(Number);
                const horaInicioDate = new Date();
                horaInicioDate.setHours(h, m, 0, 0);
                if (horaInicioDate <= new Date()) {
                    Swal.showValidationMessage('No se puede modificar a un horario que ya pasó');
                    return false;
                }
            }
            return {
                fecha,
                hora_inicio,
                hora_fin: slotSelected.dataset.fin
            };
        }
    });

    if (!isConfirmed || !nuevaFecha) return;

    const userId = localStorage.getItem("userId");
    const hi = nuevaFecha.hora_inicio.length === 5 ? `${nuevaFecha.hora_inicio}:00` : nuevaFecha.hora_inicio;
    const hf = nuevaFecha.hora_fin.length === 5 ? `${nuevaFecha.hora_fin}:00` : nuevaFecha.hora_fin;

    try {
        const res = await fetch(`/admin/reservas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            credentials: 'include',
            body: JSON.stringify({ fecha: nuevaFecha.fecha, hora_inicio: hi, hora_fin: hf })
        });
        const data = await res.json();
        if (res.ok) {
            generarPdfModificacionAdmin(
                { id, cancha: r.cancha, fecha: r.fecha, hora_inicio: r.hora_inicio, hora_fin: r.hora_fin },
                { fecha: nuevaFecha.fecha, hora_inicio: nuevaFecha.hora_inicio, hora_fin: nuevaFecha.hora_fin }
            );
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Reserva modificada. Se descargó el comprobante.', confirmButtonColor: '#00C16E' });
            await cargarReservas();
        } else {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
        }
    } catch {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

function calcularDuracionMinutos(horaInicio, horaFin) {
    const [hI, mI] = (horaInicio || '0:0').split(':').map(Number);
    const [hF, mF] = (horaFin || '0:0').split(':').map(Number);
    return (hF * 60 + mF) - (hI * 60 + mI);
}

function renderizarSlotsModificar(ocupaciones, fecha, duracion, horaInicioActual) {
    const slotsDiv = document.getElementById('swal-slots');
    if (!slotsDiv) return;

    const bloques = [];
    let cur = 8 * 60;
    while (cur + duracion <= 24 * 60) {
        const ini = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
        const finMin = cur + duracion;
        const finH = Math.floor(finMin / 60) === 24 ? '00' : String(Math.floor(finMin / 60)).padStart(2, '0');
        const fin = `${finH}:${String(finMin % 60).padStart(2, '0')}`;
        bloques.push({ ini, fin });
        cur += duracion;
    }

    const ocupacionesMapeadas = {};
    (Array.isArray(ocupaciones) ? ocupaciones : []).forEach(oc => {
        const h = (oc.hora_inicio || '').substring(0, 5);
        const hActual = (horaInicioActual || '').substring(0, 5);
        if (h && h !== hActual) ocupacionesMapeadas[h] = true;
    });

    const ahora = new Date();
    const hoyLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    const esHoy = fecha === hoyLocal;

    let html = '<div style="font-size:0.68rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">Horarios disponibles</div><div style="display:flex;flex-wrap:wrap;gap:6px;">';
    bloques.forEach(b => {
        let disponible = !ocupacionesMapeadas[b.ini];
        if (esHoy) {
            const [hh, mm] = b.ini.split(':').map(Number);
            const slotDate = new Date();
            slotDate.setHours(hh, mm, 0, 0);
            if (slotDate <= ahora) disponible = false;
        }
        if (disponible) {
            html += `<button type="button" class="slot-pill" data-inicio="${b.ini}" data-fin="${b.fin}"
                onclick="this.parentElement.querySelectorAll('.slot-pill').forEach(el=>el.classList.remove('selected-slot'));this.classList.add('selected-slot');"
                style="border:1px solid rgba(255,255,255,0.15);background:transparent;color:#fff;border-radius:6px;padding:6px 10px;font-size:0.75rem;cursor:pointer;">${b.ini} - ${b.fin}</button>`;
        } else {
            html += `<button type="button" disabled style="border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);border-radius:6px;padding:6px 10px;font-size:0.75rem;">${b.ini} (ocupado)</button>`;
        }
    });
    html += '</div>';
    slotsDiv.innerHTML = html;
}

async function confirmarEliminarReserva(id) {
    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Cancelar reserva?',
        text: 'Se eliminara la reserva y su cobro asociado.',
        confirmButtonText: 'Si, cancelar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Volver',
        showCancelButton: true
    });

    if (!confirm.isConfirmed) return;

    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch(`/admin/reservas/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-user-id': userId }
        });
        if (res.ok) {
            const reserva = reservasData.find(r => r.id === id);
            if (reserva) generarPdfCancelacionAdmin(reserva);
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Reserva cancelada. Se descargo el comprobante.', confirmButtonColor: '#00C16E' });
            await cargarReservas();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al cancelar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

async function confirmarPago(id_cobro) {
    bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    const userId = localStorage.getItem("userId");

    // Cargar descuentos disponibles
    let descuentos = [];
    try {
        const resDesc = await fetch("/admin/descuentos", { credentials: "include", headers: { "x-user-id": userId } });
        const todos = await resDesc.json();
        descuentos = todos.filter(d => d.activo);
    } catch (e) {}

    const descuentoOptions = descuentos.map(d => `<option value="${d.id}" data-porc="${d.porcentaje_descuento}">${d.descripcion} (${d.porcentaje_descuento}%)</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Confirmar Pago',
        html: `
            <div style="text-align:left; margin-bottom:8px;">
                <label style="color:#555; font-size:0.85rem;">Aplicar descuento (opcional)</label>
                <select id="swal-descuento" class="swal2-input">
                    <option value="">Sin descuento</option>
                    ${descuentoOptions}
                </select>
            </div>
            <p id="swal-monto-final" style="color:#555; font-size:0.85rem; margin-top:8px;"></p>
        `,
        confirmButtonText: 'Confirmar Pago',
        confirmButtonColor: '#00C16E',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        focusConfirm: false,
        didOpen: () => {
            const reserva = reservasData.find(r => r.id_cobro == id_cobro);
            const monto = reserva ? parseFloat(reserva.monto) : 0;
            const select = document.getElementById('swal-descuento');
            const montoEl = document.getElementById('swal-monto-final');

            const actualizar = () => {
                const opt = select.options[select.selectedIndex];
                const porc = opt?.dataset.porc ? parseInt(opt.dataset.porc) : 0;
                const final = monto - (monto * porc / 100);
                montoEl.textContent = porc > 0
                    ? `Monto original: $${monto.toFixed(2)} → Con descuento: $${final.toFixed(2)}`
                    : `Monto a cobrar: $${monto.toFixed(2)}`;
            };

            select.addEventListener('change', actualizar);
            actualizar();
        },
        preConfirm: () => {
            const select = document.getElementById('swal-descuento');
            const opt = select.options[select.selectedIndex];
            return {
                id_descuento: select.value || null,
                porcentaje: opt?.dataset.porc ? parseInt(opt.dataset.porc) : 0
            };
        }
    });

    if (!formValues) return;

    try {
        const res = await fetch(`/admin/cobros/${id_cobro}/confirmar`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ porcentaje_descuento: formValues.porcentaje })
        });
        if (res.ok) {
            const reserva = reservasData.find(r => r.id_cobro == id_cobro);
            if (reserva) generarPdfPagoConfirmado(reserva, formValues.porcentaje);
            await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Pago confirmado. Se descargo el recibo.', confirmButtonColor: '#00C16E' });
            await cargarReservas();
        } else {
            const data = await res.json().catch(() => ({}));
            await Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al confirmar.', confirmButtonColor: '#00C16E' });
        }
    } catch (e) {
        await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
    }
}

// ==========================================
// HELPERS PDF
// ==========================================
function nroAleatorio() {
    return Math.floor(10000 + Math.random() * 90000);
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

function pdfEncabezado(doc, tipoDoc, colorTipo, nro) {
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
    doc.setTextColor(...colorTipo);
    doc.text(tipoDoc, 22, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(`Nro. ${nro}`, 22, 37);
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Emitido: ${fecha}`, 210 - 22, 37, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(22, 41, 188, 41);
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
    doc.text('Gol Ahora — comprobante generado automaticamente. Conservalo como respaldo.', 105, y + 5, { align: 'center' });
}

function generarPdfModificacionAdmin(original, nuevo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nro = nroAleatorio();

    pdfEncabezado(doc, 'MODIFICACION DE RESERVA', [21, 101, 192], nro);

    let y = 50;
    y = pdfSeccion(doc, 'Datos de la Reserva', y);
    pdfLinea(doc, 'ID Reserva', '#' + original.id, y); y += 8;
    pdfLinea(doc, 'Cancha', original.cancha, y); y += 12;

    y = pdfSeccion(doc, 'Detalle del Cambio', y);

    doc.setFillColor(255, 243, 224);
    doc.roundedRect(20, y, 78, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(180, 80, 0);
    doc.text('FECHA ANTERIOR', 24, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50);
    doc.text(original.fecha, 24, y + 13);
    doc.setFontSize(8.5); doc.setTextColor(100, 100, 100);
    doc.text(`${original.hora_inicio} — ${original.hora_fin} hs`, 24, y + 19);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(0, 193, 110);
    doc.text('→', 103, y + 14, { align: 'center' });

    doc.setFillColor(232, 245, 233);
    doc.roundedRect(112, y, 78, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(27, 94, 32);
    doc.text('NUEVA FECHA', 116, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(27, 94, 32);
    doc.text(nuevo.fecha, 116, y + 13);
    doc.setFontSize(8.5);
    doc.text(`${nuevo.hora_inicio} — ${nuevo.hora_fin} hs`, 116, y + 19);

    y += 32;
    doc.setFillColor(235, 245, 255);
    doc.roundedRect(20, y, 170, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 160);
    doc.text('Modificacion realizada por el administrador del club.', 105, y + 6, { align: 'center' });
    doc.text('El precio y la cancha no se modifican.', 105, y + 11, { align: 'center' });

    pdfPie(doc);
    doc.save(`golahora-modificacion-admin-nro${nro}.pdf`);
}

function generarPdfCancelacionAdmin(r) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nro = nroAleatorio();

    pdfEncabezado(doc, 'CANCELACION DE RESERVA', [200, 50, 50], nro);

    let y = 50;
    y = pdfSeccion(doc, 'Turno Cancelado', y);
    pdfLinea(doc, 'ID Reserva',    '#' + r.id,                              y); y += 8;
    pdfLinea(doc, 'Cliente',       `${r.cliente_nombre} ${r.cliente_apellido}`, y); y += 8;
    pdfLinea(doc, 'Email',         r.cliente_email,                         y); y += 8;
    pdfLinea(doc, 'Cancha',        r.cancha,                                y); y += 8;
    pdfLinea(doc, 'Fecha del turno', r.fecha,                               y); y += 8;
    pdfLinea(doc, 'Horario',       `${r.hora_inicio} — ${r.hora_fin} hs`,   y); y += 8;
    pdfLinea(doc, 'Monto',         `$${r.monto}`,                           y); y += 8;
    pdfLinea(doc, 'Metodo de pago', r.metodo_pago,                          y); y += 12;

    y = pdfSeccion(doc, 'Nota', y);
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(20, y, 170, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text('Reserva cancelada por el administrador del club.', 105, y + 6, { align: 'center' });
    doc.text('Para consultas, acercate a la recepcion del club.', 105, y + 11, { align: 'center' });

    pdfPie(doc);
    doc.save(`golahora-cancelacion-admin-nro${nro}.pdf`);
}

function generarPdfPagoConfirmado(r, porcentajeDescuento = 0) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const nro = nroAleatorio();

    pdfEncabezado(doc, 'RECIBO DE PAGO', [0, 150, 80], nro);

    let y = 50;
    y = pdfSeccion(doc, 'Detalle del Pago', y);
    pdfLinea(doc, 'ID Reserva',    '#' + r.id,                              y); y += 8;
    pdfLinea(doc, 'Cliente',       `${r.cliente_nombre} ${r.cliente_apellido}`, y); y += 8;
    pdfLinea(doc, 'Email',         r.cliente_email,                         y); y += 8;
    pdfLinea(doc, 'Cancha',        r.cancha,                                y); y += 8;
    pdfLinea(doc, 'Fecha del turno', r.fecha,                               y); y += 8;
    pdfLinea(doc, 'Horario',       `${r.hora_inicio} — ${r.hora_fin} hs`,   y); y += 8;

    const montoOriginal = parseFloat(r.monto);
    const descuento = montoOriginal * porcentajeDescuento / 100;
    const montoFinal = montoOriginal - descuento;

    pdfLinea(doc, 'Monto original', `$${montoOriginal.toFixed(2)}`,         y); y += 8;
    if (porcentajeDescuento > 0) {
        pdfLinea(doc, 'Descuento aplicado', `${porcentajeDescuento}% (-$${descuento.toFixed(2)})`, y); y += 8;
        pdfLinea(doc, 'Monto final',   `$${montoFinal.toFixed(2)}`,         y); y += 8;
    }
    pdfLinea(doc, 'Metodo de pago', r.metodo_pago,                          y); y += 12;

    y = pdfSeccion(doc, 'Estado', y);
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(20, y, 170, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(27, 94, 32);
    doc.text('PAGO CONFIRMADO', 105, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 70, 70);
    doc.text('El pago fue registrado en efectivo en recepcion por el administrador.', 105, y + 11, { align: 'center' });

    pdfPie(doc);
    doc.save(`golahora-recibo-pago-nro${nro}.pdf`);
}
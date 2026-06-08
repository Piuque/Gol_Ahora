document.addEventListener("DOMContentLoaded", async () => {

    const userId = localStorage.getItem("userId");
    let clientes = [];
    let tiposCanchas = [];
    let todasCanchas = [];
    let duracionCanchaMinutos = 60;
    let canchaSeleccionada = null;
    let pagoSeleccionado = null;

    const fechaInput = document.getElementById("fecha");
    fechaInput.min = fechaLocalHoy();
    const limiteMax = new Date();
    limiteMax.setMonth(limiteMax.getMonth() + 1);
    fechaInput.max = `${limiteMax.getFullYear()}-${String(limiteMax.getMonth() + 1).padStart(2, '0')}-${String(limiteMax.getDate()).padStart(2, '0')}`;

    try {
        const res = await fetch("/admin/tipos-cancha", { credentials: "include", headers: { "x-user-id": userId } });
        if (res.ok) tiposCanchas = await res.json();
        const selectTipo = document.getElementById("tipo_cancha");
        tiposCanchas.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.tipo_cancha;
            opt.dataset.duracion = t.duracion_min || 60;
            selectTipo.appendChild(opt);
        });
    } catch (e) { console.error("Error cargando tipos:", e); }

    try {
        const res = await fetch("/admin/canchas/listar", { credentials: "include", headers: { "x-user-id": userId } });
        if (res.ok) todasCanchas = await res.json();
    } catch (e) { console.error("Error cargando canchas:", e); }

    try {
        const res = await fetch("/admin/clientes", { credentials: "include", headers: { "x-user-id": userId } });
        if (res.ok) clientes = await res.json();
    } catch (e) { console.error("Error cargando clientes:", e); }

    document.getElementById("tipo_cancha").addEventListener("change", () => {
        const select = document.getElementById("tipo_cancha");
        const idTipo = select.value;
        const opt = select.options[select.selectedIndex];
        duracionCanchaMinutos = parseInt(opt?.dataset.duracion, 10) || 60;

        const selectCancha = document.getElementById("id_cancha");
        selectCancha.innerHTML = '<option value="">Seleccioná una cancha</option>';
        document.getElementById("hora_inicio").value = "";
        document.getElementById("hora_fin").value = "";
        if (!idTipo) {
            selectCancha.disabled = true;
            fechaInput.disabled = true;
            return;
        }
        const tipoNombre = tiposCanchas.find(t => t.id == idTipo)?.tipo_cancha;
        todasCanchas.filter(c => c.categoria === tipoNombre).forEach(c => {
            const optC = document.createElement("option");
            optC.value = c.id;
            optC.textContent = `${c.nombre} - $${c.precio}/turno`;
            selectCancha.appendChild(optC);
        });
        selectCancha.disabled = false;
        fechaInput.disabled = false;
        limpiarTurnos();
        actualizarResumen();
    });

    document.getElementById("id_cancha").addEventListener("change", async () => {
        const idCancha = document.getElementById("id_cancha").value;
        canchaSeleccionada = todasCanchas.find(c => c.id == idCancha) || null;
        document.getElementById("hora_inicio").value = "";
        document.getElementById("hora_fin").value = "";
        if (fechaInput.value) await cargarTurnos();
        actualizarResumen();
    });

    fechaInput.addEventListener("change", async () => {
        document.getElementById("hora_inicio").value = "";
        document.getElementById("hora_fin").value = "";
        await cargarTurnos();
        actualizarResumen();
    });

    const clienteInput = document.getElementById("cliente-input");
    const clienteSuggestions = document.getElementById("cliente-suggestions");
    const idUsuarioHidden = document.getElementById("id_usuario");

    clienteInput.addEventListener("input", () => {
        const query = clienteInput.value.toLowerCase();
        clienteSuggestions.innerHTML = "";
        idUsuarioHidden.value = "";
        if (!query) { clienteSuggestions.style.display = "none"; return; }
        const matches = clientes.filter(c =>
            `${c.nombre} ${c.apellido}`.toLowerCase().includes(query) || String(c.dni).includes(query)
        );
        if (matches.length > 0) {
            matches.forEach(c => {
                const div = document.createElement("div");
                div.textContent = `${c.nombre} ${c.apellido} - DNI: ${c.dni}`;
                div.addEventListener("click", () => {
                    clienteInput.value = `${c.nombre} ${c.apellido}`;
                    idUsuarioHidden.value = c.id_usuario;
                    clienteSuggestions.style.display = "none";
                });
                clienteSuggestions.appendChild(div);
            });
            clienteSuggestions.style.display = "block";
        } else { clienteSuggestions.style.display = "none"; }
    });

    document.addEventListener("click", (e) => {
        if (!clienteSuggestions.contains(e.target) && e.target !== clienteInput) {
            clienteSuggestions.style.display = "none";
        }
    });

    document.getElementById("btn-metodo-pago").addEventListener("click", async () => {
        const monto = obtenerMonto();
        if (!monto) {
            await Swal.fire({ icon: 'info', title: 'Completá el turno', text: 'Seleccioná cancha, fecha y turno antes de elegir el pago.', confirmButtonColor: '#00C16E' });
            return;
        }
        const resumenHtml = `<div style="font-size:0.82rem;color:rgba(255,255,255,0.65);margin-bottom:10px;">${document.getElementById('texto-resumen').textContent || ''}</div>`;
        const pago = await abrirConfirmacionPago({
            titulo: 'Registrar pago de reserva',
            resumenHtml,
            monto,
            confirmButtonText: 'Confirmar pago'
        });
        if (!pago) return;
        pagoSeleccionado = pago;
        document.getElementById("id_metodo_pago").value = pago.id_metodo_de_pago;
        document.getElementById("texto-metodo-pago").textContent = pago.nombreMetodo;
    });

    document.getElementById("form-reserva").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_usuario = idUsuarioHidden.value;
        const id_cancha = document.getElementById("id_cancha").value;
        const fecha = fechaInput.value;
        const hora_inicio = document.getElementById("hora_inicio").value;
        const hora_fin = document.getElementById("hora_fin").value;

        if (!id_usuario) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Seleccioná un cliente de la lista.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!id_cancha || !fecha || !hora_inicio || !hora_fin) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Completá cancha, fecha y turno.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!pagoSeleccionado?.id_metodo_de_pago) {
            await Swal.fire({ icon: 'error', title: 'Pago requerido', text: 'Debés seleccionar y confirmar un método de pago antes de registrar la reserva.', confirmButtonColor: '#00C16E' });
            return;
        }

        const hoyStr = fechaLocalHoy();
        if (fecha < hoyStr) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'No se puede registrar una reserva en el pasado.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (fecha === hoyStr) {
            const [h, m] = hora_inicio.split(':').map(Number);
            const horaInicioDate = new Date();
            horaInicioDate.setHours(h, m, 0, 0);
            if (horaInicioDate <= new Date()) {
                await Swal.fire({ icon: 'error', title: 'Error', text: 'No se puede reservar en un horario que ya pasó.', confirmButtonColor: '#00C16E' });
                return;
            }
        }

        const monto = obtenerMonto();
        const hi = `${hora_inicio}:00`;
        const hf = calcularHoraFin(hora_inicio, duracionCanchaMinutos);

        try {
            const res = await fetch("/admin/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": userId },
                credentials: "include",
                body: JSON.stringify({
                    id_usuario: parseInt(id_usuario, 10),
                    id_cancha: parseInt(id_cancha, 10),
                    fecha,
                    hora_inicio: hi,
                    hora_fin: hf,
                    id_metodo_de_pago: parseInt(pagoSeleccionado.id_metodo_de_pago, 10),
                    monto,
                    confirmar_pago: true
                })
            });

            const data = await res.json();

            if (res.ok) {
                generarPdfReciboAdmin({
                    id_reserva: data.id_reserva,
                    cliente: clienteInput.value,
                    cancha: canchaSeleccionada?.nombre || 'Cancha',
                    fecha,
                    hora_inicio,
                    hora_fin: hora_fin || hf.substring(0, 5),
                    monto,
                    metodo: pagoSeleccionado.nombreMetodo
                });
                await Swal.fire({ icon: 'success', title: 'Reserva confirmada', text: 'La reserva fue registrada con pago confirmado. Se descargó el recibo.', confirmButtonColor: '#00C16E' });
                resetFormulario();
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
            }
        } catch {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar con el servidor.', confirmButtonColor: '#00C16E' });
        }
    });

    function generarHorariosClub(duracionMinutos) {
        const bloques = [];
        let inicioHora = 8;
        let inicioMinuto = 0;
        while (inicioHora < 24) {
            let finMinuto = inicioMinuto + duracionMinutos;
            let finHora = inicioHora + Math.floor(finMinuto / 60);
            finMinuto = finMinuto % 60;
            if (finHora > 24 || (finHora === 24 && finMinuto > 0)) break;
            const strInicio = `${String(inicioHora).padStart(2, '0')}:${String(inicioMinuto).padStart(2, '0')}`;
            let strFin;
            if (finHora === 24) {
                strFin = '23:59';
            } else {
                strFin = `${String(finHora).padStart(2, '0')}:${String(finMinuto).padStart(2, '0')}`;
            }
            bloques.push({ horaInicio: strInicio, horaFin: strFin, rangoTexto: `${strInicio} - ${strFin} hs` });
            inicioHora = finHora;
            inicioMinuto = finMinuto;
            if (finHora === 24) break;
        }
        return bloques;
    }

    function calcularHoraFin(horaInicioStr, minutosDuracion) {
        const [h, m] = horaInicioStr.split(':').map(Number);
        let total = h * 60 + (m || 0) + minutosDuracion;
        let fh = Math.floor(total / 60);
        const fm = total % 60;
        if (fh === 24) return '23:59:59';
        return `${String(fh).padStart(2, '0')}:${String(fm).padStart(2, '0')}:00`;
    }

    async function cargarTurnos() {
        const contenedor = document.getElementById("contenedor-turnos");
        const idCancha = document.getElementById("id_cancha").value;
        const fecha = fechaInput.value;
        if (!idCancha || !fecha) {
            limpiarTurnos();
            return;
        }

        contenedor.innerHTML = '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">Cargando turnos...</div>';

        let ocupaciones = [];
        try {
            const res = await fetch(`/api/cliente/canchas/${idCancha}/ocupaciones?fecha=${fecha}`, {
                credentials: 'include',
                headers: { 'x-user-id': userId }
            });
            if (res.ok) ocupaciones = await res.json();
        } catch (e) { console.error(e); }

        const ocupadas = {};
        (Array.isArray(ocupaciones) ? ocupaciones : []).forEach(oc => {
            const h = (oc.hora_inicio || '').substring(0, 5);
            if (h) ocupadas[h] = true;
        });

        const bloques = generarHorariosClub(duracionCanchaMinutos);
        const esHoy = fecha === fechaLocalHoy();

        contenedor.innerHTML = '';
        bloques.forEach(b => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn';
            btn.textContent = b.rangoTexto;

            let disponible = true;
            if (ocupadas[b.horaInicio]) {
                disponible = false;
                btn.classList.add('ocupado');
                btn.textContent += ' (ocupado)';
            }
            if (esHoy && slotHorarioYaPaso(fecha, b.horaInicio)) {
                disponible = false;
                btn.disabled = true;
                btn.textContent = b.rangoTexto + ' (pasado)';
            }

            if (disponible) {
                btn.addEventListener('click', () => {
                    contenedor.querySelectorAll('.slot-btn.selected').forEach(el => el.classList.remove('selected'));
                    btn.classList.add('selected');
                    document.getElementById('hora_inicio').value = b.horaInicio;
                    document.getElementById('hora_fin').value = b.horaFin;
                    actualizarResumen();
                });
            } else {
                btn.disabled = true;
            }
            contenedor.appendChild(btn);
        });

        if (!contenedor.children.length) {
            contenedor.innerHTML = '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">No hay turnos disponibles.</div>';
        }
    }

    function limpiarTurnos() {
        document.getElementById("contenedor-turnos").innerHTML =
            '<div class="text-light-50 small py-3 text-center" style="grid-column:1/-1;">Seleccioná cancha y fecha para ver turnos.</div>';
    }

    function obtenerMonto() {
        return canchaSeleccionada ? parseFloat(canchaSeleccionada.precio) : 0;
    }

    function actualizarResumen() {
        const horaInicio = document.getElementById("hora_inicio").value;
        const horaFin = document.getElementById("hora_fin").value;
        const resumen = document.getElementById("resumen-precio");
        if (!canchaSeleccionada || !fechaInput.value || !horaInicio) {
            resumen.style.display = 'none';
            return;
        }
        const monto = obtenerMonto();
        document.getElementById("texto-resumen").textContent =
            `${canchaSeleccionada.nombre} · ${fechaInput.value} · ${horaInicio}${horaFin ? ' - ' + horaFin : ''} · ${formatearMontoARS(monto)}`;
        resumen.style.display = 'block';
    }

    function resetFormulario() {
        document.getElementById("form-reserva").reset();
        clienteInput.value = "";
        idUsuarioHidden.value = "";
        pagoSeleccionado = null;
        canchaSeleccionada = null;
        document.getElementById("texto-metodo-pago").textContent = "Seleccionar método de pago";
        document.getElementById("id_metodo_pago").value = "";
        document.getElementById("id_cancha").disabled = true;
        fechaInput.disabled = true;
        document.getElementById("resumen-precio").style.display = "none";
        limpiarTurnos();
    }

    function generarPdfReciboAdmin(datos) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const nro = Math.floor(10000 + Math.random() * 90000);

        doc.setFillColor(0, 193, 110);
        doc.rect(0, 0, 210, 14, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('GOL AHORA', 22, 9.5);
        doc.setFontSize(16);
        doc.setTextColor(0, 150, 80);
        doc.text('RECIBO DE PAGO / RESERVA CONFIRMADA', 22, 30);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        doc.text(`Nro. ${nro}`, 22, 37);
        doc.text(`Emitido: ${new Date().toLocaleDateString('es-AR')}`, 210 - 22, 37, { align: 'right' });

        let y = 52;
        const linea = (label, valor) => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
            doc.text(label.toUpperCase(), 22, y);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
            doc.text(String(valor || '—'), 80, y);
            y += 8;
        };

        linea('ID Reserva', '#' + datos.id_reserva);
        linea('Cliente', datos.cliente);
        linea('Cancha', datos.cancha);
        linea('Fecha', datos.fecha);
        linea('Horario', `${datos.hora_inicio} - ${datos.hora_fin} hs`);
        linea('Monto', formatearMontoARS(datos.monto));
        linea('Método de pago', datos.metodo);
        linea('Estado', 'Confirmada (pago registrado por administrador)');

        doc.save(`golahora-recibo-admin-nro${nro}.pdf`);
    }
});

document.addEventListener("DOMContentLoaded", async () => {

    const userId = localStorage.getItem("userId");
    let clientes = [];
    let tiposCanchas = [];
    let todasCanchas = [];

    // Cargar tipos de canchas
    try {
        const res = await fetch("/admin/tipos-cancha", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        tiposCanchas = await res.json();
        const selectTipo = document.getElementById("tipo_cancha");
        tiposCanchas.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.tipo_cancha;
            selectTipo.appendChild(opt);
        });
    } catch (e) { console.error("Error cargando tipos:", e); }

    // Cargar todas las canchas
    try {
        const res = await fetch("/admin/canchas/listar", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        todasCanchas = await res.json();
    } catch (e) { console.error("Error cargando canchas:", e); }

    // Cargar clientes
    try {
        const res = await fetch("/admin/clientes", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        clientes = await res.json();
    } catch (e) { console.error("Error cargando clientes:", e); }

    // Filtrar canchas por tipo
    document.getElementById("tipo_cancha").addEventListener("change", () => {
        const idTipo = document.getElementById("tipo_cancha").value;
        const selectCancha = document.getElementById("id_cancha");
        selectCancha.innerHTML = '<option value="">Seleccioná una cancha</option>';

        if (!idTipo) {
            selectCancha.disabled = true;
            return;
        }

        const tipoNombre = tiposCanchas.find(t => t.id == idTipo)?.tipo_cancha;
        const filtradas = todasCanchas.filter(c => c.categoria === tipoNombre);
        filtradas.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = `${c.nombre} - $${c.precio}/hora`;
            selectCancha.appendChild(opt);
        });
        selectCancha.disabled = false;
        calcularPrecio();
    });

    // Autocompletado clientes
    const clienteInput = document.getElementById("cliente-input");
    const clienteSuggestions = document.getElementById("cliente-suggestions");
    const idUsuarioHidden = document.getElementById("id_usuario");

    clienteInput.addEventListener("input", () => {
        const query = clienteInput.value.toLowerCase();
        clienteSuggestions.innerHTML = "";
        idUsuarioHidden.value = "";
        if (!query) { clienteSuggestions.style.display = "none"; return; }

        const matches = clientes.filter(c =>
            `${c.nombre} ${c.apellido}`.toLowerCase().includes(query) ||
            c.dni.includes(query)
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
        } else {
            clienteSuggestions.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!clienteSuggestions.contains(e.target) && e.target !== clienteInput) {
            clienteSuggestions.style.display = "none";
        }
    });

    // Hora fin automática
    document.getElementById("hora_inicio").addEventListener("change", () => {
        const horaInicio = document.getElementById("hora_inicio").value;
        if (!horaInicio) return;
        const [h] = horaInicio.split(":").map(Number);
        const horaFin = ((h + 1) % 24).toString().padStart(2, "0") + ":00";
        document.getElementById("hora_fin").value = horaFin;
        calcularPrecio();
    });

    function calcularPrecio() {
        const horaInicio = document.getElementById("hora_inicio").value;
        const horaFin = document.getElementById("hora_fin").value;
        const idCancha = document.getElementById("id_cancha").value;
        if (!horaInicio || !horaFin || !idCancha) return;

        const cancha = todasCanchas.find(c => c.id == idCancha);
        if (!cancha) return;

        const monto = parseFloat(cancha.precio);
        document.getElementById("texto-resumen").textContent = `${cancha.nombre} · ${horaInicio} - ${horaFin} · $${monto.toFixed(2)}`;
        document.getElementById("resumen-precio").style.display = "block";
    }

    document.getElementById("id_cancha").addEventListener("change", calcularPrecio);

    // Envío del formulario
    document.getElementById("form-reserva").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_usuario = idUsuarioHidden.value;
        const id_cancha = document.getElementById("id_cancha").value;
        const fecha = document.getElementById("fecha").value;
        const hora_inicio = document.getElementById("hora_inicio").value;
        const hora_fin = document.getElementById("hora_fin").value;
        const id_metodo_pago = document.getElementById("id_metodo_pago").value;

        if (!id_usuario) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona un cliente de la lista.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!id_cancha) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona una cancha.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!hora_inicio || !hora_fin) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona una hora de inicio.', confirmButtonColor: '#00C16E' });
            return;
        }

        try {
            console.log("Datos reserva:", { idCliente: parseInt(id_usuario), idCancha: parseInt(id_cancha), fecha, horaInicio: hora_inicio, horaFin: hora_fin });
            const res = await fetch("/cliente/reservas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": id_usuario
                },
                credentials: "include",
                body: JSON.stringify({
                    idCliente: parseInt(id_usuario),
                    idCancha: parseInt(id_cancha),
                    fecha,
                    horaInicio: hora_inicio,
                    horaFin: hora_fin
                })
            });

            const data = await res.json();

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Reserva registrada!',
                    text: 'La reserva fue creada correctamente.',
                    confirmButtonColor: '#00C16E'
                });
                document.getElementById("form-reserva").reset();
                clienteInput.value = "";
                idUsuarioHidden.value = "";
                document.getElementById("hora_fin").value = "";
                document.getElementById("resumen-precio").style.display = "none";
                document.getElementById("id_cancha").disabled = true;
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: data.message || data.error, confirmButtonColor: '#00C16E' });
            }

        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar con el servidor.', confirmButtonColor: '#00C16E' });
        }
    });
});
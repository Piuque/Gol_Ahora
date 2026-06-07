document.addEventListener("DOMContentLoaded", async () => {

    const userId = localStorage.getItem("userId");
    const tipoInput = document.getElementById("id_tipo_cancha");
    const tipoHidden = document.getElementById("id_tipo_cancha_hidden");
    const tipoSuggestions = document.getElementById("tipo_cancha-suggestions");
    let tipos = [];

    try {
        const res = await fetch("/admin/tipos-cancha", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        tipos = await res.json();
    } catch (e) {
        console.error("Error cargando tipos de cancha", e);
    }

    tipoInput.addEventListener("input", () => {
        const query = tipoInput.value.toLowerCase();
        tipoSuggestions.innerHTML = "";
        tipoHidden.value = "";
        if (!query) { tipoSuggestions.style.display = "none"; return; }
        const matches = tipos.filter(t => t.tipo_cancha.toLowerCase().includes(query));
        if (matches.length > 0) {
            matches.forEach(t => {
                const div = document.createElement("div");
                div.textContent = t.tipo_cancha;
                div.addEventListener("click", () => {
                    tipoInput.value = t.tipo_cancha;
                    tipoHidden.value = t.id;
                    tipoSuggestions.style.display = "none";
                });
                tipoSuggestions.appendChild(div);
            });
            tipoSuggestions.style.display = "block";
        } else {
            tipoSuggestions.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!tipoSuggestions.contains(e.target) && e.target !== tipoInput) {
            tipoSuggestions.style.display = "none";
        }
    });

    document.getElementById("cancha-formulario").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_tipo = parseInt(tipoHidden.value);
        if (!id_tipo) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona un tipo de cancha de la lista.', confirmButtonColor: '#00C16E' });
            return;
        }

        const datos = {
            nombre: document.getElementById("nombre").value,
            tiempo_cancelacion: parseInt(document.getElementById("tiempo_cancelacion").value),
            precio_hora_reserva: parseFloat(document.getElementById("precio_hora_reserva").value),
            id_tipo_de_cancha: id_tipo
        };

        try {
            const res = await fetch("/admin/canchas/registrar", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": userId },
                credentials: "include",
                body: JSON.stringify(datos)
            });

            const data = await res.json();

            if (res.ok) {
                await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Cancha registrada correctamente.', confirmButtonColor: '#00C16E' });
                document.getElementById("cancha-formulario").reset();
                tipoInput.value = "";
                tipoHidden.value = "";
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
            }
        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
        }
    });
});
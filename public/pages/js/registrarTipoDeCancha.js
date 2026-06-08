document.addEventListener("DOMContentLoaded", async () => {

    // Cargar superficies
    const superficieInput = document.getElementById("id_superficie");
    const superficieHidden = document.getElementById("id_superficie_hidden");
    const superficieSuggestions = document.getElementById("id_superficie-suggestions");
    let superficies = [];

    try {
        const res = await fetch("/api/superficies");
        superficies = await res.json();
    } catch (e) {}

    superficieInput.addEventListener("input", () => {
        const query = superficieInput.value.toLowerCase();
        superficieSuggestions.innerHTML = "";
        superficieHidden.value = "";
        if (!query) { superficieSuggestions.style.display = "none"; return; }
        const matches = superficies.filter(s => s.tipo_superficie.toLowerCase().includes(query));
        if (matches.length > 0) {
            matches.forEach(s => {
                const div = document.createElement("div");
                div.textContent = s.tipo_superficie;
                div.addEventListener("click", () => {
                    superficieInput.value = s.tipo_superficie;
                    superficieHidden.value = s.id_superficie;
                    superficieSuggestions.style.display = "none";
                });
                superficieSuggestions.appendChild(div);
            });
            superficieSuggestions.style.display = "block";
        } else {
            superficieSuggestions.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!superficieSuggestions.contains(e.target) && e.target !== superficieInput) {
            superficieSuggestions.style.display = "none";
        }
    });

    document.getElementById("tipo-cancha-formulario").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_superficie = parseInt(superficieHidden.value);
        if (!id_superficie) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona un tipo de superficie.', confirmButtonColor: '#00C16E' });
            return;
        }

        const datos = {
            tipo_cancha: document.querySelector('[name="tipo_cancha"]').value,
            ancho: parseFloat(document.querySelector('[name="ancho"]').value),
            largo: parseFloat(document.querySelector('[name="largo"]').value),
            capacidad: parseInt(document.querySelector('[name="capacidad"]').value),
            duracion_min: parseInt(document.querySelector('[name="duracion_reserva"]').value),
            duracion_max: parseInt(document.querySelector('[name="duracion_reserva"]').value),
            id_superficie
        };

        if (datos.capacidad <= 0) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La capacidad debe ser mayor a 0.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (datos.ancho <= 0 || datos.largo <= 0) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Ancho y largo deben ser mayores a 0.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (datos.duracion_min <= 0) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La duración debe ser mayor a 0.', confirmButtonColor: '#00C16E' });
            return;
        }

        try {
            const userId = localStorage.getItem("userId");
            const res = await fetch("/admin/tipos-cancha", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": userId },
                credentials: "include",
                body: JSON.stringify(datos)
            });

            const data = await res.json();

            if (res.ok) {
                await Swal.fire({ icon: 'success', title: 'Listo!', text: 'Tipo de cancha registrado correctamente.', confirmButtonColor: '#00C16E' });
                document.getElementById("tipo-cancha-formulario").reset();
                superficieInput.value = "";
                superficieHidden.value = "";
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
            }
        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
        }
    });
});
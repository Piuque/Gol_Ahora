const mensajeError = document.querySelector(".error");

document.addEventListener("DOMContentLoaded", async () => {
    const superficieInput = document.getElementById("id_superficie");
    const superficieHidden = document.getElementById("id_superficie_hidden");
    const suggestionsBox = document.getElementById("id_superficie-suggestions");
    const formulario = document.getElementById("tipo-cancha-formulario");

    let superficies = [];

    // Cargar superficies desde la API
    try {
        const response = await fetch("/api/superficies");
        superficies = await response.json();
    } catch (error) {
        console.error("Error al cargar superficies:", error);
    }

    // Autocompletado de superficie
    superficieInput.addEventListener("input", () => {
        const query = superficieInput.value.toLowerCase();
        suggestionsBox.innerHTML = "";
        superficieHidden.value = "";

        if (query.length === 0) {
            suggestionsBox.style.display = "none";
            return;
        }

        const matches = superficies.filter(s =>
            s.tipo_superficie.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            matches.forEach(s => {
                const div = document.createElement("div");
                div.textContent = s.tipo_superficie;
                div.addEventListener("click", () => {
                    superficieInput.value = s.tipo_superficie;
                    superficieHidden.value = s.id;
                    suggestionsBox.style.display = "none";
                });
                suggestionsBox.appendChild(div);
            });
            suggestionsBox.style.display = "block";
        } else {
            suggestionsBox.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!suggestionsBox.contains(e.target) && e.target !== superficieInput) {
            suggestionsBox.style.display = "none";
        }
    });

    // Envío del formulario
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("id_superficie:", superficieHidden.value);
        if (!superficieHidden.value) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Seleccioná un tipo de superficie válido de la lista.',
                confirmButtonColor: '#00C16E'
            });
            return;
        }

        const formData = new FormData(formulario);

        try {
            const response = await fetch("/api/tipos_cancha/agregar", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Listo!',
                    text: `Tipo de cancha registrado correctamente.`,
                    confirmButtonColor: '#00C16E'
                });
                formulario.reset();
                superficieInput.value = "";
                superficieHidden.value = "";
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Ocurrió un error al registrar.',
                    confirmButtonColor: '#00C16E'
                });
            }

        } catch (error) {
            console.error("Error:", error);
            await Swal.fire({
                icon: 'error',
                title: 'Error de red',
                text: 'No se pudo conectar con el servidor.',
                confirmButtonColor: '#00C16E'
            });
        }
    });
});
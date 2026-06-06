document.addEventListener("DOMContentLoaded", async () => {

    let generos = [];
    let paises = [];

    try {
        const res = await fetch("/api/generos");
        generos = await res.json();
    } catch (e) {}

    try {
        const res = await fetch("/api/paises");
        paises = await res.json();
    } catch (e) {}

    function setupAutocompletado(inputId, suggestionsId, data) {
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        input.addEventListener("input", () => {
            const query = input.value.toLowerCase();
            suggestions.innerHTML = "";
            if (!query) { suggestions.style.display = "none"; return; }
            const matches = data.filter(d => d.toLowerCase().includes(query));
            if (matches.length > 0) {
                matches.forEach(d => {
                    const div = document.createElement("div");
                    div.textContent = d;
                    div.addEventListener("click", () => { input.value = d; suggestions.style.display = "none"; });
                    suggestions.appendChild(div);
                });
                suggestions.style.display = "block";
            } else { suggestions.style.display = "none"; }
        });
    }

    setupAutocompletado("genero", "genero-suggestions", generos);
    setupAutocompletado("nacionalidad", "nacionalidad-suggestions", paises);
    setupAutocompletado("pais", "pais-suggestions", paises);

    document.addEventListener("click", (e) => {
        document.querySelectorAll(".suggestions").forEach(s => {
            if (!s.contains(e.target)) s.style.display = "none";
        });
    });

    document.getElementById("register-form-profesional").addEventListener("submit", async (e) => {
        e.preventDefault();

        const user_level = document.getElementById("user_level").value;
        const matricula = document.getElementById("matricula").value;
        const fecha_caducidad = document.getElementById("fecha_caducidad").value;
        const link_archivo = document.getElementById("link_archivo").value;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const caducidad = new Date(fecha_caducidad);
        if (caducidad <= hoy) {
            await Swal.fire({ icon: 'error', title: 'Certificacion vencida', text: 'La fecha de caducidad debe ser futura.', confirmButtonColor: '#00C16E' });
            return;
        }

        const fechaNac = new Date(document.getElementById("fecha_nacimiento").value);
        const edad = Math.floor((hoy - fechaNac) / (365.25 * 24 * 60 * 60 * 1000));
        if (edad < 18) {
            await Swal.fire({ icon: 'error', title: 'Edad invalida', text: 'El profesional debe ser mayor de 18 años.', confirmButtonColor: '#00C16E' });
            return;
        }

        const datos = {
            nombre: document.getElementById("nombre").value,
            apellido: document.getElementById("apellido").value,
            dni: document.getElementById("dni").value,
            fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
            email: document.getElementById("email").value,
            telefono: document.getElementById("telefono").value,
        };

        try {
            const userId = localStorage.getItem("userId");
            const endpoint = user_level === "10" ? "/admin/profesores" : "/admin/entrenadores";

            const resUsuario = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                credentials: "include",
                body: JSON.stringify({
                    username: datos.email.split('@')[0],
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    email: datos.email,
                    password: "Unaj2026@golahora",
                    dni: datos.dni,
                    telefono: datos.telefono,
                    fecha_nacimiento: datos.fecha_nacimiento
                })
            });

            const dataUsuario = await resUsuario.json();

            if (!resUsuario.ok) {
                await Swal.fire({ icon: 'error', title: 'Error', text: dataUsuario.error || 'Error al registrar', confirmButtonColor: '#00C16E' });
                return;
            }

            // Registrar certificacion
            const idNuevoUsuario = dataUsuario.id;
            const certEndpoint = user_level === "10" ? `/admin/profesores/${idNuevoUsuario}/certificaciones` : `/admin/entrenadores/${idNuevoUsuario}/certificaciones`;

            await fetch(certEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                credentials: "include",
                body: JSON.stringify({ matricula, fecha_caducidad, link_archivo })
            });

            await Swal.fire({
                icon: 'success',
                title: 'Profesional registrado!',
                html: `El profesional fue registrado correctamente.<br><br>
                       <b>Contrasena por defecto:</b><br>
                       <code style="background:#0d1f33; color:#00C16E; padding:4px 8px; border-radius:4px;">Unaj2026@golahora</code>`,
                confirmButtonColor: '#00C16E'
            });
            document.getElementById("register-form-profesional").reset();

        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
        }
    });
});
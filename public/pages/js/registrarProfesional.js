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

    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,}$/;

    document.getElementById("register-form-profesional").addEventListener("submit", async (e) => {
        e.preventDefault();

        const user_level = document.getElementById("user_level").value;
        const matricula = document.getElementById("matricula").value.trim();
        const fecha_caducidad = document.getElementById("fecha_caducidad").value;
        const fileInput = document.getElementById("cert-archivo");
        const file = fileInput.files[0];

        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const dni = document.getElementById("dni").value.trim();
        const fecha_nacimiento = document.getElementById("fecha_nacimiento").value;
        const email = document.getElementById("email").value.trim();
        const telefono = document.getElementById("telefono").value.trim();

        // Validaciones
        if (!soloLetras.test(nombre)) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El nombre debe tener al menos 3 letras y no puede contener caracteres especiales.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!soloLetras.test(apellido)) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El apellido debe tener al menos 3 letras y no puede contener caracteres especiales.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!/^\d{7,8}$/.test(dni)) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El DNI debe tener 7 u 8 dígitos sin puntos ni espacios.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!fecha_nacimiento) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La fecha de nacimiento es obligatoria.', confirmButtonColor: '#00C16E' });
            return;
        }

        const hoyStr = new Date().toISOString().split('T')[0];
        const hace100Str = new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0];
        if (fecha_nacimiento >= hoyStr) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La fecha de nacimiento no puede ser hoy ni en el futuro.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (fecha_nacimiento < hace100Str) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La fecha de nacimiento no puede ser hace más de 100 años.', confirmButtonColor: '#00C16E' });
            return;
        }

        // Validar edad mínima 18 años
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaNacDate = new Date(fecha_nacimiento);
        const edad = Math.floor((hoy - fechaNacDate) / (365.25 * 24 * 60 * 60 * 1000));
        if (edad < 18) {
            await Swal.fire({ icon: 'error', title: 'Edad inválida', text: 'El profesional debe ser mayor de 18 años.', confirmButtonColor: '#00C16E' });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El email no tiene un formato válido.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!/^\d{7,15}$/.test(telefono.replace(/\s/g, ''))) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El teléfono debe tener entre 7 y 15 dígitos.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!matricula || matricula.length < 3) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La matrícula debe tener al menos 3 caracteres.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!fecha_caducidad) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La fecha de caducidad es obligatoria.', confirmButtonColor: '#00C16E' });
            return;
        }
        const caducidad = new Date(fecha_caducidad);
        if (caducidad <= hoy) {
            await Swal.fire({ icon: 'error', title: 'Certificación vencida', text: 'La fecha de caducidad debe ser futura.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!file) {
            await Swal.fire({ icon: 'error', title: 'Archivo faltante', text: 'Por favor, adjuntá el comprobante digital.', confirmButtonColor: '#00C16E' });
            return;
        }

        if (!document.getElementById("calle").value.trim() || document.getElementById("calle").value.trim().length < 3) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La calle debe tener al menos 3 caracteres.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!/^\d{1,6}$/.test(document.getElementById("numero").value.trim())) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El número de calle debe ser numérico y tener entre 1 y 6 dígitos.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (document.getElementById("pais").value.trim() && !soloLetras.test(document.getElementById("pais").value.trim())) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'El país no puede contener caracteres especiales y debe tener al menos 3 letras.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (document.getElementById("provincia").value.trim() && !soloLetras.test(document.getElementById("provincia").value.trim())) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La provincia no puede contener caracteres especiales y debe tener al menos 3 letras.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (document.getElementById("ciudad").value.trim() && !soloLetras.test(document.getElementById("ciudad").value.trim())) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La ciudad no puede contener caracteres especiales y debe tener al menos 3 letras.', confirmButtonColor: '#00C16E' });
            return;
        }
        if (!document.getElementById("localidad").value.trim() || !soloLetras.test(document.getElementById("localidad").value.trim())) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La localidad es obligatoria, debe tener al menos 3 letras y no puede contener caracteres especiales.', confirmButtonColor: '#00C16E' });
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const link_archivo = reader.result;

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
                    username: email.split('@')[0],
                    nombre,
                    apellido,
                    email,
                    password: "Unaj2026@golahora",
                    dni,
                    telefono,
                    fecha_nacimiento,
                    calle: document.getElementById("calle").value.trim(),
                    numero: document.getElementById("numero").value.trim(),
                    codigo_postal: document.getElementById("codigo_postal").value.trim(),
                    localidad: document.getElementById("localidad").value.trim()
                })
                });

                const dataUsuario = await resUsuario.json();

                if (!resUsuario.ok) {
                    await Swal.fire({ icon: 'error', title: 'Error', text: dataUsuario.error || 'Error al registrar', confirmButtonColor: '#00C16E' });
                    return;
                }

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
                           <b>Contraseña por defecto:</b><br>
                           <code style="background:#0d1f33; color:#00C16E; padding:4px 8px; border-radius:4px;">Unaj2026@golahora</code>`,
                    confirmButtonColor: '#00C16E'
                });
                document.getElementById("register-form-profesional").reset();

            } catch (error) {
                await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
            }
        };
        reader.readAsDataURL(file);
    });
});
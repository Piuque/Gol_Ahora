document.addEventListener("DOMContentLoaded", async () => {

    // Autocompletado genero
    const generoInput = document.getElementById("genero");
    const generoSuggestions = document.getElementById("genero-suggestions");
    let generos = [];
    try {
        const res = await fetch("/api/generos");
        generos = await res.json();
    } catch (e) {}

    generoInput.addEventListener("input", () => {
        const query = generoInput.value.toLowerCase();
        generoSuggestions.innerHTML = "";
        if (!query) { generoSuggestions.style.display = "none"; return; }
        const matches = generos.filter(g => g.toLowerCase().includes(query));
        if (matches.length > 0) {
            matches.forEach(g => {
                const div = document.createElement("div");
                div.textContent = g;
                div.addEventListener("click", () => { generoInput.value = g; generoSuggestions.style.display = "none"; });
                generoSuggestions.appendChild(div);
            });
            generoSuggestions.style.display = "block";
        } else { generoSuggestions.style.display = "none"; }
    });

    // Autocompletado nacionalidad
    const nacionalidadInput = document.getElementById("nacionalidad");
    const nacionalidadSuggestions = document.getElementById("nacionalidad-suggestions");
    let paises = [];
    try {
        const res = await fetch("/api/paises");
        paises = await res.json();
    } catch (e) {}

    nacionalidadInput.addEventListener("input", () => {
        const query = nacionalidadInput.value.toLowerCase();
        nacionalidadSuggestions.innerHTML = "";
        if (!query) { nacionalidadSuggestions.style.display = "none"; return; }
        const matches = paises.filter(p => p.toLowerCase().includes(query));
        if (matches.length > 0) {
            matches.forEach(p => {
                const div = document.createElement("div");
                div.textContent = p;
                div.addEventListener("click", () => { nacionalidadInput.value = p; nacionalidadSuggestions.style.display = "none"; });
                nacionalidadSuggestions.appendChild(div);
            });
            nacionalidadSuggestions.style.display = "block";
        } else { nacionalidadSuggestions.style.display = "none"; }
    });

    // Autocompletado pais
    const paisInput = document.getElementById("pais");
    const paisSuggestions = document.getElementById("pais-suggestions");
    paisInput.addEventListener("input", () => {
        const query = paisInput.value.toLowerCase();
        paisSuggestions.innerHTML = "";
        if (!query) { paisSuggestions.style.display = "none"; return; }
        const matches = paises.filter(p => p.toLowerCase().includes(query));
        if (matches.length > 0) {
            matches.forEach(p => {
                const div = document.createElement("div");
                div.textContent = p;
                div.addEventListener("click", () => { paisInput.value = p; paisSuggestions.style.display = "none"; });
                paisSuggestions.appendChild(div);
            });
            paisSuggestions.style.display = "block";
        } else { paisSuggestions.style.display = "none"; }
    });

    // Cerrar sugerencias al clickear fuera
    document.addEventListener("click", (e) => {
        [generoSuggestions, nacionalidadSuggestions, paisSuggestions].forEach(s => {
            if (!s.contains(e.target)) s.style.display = "none";
        });
    });

    // Envío del formulario
    document.getElementById("register-form-admin").addEventListener("submit", async (e) => {
        e.preventDefault();

        const datos = {
            nombre: document.getElementById("nombre").value,
            apellido: document.getElementById("apellido").value,
            dni: document.getElementById("dni").value,
            fecha_nacimiento: document.getElementById("fecha_nacimiento").value,
            email: document.getElementById("email").value,
            telefono: document.getElementById("telefono").value,
            genero: document.getElementById("genero").value,
            nacionalidad: document.getElementById("nacionalidad").value,
            user_level: document.getElementById("user_level").value,
            calle: document.getElementById("calle").value,
            numero: document.getElementById("numero").value,
            codigo_postal: document.getElementById("codigo_postal").value,
            pais: document.getElementById("pais").value,
            provincia: document.getElementById("provincia").value,
            ciudad: document.getElementById("ciudad").value,
            localidad: document.getElementById("localidad").value
        };
        
        try {
            console.log("Datos a enviar:", datos);
            const res = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "plataform": "admin"
                },
                credentials: "include",
                body: JSON.stringify(datos)
            });

            const data = await res.json();

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Listo!',
                    text: 'Usuario registrado correctamente.',
                    confirmButtonColor: '#00C16E'
                });
                document.getElementById("register-form-admin").reset();
            } else {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Usuario registrado!',
                    html: `El usuario fue creado correctamente.<br><br>
                        <b>Contraseña por defecto:</b><br>
                        <code style="background:#0d1f33; color:#00C16E; padding:4px 8px; border-radius:4px;">Unaj2026@golahora</code><br><br>
                        <small class="text-muted">El usuario deberá cambiarla al primer inicio de sesión.</small>`,
                    confirmButtonColor: '#00C16E'
                });
            }

        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error de red',
                text: 'No se pudo conectar con el servidor.',
                confirmButtonColor: '#00C16E'
            });
        }
    });
});
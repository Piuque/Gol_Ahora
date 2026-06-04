document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const errorEl = document.getElementById("mensaje-error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.classList.add("escondido");

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        try {
            const res = await fetch("/api/usuario/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "plataform": "web"
                },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                // Guardar datos del usuario en localStorage
                localStorage.setItem("userId", data.usuario.id_usuario);
                localStorage.setItem("role", data.usuario.role);
                localStorage.setItem("username", data.usuario.username);

                // Guardar en cookies para que se envíen con credenciales y sean leídas por el backend
                document.cookie = `x-user-id=${data.usuario.id_usuario}; path=/; max-age=86400`;
                document.cookie = `userId=${data.usuario.id_usuario}; path=/; max-age=86400`;
                document.cookie = `role=${data.usuario.role}; path=/; max-age=86400`;

                await Swal.fire({
                    icon: 'success',
                    title: '¡Sesión Iniciada!',
                    text: `Bienvenido, ${data.usuario.nombre || data.usuario.username}`,
                    confirmButtonColor: '#00C16E'
                });

                // Redirección inteligente basada en el rol
                if (data.usuario.role === 'admin') {
                    window.location.href = "/pages/registrarCancha.html";
                } else {
                    // Si es un cliente común, podemos enviarlo al inicio de Swagger o al registro
                    window.location.href = "/pages/registro.html";
                }
            } else {
                errorEl.textContent = data.details || data.error || "Credenciales incorrectas";
                errorEl.classList.remove("escondido");
            }
        } catch (err) {
            console.error(err);
            errorEl.textContent = "Error al conectar con el servidor";
            errorEl.classList.remove("escondido");
        }
    });
});

const mensajeError = document.getElementsByClassName("error")[0];

// ==========================================
// FUNCIÓN PARA LEER COOKIES DEL NAVEGADOR
// ==========================================
function obtenerCookie(nombre) {
    const valor = `; ${document.cookie}`;
    const partes = valor.split(`; ${nombre}=`);
    if (partes.length === 2) return partes.pop().split(';').shift();
    return null;
}

document.addEventListener("DOMContentLoaded", async () => {
    const selectTipoCancha = document.getElementById("id_tipo_de_cancha");
    const formulario = document.getElementById("cancha-formulario");

    // ==========================================
    // CARGAR TIPOS DE CANCHAS DESDE LA API Y POPULAR EL SELECT
    // ==========================================
    try {
        const response = await fetch("/api/usuario/tipos-cancha");
        const tiposCanchas = await response.json();
        
        tiposCanchas.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.categoria;
            selectTipoCancha.appendChild(opt);
        });
    } catch (error) {
        console.error("Error al cargar tipos de canchas:", error);
    }

    // ==========================================
    // ENVÍO DEL FORMULARIO 
    // ==========================================
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            mensajeError.classList.add("escondido");

            // 1. Extraemos el token directo de la sesión real de tu navegador
            let token = obtenerCookie("X-Auth-Token");

            // Ajustamos el prefijo si la cookie pura no lo incluye
            if (token && !token.startsWith("jwt=")) {
                token = `jwt=${token}`;
            }

            // 2. Mapeamos el Request Body en JSON respetando la nomenclatura de tu Swagger
            const datosCancha = {
                nombre: document.getElementById("nombre").value.trim(),
                tiempo_cancelacion: parseInt(document.getElementById("tiempo_cancelacion").value, 10),
                precio_hora_reserva: parseFloat(document.getElementById("precio_hora_reserva").value),
                id_tipo_de_cancha: parseInt(selectTipoCancha.value, 10) 
            };

            const cabeceras = {
                "Content-Type": "application/json",
                "plataform": "web"
            };

            if (token) {
                cabeceras["X-Auth-Token"] = token;
            }

            const res = await fetch("/api/admin/canchas/registrar", {
                method: "POST",
                headers: cabeceras,
                credentials: "include", // Envía automáticamente las cookies de sesión persistentes
                body: JSON.stringify(datosCancha)
            });

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Listo!',
                    text: 'Cancha registrada correctamente.',
                    confirmButtonColor: '#00C16E'
                });
                formulario.reset();
            } else {
                const errorData = await res.json().catch(() => ({}));
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorData.message || `Error del servidor (${res.status})`,
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

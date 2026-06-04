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
    const tipoCanchaInput = document.getElementById("id_tipo_cancha");
    const tipoCanchaHidden = document.getElementById("id_tipo_cancha_hidden");
    const suggestionsBox = document.getElementById("tipo_cancha-suggestions");
    const formulario = document.getElementById("cancha-formulario");

    let tiposCanchas = [];

    // ==========================================
    // CARGAR TIPOS DE CANCHAS DESDE LA API
    // ==========================================
    try {
        const response = await fetch("/api/usuario/tipos-cancha");
        tiposCanchas = await response.json();
    } catch (error) {
        console.error("Error al cargar tipos de canchas:", error);
    }

    // ==========================================
    // AUTOCOMPLETADO TIPO DE CANCHA
    // ==========================================
    tipoCanchaInput.addEventListener("input", () => {
        const query = tipoCanchaInput.value.toLowerCase();
        suggestionsBox.innerHTML = "";
        tipoCanchaHidden.value = ""; 

        if (query.length === 0) {
            suggestionsBox.style.display = "none";
            return;
        }

        const matches = tiposCanchas.filter(t =>
            t.categoria.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            matches.forEach(t => {
                const div = document.createElement("div");
                div.textContent = t.categoria;
                div.classList.add("sugerencia-item");
                
                div.addEventListener("click", () => {
                    tipoCanchaInput.value = t.categoria; 
                    tipoCanchaHidden.value = t.id;        
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
        if (!suggestionsBox.contains(e.target) && e.target !== tipoCanchaInput) {
            suggestionsBox.style.display = "none";
        }
    });

    // ==========================================
    // ENVÍO DEL FORMULARIO 
    // ==========================================
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Si el hidden quedó vacío, validamos si lo escrito coincide textualmente con un Tipo de Cancha válido
        if (!tipoCanchaHidden.value) {
            const textoEscrito = tipoCanchaInput.value.trim().toLowerCase();
            const coincidenciaExacta = tiposCanchas.find(t => t.categoria.toLowerCase() === textoEscrito);
            
            if (coincidenciaExacta) {
                tipoCanchaHidden.value = coincidenciaExacta.id;
            } else {
                mensajeError.textContent = "Por favor, seleccioná un Tipo de Cancha válido de la lista de sugerencias.";
                mensajeError.classList.remove("escondido");
                return;
            }
        }

        try {
            mensajeError.classList.add("escondido");

            // 1. Extraemos el token directo de la sesión real de tu navegador
            let token = obtenerCookie("X-Auth-Token");

            // Ajustamos el prefijo si la cookie pura no lo incluye
            if (token && !token.startsWith("jwt=")) {
                token = `jwt=${token}`;
            }

            // 2. Mapeamos el Request Body en JSON respetando la nomenclatura de tu Swagger (id_tipo_de_cancha)
            const datosCancha = {
                nombre: document.getElementById("nombre").value.trim(),
                tiempo_cancelacion: parseInt(document.getElementById("tiempo_cancelacion").value, 10),
                precio_hora_reserva: parseFloat(document.getElementById("precio_hora_reserva").value),
                id_tipo_de_cancha: parseInt(tipoCanchaHidden.value, 10) 
            };

            const cabeceras = {
                "Content-Type": "application/json",
                "plataform": "web"
            };

            if (token) {
                cabeceras["X-Auth-Token"] = token;
            }

            const res = await fetch("/api/admin/canchas", {
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
                tipoCanchaInput.value = "";
                tipoCanchaHidden.value = "";
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
})});

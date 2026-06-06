const mensajeError = document.getElementsByClassName("error")[0];

// ==========================================
// LOGIN PARA OBTENER TOKEN
// ==========================================
async function obtenerToken() {
    const res = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "plataform": "web"
        },
        credentials: "include",
        body: JSON.stringify({
            email: "administrador@golahora.com",
            password: "Unaj2026@golahora"
        })
    });
    const data = await res.json();
    return data.token;
}

// ==========================================
// BUSCAR CLIENTE POR ID
// ==========================================
document.getElementById("btn-buscar").addEventListener("click", async () => {
    const id = document.getElementById("input-id").value;

    if (!id) {
        mensajeError.textContent = "Por favor ingresá un ID válido.";
        mensajeError.classList.remove("escondido");
        return;
    }

    try {
        mensajeError.classList.add("escondido");

        const token = await obtenerToken();

        const res = await fetch(`/api/users/user_id=${id}/full_info`, {
            method: "GET",
            headers: {
                "plataform": "web",
                "Authorization": "Bearer " + token  // ← cambiá X-Auth-Token por esto
            },
            credentials: "include"
        });

        if (res.ok) {
            const cliente = await res.json();

            // Formateamos las fechas
            const fechaNac = new Date(cliente.fecha_nacimiento).toLocaleDateString("es-AR");
            const fechaReg = new Date(cliente.fecha_registro).toLocaleDateString("es-AR");

            // Llenamos la tabla con los datos
            document.getElementById("r-username").textContent = cliente.username;
            document.getElementById("r-nombre").textContent = cliente.nombre;
            document.getElementById("r-apellido").textContent = cliente.apellido;
            document.getElementById("r-dni").textContent = cliente.dni;
            document.getElementById("r-nacionalidad").textContent = cliente.nacionalidad;
            document.getElementById("r-genero").textContent = cliente.genero;
            document.getElementById("r-fecha_nacimiento").textContent = fechaNac;
            document.getElementById("r-email").textContent = cliente.email;
            document.getElementById("r-telefono").textContent = cliente.telefono;
            document.getElementById("r-fecha_registro").textContent = fechaReg;
            document.getElementById("r-calle").textContent = cliente.calle;
            document.getElementById("r-numero").textContent = cliente.numero;
            document.getElementById("r-codigo_postal").textContent = cliente.codigo_postal;
            document.getElementById("r-localidad").textContent = cliente.localidad;
            document.getElementById("r-ciudad").textContent = cliente.ciudad;
            document.getElementById("r-provincia").textContent = cliente.provincia;
            document.getElementById("r-pais").textContent = cliente.pais;
            document.getElementById("r-club").textContent = cliente.club;
            document.getElementById("r-user_level").textContent = cliente.user_level;

            // Mostramos la tabla
            document.getElementById("resultado-cliente").style.display = "block";

        } else {
            const errorData = await res.json().catch(() => ({}));
            mensajeError.textContent = errorData.message || `Error: ${res.status}`;
            mensajeError.classList.remove("escondido");
            document.getElementById("resultado-cliente").style.display = "none";
        }

    } catch (error) {
        console.error("Error:", error);
        mensajeError.textContent = "Hubo un problema de red al conectar con el servidor.";
        mensajeError.classList.remove("escondido");
    }
});

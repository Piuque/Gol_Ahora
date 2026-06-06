const API_LOGIN = "http://localhost:3000/login";

document.getElementById("login").addEventListener("submit", async (evento) => {
    evento.preventDefault(); 

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    try {
        const Respuesta = await fetch(API_LOGIN, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "plataform":"web"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })   
        });

        if (!Respuesta.ok) {
            throw new Error("El correo o la contraseña son incorrectos.");
        }
        
        const datos = await Respuesta.json();
       
    
        alert("¡Ingreso exitoso!");
        
        
        const nivelUsuario = datos.user_level;

        // 3. Evaluamos con los valores exactos
        if (nivelUsuario === "Administrador") {
            window.location.href = "/Admin";
        } else if(nivelUsuario==="Cliente") {
            
            window.location.href = "ReservadeCancha";
        }

    } catch (error) {
        alert(error.message);
        console.error("Error detectado:", error);
    }
});
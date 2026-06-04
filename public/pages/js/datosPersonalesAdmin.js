const API = "http://localhost:3000/user_Info";

async function ObtenerDatosPersonales() {
    try {
        const Respuesta = await fetch(API, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "plataform": "web"
            },
            credentials: "include"
        });

        const Datos = await Respuesta.json();

        document.querySelector('.input-Nombre').value = Datos.nombre;
        document.querySelector('.input-Apellido').value = Datos.apellido;
        document.querySelector('.input-Nacionalidad').value = Datos.nacionalidad;
        document.querySelector('.input-Dni').value = Datos.dni;
        document.querySelector('.input-Genero').value = Datos.genero;
        document.querySelector('.input-Telefono').value = Datos.telefono;
        document.querySelector('.input-Email').value = Datos.email;

    } catch (error) {
        console.error("Error al obtener datos personales:", error);
    }
}

ObtenerDatosPersonales();

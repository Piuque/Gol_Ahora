async function ObtenerDatosPersonales() {
    try {
        const userId = localStorage.getItem("userId");
        const res = await fetch(`/admin/clientes/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": userId
            },
            credentials: "include"
        });

        const datos = await res.json();

        document.querySelector('.input-Nombre').value = datos.nombre || '';
        document.querySelector('.input-Apellido').value = datos.apellido || '';
        document.querySelector('.input-Nacionalidad').value = datos.nacionalidad || '';
        document.querySelector('.input-Dni').value = datos.dni || '';
        document.querySelector('.input-Genero').value = datos.genero || '';
        document.querySelector('.input-Telefono').value = datos.telefono || '';
        document.querySelector('.input-Email').value = datos.email || '';

    } catch (error) {
        console.error("Error al obtener datos personales:", error);
    }
}

ObtenerDatosPersonales();
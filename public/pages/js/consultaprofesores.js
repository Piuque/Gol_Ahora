const API = "http://localhost:3000";

// ==========================================
// 1. LOGIN COMO ADMINISTRADOR Y OBTENER TOKEN
// ==========================================
async function obtenerToken() {
    const res = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json", 
            "plataform": "web" 
        },
        body: JSON.stringify({
            email: "administrador@golahora.com",
            password: "Unaj2026@golahora"
        })
    });

    const data = await res.json();
    console.log("Respuesta del login:", data);
    return data.token;
}

// ==========================================
// 2. CONSULTAR LOS PROFESORES CON EL TOKEN
// ==========================================

async function obtenerProfesores(token) {
    const res = await fetch(API + "/profesores", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token // enviamos el token
        }
    });

    const profesores = await res.json();
    console.log("Profesores:", profesores);
    return profesores;
}

// ==========================================
// 3. MOSTRAR LOS PROFESORES EN LA PÁGINA
// ==========================================
async function cargarProfesores() {
    try {
        // Primero hacemos login para obtener el token
        const token = await obtenerToken();

        // Con el token consultamos los profesores
        const profesores = await obtenerProfesores(token);

        // Buscamos el contenedor en el HTML
        const contenedor = document.getElementById("lista-profesores");

        // Por cada profesor creamos una fila
        profesores.forEach(profesor => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${profesor.nombre}</td>
                <td>${profesor.apellido}</td>
                <td>${profesor.email}</td>
                <td>${profesor.dni}</td>
                <td>${profesor.telefono}</td>
            `;
            contenedor.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar profesores:", error);
    }
}

// Ejecuta cuando carga la página
document.addEventListener("DOMContentLoaded", cargarProfesores);
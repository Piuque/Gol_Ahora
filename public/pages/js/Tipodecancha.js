class Cancha {
    constructor(id, tipo_cancha, duracion_min, duracion_max, ancho, largo, capacidad, nombre_superficie, descripcion, imagen_url) {
        this.id = id;
        this.tipo_cancha = tipo_cancha;
        this.duracion_min = duracion_min;
        this.duracion_max = duracion_max;
        this.ancho = ancho;
        this.largo = largo;
        this.capacidad = capacidad;
        this.nombre_superficie = nombre_superficie;
        this.descripcion = descripcion || "Sin descripción disponible."; // Evita el 'undefined'
        this.imagen_url = imagen_url;
    }

   generarHTML() {
        const columna = document.createElement("div");
        columna.className = "col-12 mb-4 d-flex justify-content-center";

        columna.innerHTML = `
            <div class="card card-entrenamientos text-dark shadow border-0 overflow-hidden" 
                 style="max-width: 900px; width: 100%; border-radius: 15px; background-color: #ffffff !important;">
                <div class="row no-gutters align-items-center">
                    
                    <div class="col-md-5">
                        <img src="http://localhost:3000${this.imagen_url}" 
                             class="card-img w-100" 
                             style="height: 280px; object-fit: cover;" 
                             alt="${this.tipo_cancha}">
                    </div>
                    
                    <div class="col-md-7">
                        <div class="card-body p-4 text-left">
                            
                            <h3 class="card-title font-weight-bold mb-3" 
                                style="color: #111111 !important; font-size: 1.6rem; font-family: sans-serif;">
                                ${this.tipo_cancha.toUpperCase()}
                            </h3>
                            
                            <ul class="list-unstyled mb-3" 
                                style="font-size: 0.95rem; line-height: 1.6; color: #333333 !important;">
                                <li class="mb-1" style="color: #333333 !important;"><i class="fas fa-users text-primary mr-2"></i> <strong style="color: #111111 !important;">Capacidad:</strong> ${this.capacidad} jugadores</li>
                                <li class="mb-1" style="color: #333333 !important;"><i class="fas fa-layer-group text-primary mr-2"></i> <strong style="color: #111111 !important;">Superficie:</strong> ${this.nombre_superficie}</li>
                                <li class="mb-1" style="color: #333333 !important;"><i class="fas fa-ruler-combined text-primary mr-2"></i> <strong style="color: #111111 !important;">Medidas:</strong> ${this.largo}m x ${this.ancho}m</li>
                                <li class="mb-1" style="color: #333333 !important;"><i class="fas fa-clock text-primary mr-2"></i> <strong style="color: #111111 !important;">Turnos:</strong> ${this.duracion_min} min a ${this.duracion_max} min</li>
                            </ul>
                            
                            <p class="card-text mb-4" 
                               style="font-size: 0.9rem; line-height: 1.4; color: #555555 !important;">
                                ${this.descripcion}
                            </p>
                            
                           <div class="text-left">
                    <a class="btn btn-warning text-dark font-weight-bold px-4 shadow-sm" 
                       style="border-radius: 50px; background-color: #ffc107 !important; border: none; color: #000000 !important;" 
                           href="Canchas"
                           onclick="localStorage.setItem('tipo_cancha', ${this.id})">
                        Seleccionar
                        </a>
                    </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
        
        return columna;
    }
}

let listaCanchasObjetos = [];

document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:3000/tipos_canchas";
    const contenedor = document.getElementById("tarjetas-canchas");

    if (!contenedor) return;

    fetch(API_URL)
        .then(respuesta => {
            if (!respuesta.ok) throw new Error("Error en la API");
            return respuesta.json();
        })
        .then(datosCrudos => {
            contenedor.innerHTML = ""; 
            listaCanchasObjetos = [];  

            datosCrudos.forEach(data => {
                let textoDescripcion = data.descripcion;
                if (!textoDescripcion && data.superficie) {
                    textoDescripcion = data.superficie.descripcion;
                }

                const nuevaCancha = new Cancha(
                    data.id,
                    data.tipo_cancha,
                    data.duracion_min,
                    data.duracion_max,
                    data.ancho,
                    data.largo,
                    data.capacidad,
                    data.superficie ? data.superficie.tipo : "No especificada",
                    textoDescripcion,
                    data.imagen_url
                );

                listaCanchasObjetos.push(nuevaCancha);
                contenedor.appendChild(nuevaCancha.generarHTML());
            });
        })
        .catch(error => {
            console.error("Error:", error);
            contenedor.innerHTML = `<p class="text-white text-center py-4 w-100">Error al procesar las canchas del servidor.</p>`;
        });
});

function seleccionarCancha(id) {
    // 1. Guardamos el ID del tipo de cancha seleccionado en el almacenamiento del navegador (localStorage)
    localStorage.setItem('tipo_cancha', id);

    // 2. Redireccionamos a la nueva pantalla que va a mostrar las canchas físicas de ese tipo
    window.location.href = "Canchas";
}

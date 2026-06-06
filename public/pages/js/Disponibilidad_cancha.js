/*class Disponibilidad { // (Convención: las clases empiezan con mayúscula)
    constructor(cancha_id, dia_semana, hora_inicio, hora_fin, cancha) {
        this.cancha_id = cancha_id;
        this.dia_semana = dia_semana;
        this.hora_inicio = hora_inicio;
        this.hora_fin = hora_fin;
        this.cancha = cancha;
    }

    generarHTML() {
        const fila = document.createElement("div");
        fila.className = "col-12 mb-3 d-flex justify-content-center";

        fila.innerHTML = `
            <div class="card card-entrenamientos text-dark shadow border-0 p-4 w-100" style="max-width: 900px; border-radius: 15px; background-color: #ffffff !important;">
                <div class="d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                        <h4 class="font-weight-bold mb-1">Día: ${this.dia_semana}</h4>
                        <p class="text-muted mb-0">
                            <i class="far fa-clock text-primary mr-1"></i> 
                            <strong>Horario:</strong> ${this.hora_inicio} a ${this.hora_fin}
                        </p>
                    </div>
                    <div class="mt-3 mt-sm-0">
                      
                    <button class="btn btn-success btn-reservar" 
                    onclick="abrirReserva('${this.dia_semana}', '${this.hora_inicio}', '${this.hora_fin}')">
                        Reservar
                        </button>
                    </div>
                </div>
            </div>
        `;
        return fila;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("tarjetas-canchas-filtradas");
    const canchaId = localStorage.getItem("cancha_id"); // ID recuperado

    if (!contenedor) return;

    if (!canchaId) {
        contenedor.innerHTML = `<p class="text-white text-center py-4">No se seleccionó una cancha. Volvé atrás.</p>`;
        return;
    }

    // Corregí la URL: nota el cambio en el parámetro
    const API_URL = `http://localhost:3000/canchas/cancha_id=${canchaId}/disponibilidad/`;

    async function obtenerDatos() {
        try {
            const respuesta = await fetch(API_URL);
            const datosCrudos = await respuesta.json();

            datosCrudos.forEach(data => {
                const nuevaDisponibilidad = new Disponibilidad(
                    canchaId = data.cancha.id,
                    data.dia_semana,
                    data.hora_inicio,
                    data.hora_fin,
                    data.cancha

                );

                contenedor.appendChild(nuevaDisponibilidad.generarHTML());
            });
        } catch (error) {
            console.error("Error al cargar disponibilidad:", error);
            contenedor.innerHTML = `<p class="text-danger text-center">No hay disponibilidad para esta cancha.</p>`;
        }
    }

    obtenerDatos();
});

*/

class Disponibilidad { // (Convención: las clases empiezan con mayúscula)
    constructor(id_disponibilidad, dia_semana, hora_inicio, hora_fin, id_cancha) {
        this.id_disponibilidad = id_disponibilidad;
        this.dia_semana = dia_semana;
        this.hora_inicio = hora_inicio;
        this.hora_fin = hora_fin;
        this.id_cancha = id_cancha;
    }

    generarHTML() {
        const fila = document.createElement("div");
        fila.className = "col-12 mb-3 d-flex justify-content-center";

        fila.innerHTML = `
            <div class="card text-dark shadow border-0 p-4 w-100" style="max-width: 900px; border-radius: 15px; background-color: #ffffff !important;">
                <div class="d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                        <h4 class="font-weight-bold mb-1">Día: ${this.dia_semana}</h4>
                        <p class="text-muted mb-0">
                            <i class="far fa-clock text-primary mr-1"></i> 
                            <strong>Horario:</strong> ${this.hora_inicio} a ${this.hora_fin}
                        </p>
                    </div>
                    <div class="mt-3 mt-sm-0">
                      
                    <button class="btn btn-success btn-reservar" 
                    onclick="abrirReserva('${this.dia_semana}', '${this.hora_inicio}', '${this.hora_fin}')">
                        Reservar
                        </button>
                    </div>
                </div>
            </div>
        `;
        return fila;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("tarjetas-canchas-filtradas");
    const canchaId = localStorage.getItem("cancha_id"); // ID recuperado

    if (!contenedor) return;

    if (!canchaId) {
        contenedor.innerHTML = `<p class="text-white text-center py-4">No se seleccionó una cancha. Volvé atrás.</p>`;
        return;
    }

    // Corregí la URL: nota el cambio en el parámetro
    const API_URL = `http://localhost:3000/disponibilidad/cancha_id=${canchaId}`;

    async function obtenerDatos() {
        try {
            const respuesta = await fetch(API_URL);
            const datosCrudos = await respuesta.json();

            datosCrudos.forEach(data => {
                const nuevaDisponibilidad = new Disponibilidad(
                    data.id_disponibilidad, 
                    data.dia_semana, 
                    data.hora_inicio, 
                    data.hora_fin,
                    data.id_cancha
                );

                contenedor.appendChild(nuevaDisponibilidad.generarHTML());
            });
        } catch (error) {
            console.error("Error al cargar disponibilidad:", error);
            contenedor.innerHTML = `<p class="text-danger text-center">No hay disponibilidad para esta cancha.</p>`;
        }
    }

    obtenerDatos();
});
// Función que se activa al hacer clic en "Reservar" de la tarjeta
function abrirReserva(dia, inicio, fin) {
    const modal = document.getElementById("modal-reserva");
    const resumen = document.getElementById("resumen-contenido");

    // Inyectamos los datos en el resumen
    resumen.innerHTML = `
        <div class="text-dark">
        <p><strong>Día:</strong> ${dia}</p>
        <p><strong>Horario:</strong> ${inicio} a ${fin}</p>
        <p>¿Estás seguro de continuar?</p>
        </div>
    `;

    // Hacemos visible el modal
    modal.style.display = "flex";
}


function cerrarReserva() {
    document.getElementById("modal-reserva").style.display = "none";
}

function finalizarReserva() {
    window.location.href = "Cobro";
 
    cerrarReserva();
}
const userRole = localStorage.getItem("role") || "entrenador";
const API = "/entrenador/info";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar navegación del sidebar
    initNavigation();
    
    // 2. Obtener datos de perfil
    ObtenerDatosPersonales();
});

function initNavigation() {
    const btnPerfil = document.getElementById("btn-mi-perfil");
    const btnEntrenamientos = document.getElementById("btn-mis-entrenamientos");
    const btnCertificaciones = document.getElementById("btn-certificaciones");
    const btnConfiguracion = document.getElementById("btn-configuracion");

    const seccionPerfil = document.getElementById("seccion-perfil");
    const seccionEntrenamientos = document.getElementById("seccion-entrenamientos");

    if (btnPerfil && btnEntrenamientos) {
        btnPerfil.addEventListener("click", (e) => {
            e.preventDefault();
            btnPerfil.classList.add("active");
            btnEntrenamientos.classList.remove("active");
            seccionPerfil.classList.remove("d-none");
            seccionEntrenamientos.classList.add("d-none");
        });

        btnEntrenamientos.addEventListener("click", (e) => {
            e.preventDefault();
            btnEntrenamientos.classList.add("active");
            btnPerfil.classList.remove("active");
            seccionEntrenamientos.classList.remove("d-none");
            seccionPerfil.classList.add("d-none");
            ObtenerEntrenamientos();
        });
    }

    if (btnCertificaciones) {
        btnCertificaciones.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Mis Certificaciones',
                text: 'Las certificaciones del entrenador están en proceso de verificación por la intendencia deportiva del club.',
                icon: 'info',
                confirmButtonColor: '#00C16E'
            });
        });
    }

    if (btnConfiguracion) {
        btnConfiguracion.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Configuración del Sistema',
                text: 'La edición de los parámetros de la cuenta está temporalmente inhabilitada en el entorno de desarrollo.',
                icon: 'info',
                confirmButtonColor: '#00C16E'
            });
        });
    }
}

async function ObtenerDatosPersonales() {
    try {
        const userId = localStorage.getItem("userId");
        const Respuesta = await fetch(API, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "plataform": "web",
                "x-user-id": userId
            },
            credentials: "include"
        });

        const Datos = await Respuesta.json();

        if (Datos) {
            const CampoNombre = document.querySelector('.input-Nombre');
            const CampoApellido = document.querySelector('.input-Apellido');
            const CampoDni = document.querySelector('.input-Dni');
            const CampoNacionalidad = document.querySelector('.input-Nacionalidad');
            const CampoGenero = document.querySelector('.input-Genero');
            const CampoFecha = document.querySelector('.input-Fecha');
            const CampoEmail = document.querySelector('.input-Email');
            const CampoTelefono = document.querySelector('.input-Telefono');
            const CampoDireccion = document.querySelector('.input-Direccion');

            if (CampoNombre) CampoNombre.value = Datos.nombre || '';
            if (CampoApellido) CampoApellido.value = Datos.apellido || '';
            if (CampoDni) CampoDni.value = Datos.dni || '';
            if (CampoNacionalidad) CampoNacionalidad.value = Datos.nacionalidad || '';
            if (CampoGenero) CampoGenero.value = Datos.genero || '';
            if (CampoFecha) CampoFecha.value = Datos.fecha_nacimiento || '';
            if (CampoEmail) CampoEmail.value = Datos.email || '';
            if (CampoTelefono) CampoTelefono.value = Datos.telefono || '';
            
            if (CampoDireccion && Datos.direccion) {
                const calle = Datos.direccion.calle || '';
                const numero = Datos.direccion.numero || '';
                const localidad = Datos.direccion.localidad || '';
                const pais = Datos.direccion.pais || '';
                CampoDireccion.value = `${calle} ${numero}, ${localidad}, ${pais}`.trim().replace(/^,\s*|,\s*$/g, '');
            }
        }
    } catch (error) {
        console.error("Error al obtener datos personales:", error);
    }
}

let entrenamientoSeleccionadoId = null;

async function ObtenerEntrenamientos() {
    const bodyTabla = document.getElementById('tabla-entrenamientos-body');
    if (!bodyTabla) return;

    try {
        const userId = localStorage.getItem("userId");
        const Respuesta = await fetch('/entrenador/entrenamientos', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "plataform": "web",
                "x-user-id": userId
            },
            credentials: "include"
        });

        const Entrenamientos = await Respuesta.json();

        if (!Respuesta.ok) {
            bodyTabla.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${Entrenamientos.error || 'No se pudieron cargar los entrenamientos'}</td></tr>`;
            return;
        }

        if (!Entrenamientos || Entrenamientos.length === 0) {
            bodyTabla.innerHTML = `<tr><td colspan="5" class="text-center text-light-50">No tienes entrenamientos asignados.</td></tr>`;
            return;
        }

        bodyTabla.innerHTML = '';
        Entrenamientos.forEach(ent => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.dataset.idEntrenamiento = ent.id_entrenamiento;
            
            if (entrenamientoSeleccionadoId && String(ent.id_entrenamiento) === String(entrenamientoSeleccionadoId)) {
                tr.classList.add('table-active', 'bg-dark-navy');
            }

            tr.innerHTML = `
                <td class="fw-bold text-white">${ent.nombre}</td>
                <td>${ent.fecha_turno} ${ent.hora_inicio} - ${ent.hora_fin}</td>
                <td>${ent.cancha_nombre || 'N/A'}</td>
                <td><span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50">${ent.nivel || 'Estándar'}</span></td>
                <td>${ent.inscriptos} / ${ent.capacidad_max}</td>
            `;

            tr.addEventListener('click', () => {
                document.querySelectorAll('#tabla-entrenamientos-body tr').forEach(row => row.classList.remove('table-active', 'bg-dark-navy'));
                tr.classList.add('table-active', 'bg-dark-navy');

                entrenamientoSeleccionadoId = ent.id_entrenamiento;
                ObtenerAlumnosEntrenamiento(ent.id_entrenamiento);
            });

            bodyTabla.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al obtener entrenamientos:", error);
        bodyTabla.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión al servidor</td></tr>`;
    }
}

async function ObtenerAlumnosEntrenamiento(idEntrenamiento) {
    const bodyAlumnos = document.getElementById('tabla-alumnos-body');
    if (!bodyAlumnos) return;

    bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-light-50">Cargando alumnos...</td></tr>`;

    try {
        const userId = localStorage.getItem("userId");
        const Respuesta = await fetch(`/entrenador/entrenamientos/${idEntrenamiento}/alumnos`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "plataform": "web",
                "x-user-id": userId
            },
            credentials: "include"
        });

        const Alumnos = await Respuesta.json();

        if (!Respuesta.ok) {
            bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${Alumnos.error || 'No se pudieron cargar los alumnos'}</td></tr>`;
            return;
        }

        if (!Alumnos || Alumnos.length === 0) {
            bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-light-50">No hay alumnos inscritos en este entrenamiento.</td></tr>`;
            return;
        }

        bodyAlumnos.innerHTML = '';
        Alumnos.forEach(alumno => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-white">${alumno.nombre} ${alumno.apellido}</td>
                <td class="text-light-50">${alumno.dni}</td>
                <td>${alumno.telefono || 'Sin teléfono'}</td>
                <td><span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50">${alumno.asistencia}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger px-2 py-0.5" onclick="darDeBajaAlumnoEntrenamiento(${alumno.id_usuario}, '${alumno.nombre} ${alumno.apellido}')">
                        <i class="bi bi-person-x"></i> Dar Baja
                    </button>
                </td>
            `;
            bodyAlumnos.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al obtener alumnos de entrenamiento:", error);
        bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión al servidor</td></tr>`;
    }
}

window.darDeBajaAlumnoEntrenamiento = function(idAlumno, nombreAlumno) {
    if (!entrenamientoSeleccionadoId) {
        Swal.fire('Error', 'No se ha seleccionado ningún entrenamiento.', 'error');
        return;
    }

    Swal.fire({
        title: '¿Confirmar baja del alumno?',
        text: `Se desvinculará a ${nombreAlumno} del entrenamiento y el cupo quedará libre inmediatamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#0A2540',
        confirmButtonText: 'Sí, dar de baja',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const userId = localStorage.getItem("userId");
                const Respuesta = await fetch(`/entrenador/entrenamientos/${entrenamientoSeleccionadoId}/alumnos/${idAlumno}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "plataform": "web",
                        "x-user-id": userId
                    },
                    credentials: "include"
                });

                const Res = await Respuesta.json();

                if (Respuesta.ok) {
                    Swal.fire('Procesado', 'El alumno fue removido de la planilla del entrenamiento.', 'success');
                    ObtenerAlumnosEntrenamiento(entrenamientoSeleccionadoId);
                    ObtenerEntrenamientos();
                } else {
                    Swal.fire('Error', Res.error || 'No se pudo procesar la baja.', 'error');
                }
            } catch (err) {
                console.error("Error al procesar la baja:", err);
                Swal.fire('Error', 'Error de conexión al servidor.', 'error');
            }
        }
    });
};

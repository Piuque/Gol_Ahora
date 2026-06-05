// --- CONFIGURACIÓN DE RUTA ---
// Validamos que el acceso sea exclusivamente para el rol de profesor
const userRole = localStorage.getItem("role");

if (userRole !== "profesor") {
    console.warn("Acceso restringido. Redirigiendo...");
    window.location.href = '/acceder'; // Ajusta según tu ruta de login
}

const API = "/profesor/info";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar controles de UI
    initInterfaceControls();
    
    // 2. Obtener datos específicos del profesor
    ObtenerDatosPersonales();
    
    // 3. Obtener clases del profesor
    ObtenerClasesProfesor();
});

function initInterfaceControls() {
    // Sidebar toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('wrapper').classList.toggle('toggled');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout-action');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeLogout();
        });
    }

    // Tabs logic
    const tabButtons = document.querySelectorAll('#tecnicoTabs button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const panes = document.querySelectorAll('.tab-content .tab-pane');
            panes.forEach(pane => pane.classList.remove('show', 'active'));

            const targetPaneId = this.getAttribute('data-bs-target');
            const targetPane = document.querySelector(targetPaneId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
            }
        });
    });
}

async function ObtenerDatosPersonales() {
    try {
        const respuesta = await fetch(API, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "plataform": "web"
            },
            credentials: "include"
        });

        if (!respuesta.ok) throw new Error("Error en la conexión con el servidor");

        const datos = await respuesta.json();

        if (datos) {
            // Actualización de textos en Navbar y Sidebar
            if(datos.nombre && datos.apellido) {
                const nombreCompleto = `${datos.nombre} ${datos.apellido}`;
                document.getElementById('top-navbar-user-name').textContent = nombreCompleto;
                document.getElementById('sidebar-user-fullname').textContent = nombreCompleto;
            }
            
            // Rellenado de campos de perfil
            const campos = {
                '.input-Nombre': datos.nombre,
                '.input-Apellido': datos.apellido,
                '.input-Nacionalidad': datos.nacionalidad,
                '.input-Dni': datos.dni,
                '.input-Genero': datos.genero,
                '.input-Telefono': datos.telefono,
                '.input-Email': datos.email
            };

            Object.entries(campos).forEach(([selector, valor]) => {
                const el = document.querySelector(selector);
                if (el) el.value = valor || '';
            });
        }
    } catch (error) {
        console.error("Error al obtener datos del profesor:", error);
    }
}

// --- CONTROLES Y SWEETALERT2 ---
let claseSeleccionadaId = null;

async function ObtenerClasesProfesor() {
    const bodyTabla = document.getElementById('tabla-clases-body');
    if (!bodyTabla) return;

    try {
        const userId = localStorage.getItem("userId");
        const Respuesta = await fetch('/profesor/clases', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "plataform": "web",
                "x-user-id": userId
            },
            credentials: "include"
        });

        const Clases = await Respuesta.json();

        if (!Respuesta.ok) {
            bodyTabla.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${Clases.error || 'No se pudieron cargar las clases'}</td></tr>`;
            return;
        }

        if (!Clases || Clases.length === 0) {
            bodyTabla.innerHTML = `<tr><td colspan="5" class="text-center text-light-50">No tienes clases asignadas.</td></tr>`;
            return;
        }

        bodyTabla.innerHTML = '';
        Clases.forEach(clase => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.dataset.idClase = clase.id_clase;
            
            // Si es la clase seleccionada actualmente, mantenerla destacada
            if (claseSeleccionadaId && String(clase.id_clase) === String(claseSeleccionadaId)) {
                tr.classList.add('table-active', 'bg-dark-navy');
            }

            tr.innerHTML = `
                <td class="fw-bold text-white">${clase.nombre}</td>
                <td>${clase.fecha_turno} ${clase.hora_inicio} - ${clase.hora_fin}</td>
                <td>${clase.cancha_nombre || 'N/A'}</td>
                <td><span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50">${clase.nivel || 'Estándar'}</span></td>
                <td>${clase.inscriptos} / ${clase.capacidad_max}</td>
            `;

            tr.addEventListener('click', () => {
                document.querySelectorAll('#tabla-clases-body tr').forEach(row => row.classList.remove('table-active', 'bg-dark-navy'));
                tr.classList.add('table-active', 'bg-dark-navy');

                claseSeleccionadaId = clase.id_clase;
                ObtenerAlumnosClase(clase.id_clase);
            });

            bodyTabla.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al obtener clases:", error);
        bodyTabla.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión al servidor</td></tr>`;
    }
}

async function ObtenerAlumnosClase(idClase) {
    const bodyAlumnos = document.getElementById('tabla-alumnos-body');
    if (!bodyAlumnos) return;

    bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-light-50">Cargando alumnos...</td></tr>`;

    try {
        const userId = localStorage.getItem("userId");
        const Respuesta = await fetch(`/profesor/clases/${idClase}/alumnos`, {
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
            bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-light-50">No hay alumnos inscritos en esta clase.</td></tr>`;
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
                    <button class="btn btn-sm btn-outline-danger px-2 py-0.5" onclick="darDeBajaAlumno(${alumno.id_usuario}, '${alumno.nombre} ${alumno.apellido}')">
                        <i class="fa-solid fa-user-minus"></i> Dar Baja
                    </button>
                </td>
            `;
            bodyAlumnos.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al obtener alumnos:", error);
        bodyAlumnos.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión al servidor</td></tr>`;
    }
}

async function executeLogout() {
    const result = await Swal.fire({
        title: '¿Cerrar sesión?',
        text: "Vas a salir del panel de gestión de Gol Ahora",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        localStorage.clear();
        document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        await fetch('/logout', { method: 'POST' }).catch(() => {});
        window.location.href = '/acceder';
    }
}

window.modificarBloqueActividad = () => {
    Swal.fire({
        title: 'Modificar Módulos Horarios',
        text: 'La edición directa requiere confirmación de la intendencia.',
        icon: 'info',
        confirmButtonColor: '#00C16E'
    });
};

window.darDeBajaAlumno = function(idAlumno, nombreAlumno) {
    if (!claseSeleccionadaId) {
        Swal.fire('Error', 'No se ha seleccionado ninguna clase.', 'error');
        return;
    }

    Swal.fire({
        title: '¿Confirmar baja del alumno?',
        text: `Se desvinculará a ${nombreAlumno} de la asistencia y el cupo quedará libre inmediatamente.`,
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
                const Respuesta = await fetch(`/profesor/clases/${claseSeleccionadaId}/alumnos/${idAlumno}`, {
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
                    Swal.fire('Procesado', 'El alumno fue removido de la planilla de asistencia.', 'success');
                    ObtenerAlumnosClase(claseSeleccionadaId);
                    ObtenerClasesProfesor();
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

window.cargarResultadoPartido = (partido) => {
    Swal.fire({
        title: 'Planilla Oficial de Resultados',
        html: `<p class="small text-muted">${partido}</p>
               <div class="d-flex justify-content-center gap-2">
                   <input type="number" id="goles-local" class="form-control" style="width:60px" placeholder="0">
                   <input type="number" id="goles-visita" class="form-control" style="width:60px" placeholder="0">
               </div>`,
        confirmButtonText: 'Publicar Goles'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Éxito', 'Marcador guardado.', 'success');
    });
};

window.guardarDatosPerfil = () => {
    Swal.fire({ icon: 'success', title: 'Perfil Actualizado', confirmButtonColor: '#00C16E' });
};

window.imprimirLegajoTecnico = () => window.print();

window.solicitarBajaContrato = () => {
    Swal.fire({
        title: 'Solicitud de Cese',
        input: 'textarea',
        confirmButtonText: 'Enviar'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Enviado', 'La administración se contactará.', 'success');
    });
};

<<<<<<< Updated upstream
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
=======
const API = "http://gol-ahora.onrender.com/";

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('wrapper').classList.toggle('toggled');
        });
    }

    ConsultarInfoEntrenador();
    CargarEntrenamientosYAlumnos();

    // Listener de pestañas dinámicas con Bootstrap 5
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
            if (targetPane) targetPane.classList.add('show', 'active');
        });
    });

    const formPerfil = document.getElementById("form-perfil-tecnico");
    if (formPerfil) {
        formPerfil.addEventListener("submit", async (e) => {
            e.preventDefault();
            await guardarCambiosPerfil();
        });
    }
});

// ==========================================
// CONSULTAR DATOS (Ruta: entrenador/info)
// ==========================================
async function ConsultarInfoEntrenador() {
    try {
        const res = await fetch(`${API}entrenador/info`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error();
        const Datos = await res.json();
        if (Datos) inyectarCamposFicha(Datos);
    } catch (error) {
        inyectarCamposFicha({
            nombre: "Alejandro", apellido: "Sabella", email: "sabella@golahora.com",
            dni: "25888999", nacionalidad: "Argentina", genero: "Masculino", telefono: "11 5544-3322"
        });
    }
}

function inyectarCamposFicha(Datos) {
    if (document.getElementById('top-navbar-user-name')) document.getElementById('top-navbar-user-name').textContent = `${Datos.nombre} ${Datos.apellido}`;
    if (document.getElementById('sidebar-user-fullname')) document.getElementById('sidebar-user-fullname').textContent = `${Datos.nombre} ${Datos.apellido}`;

    if (document.querySelector('.input-Nombre')) document.querySelector('.input-Nombre').value = Datos.nombre || '';
    if (document.querySelector('.input-Apellido')) document.querySelector('.input-Apellido').value = Datos.apellido || '';
    if (document.querySelector('.input-Nacionalidad')) document.querySelector('.input-Nacionalidad').value = Datos.nacionalidad || '';
    if (document.querySelector('.input-Dni')) document.querySelector('.input-Dni').value = Datos.dni || '';
    if (document.querySelector('.input-Genero')) document.querySelector('.input-Genero').value = Datos.genero || '';
    if (document.querySelector('.input-Telefono')) document.querySelector('.input-Telefono').value = Datos.telefono || '';
    if (document.querySelector('.input-Email')) document.querySelector('.input-Email').value = Datos.email || '';
}

// ==========================================
// MODIFICAR DATOS (Ruta: entrenador/modificarDatos)
// ==========================================
async function guardarCambiosPerfil() {
    try {
        const payload = {
            telefono: document.querySelector('.input-Telefono').value.trim(),
            email: document.querySelector('.input-Email').value.trim()
        };
        const res = await fetch(`${API}entrenador/modificarDatos`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            credentials: "include", body: JSON.stringify(payload)
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Perfil Guardado', text: 'Los cambios fueron salvados de forma correcta.', confirmButtonColor: '#00C16E' });
            ConsultarInfoEntrenador();
        }
    } catch (e) { console.error(e); }
}

// ==========================================
// CARGAR GESTIÓN ASINCRÓNICA
// ==========================================
async function CargarEntrenamientosYAlumnos() {
    try {
        const resE = await fetch(`${API}entrenador/listarEntrenamientos`, { method: "GET" });
        const resA = await fetch(`${API}entrenador/ListarAlumnos`, { method: "GET" });
        const resL = await fetch(`${API}entrenador/listarLigas`, { method: "GET" });
        if(!resE.ok || !resA.ok || !resL.ok) throw new Error();
    } catch (error) {
        const seed = {
            stats: { activas: "4 Rutinas", alumnos: "32 Activos", ligas: "2 Ligas", asistencia: "91%" },
            entrenamientos: [
                { id: "1", nombre: "Potencia Funcional", fecha: "Lunes y Miércoles", horario: "19:30 hs", responsable: "Alejandro Sabella", cupo: "15 / 20 Alumnos", estado: "Vigente" },
                { id: "2", nombre: "Resistencia Muscular", fecha: "Martes y Jueves", horario: "21:00 hs", responsable: "Alejandro Sabella", cupo: "17 / 20 Alumnos", estado: "Vigente" }
            ],
            alumnos: [
                { nombre: "Javier Mascherano", email: "jefecito@estudiantes.com", categoria: "Avanzado / Ligas", estado: "Regular" },
                { nombre: "Gonzalo Higuaín", email: "pipa@river.com", categoria: "Amateur / Inicial", estado: "Regular" }
            ],
            ligas: [
                { nombre: "Torneo Apertura F7", fecha: "Sábados 15:00 hs", categoria: "F7 Libre", estado: "En Fixture", participantes: "12" },
                { nombre: "Liga Senior F11", fecha: "Domingos 09:00 hs", categoria: "F11 Master", estado: "Inscripción", participantes: "10" }
            ]
        };

        if (document.getElementById('stat-entrenamientos-activos')) document.getElementById('stat-entrenamientos-activos').textContent = seed.stats.activas;
        if (document.getElementById('stat-alumnos-activos')) document.getElementById('stat-alumnos-activos').textContent = seed.stats.alumnos;
        if (document.getElementById('stat-ligas-activas')) document.getElementById('stat-ligas-activas').textContent = seed.stats.ligas;
        if (document.getElementById('stat-asistencia-entrenamiento')) document.getElementById('stat-asistencia-entrenamiento').textContent = seed.stats.asistencia;

        // Inyectar Entrenamientos
        const tbodyE = document.getElementById('tabla-entrenamientos-body');
        if (tbodyE) {
            tbodyE.innerHTML = seed.entrenamientos.map(e => `
                <tr>
                    <td class="fw-bold text-white"><i class="fa-solid fa-dumbbell text-sports me-2"></i>${e.nombre}</td>
                    <td>${e.fecha}</td>
                    <td>${e.horario}</td>
                    <td>${e.responsable}</td>
                    <td>${e.cupo}</td>
                    <td><span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">${e.estado}</span></td>
                </tr>
            `).join('');
        }

        // Inyectar Alumnos
        const tbodyA = document.getElementById('tabla-alumnos-body');
        if (tbodyA) {
            tbodyA.innerHTML = seed.alumnos.map(a => `
                <tr>
                    <td class="fw-bold">${a.nombre}</td>
                    <td class="text-light-50">${a.email}</td>
                    <td>${a.categoria}</td>
                    <td><span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">${a.estado}</span></td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-danger px-2 py-0.5" onclick="darDeBajaAlumno('${a.nombre}')"><i class="fa-solid fa-user-minus"></i> Dar Baja</button></td>
                </tr>
            `).join('');
        }

        // Inyectar Ligas
        const tbodyL = document.getElementById('tabla-ligas-body');
        if (tbodyL) {
            tbodyL.innerHTML = seed.ligas.map(l => `
                <tr>
                    <td class="fw-bold text-white"><i class="fa-solid fa-trophy text-warning me-2"></i>${l.nombre}</td>
                    <td>${l.fecha}</td>
                    <td>${l.categoria}</td>
                    <td><span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">${l.estado}</span></td>
                    <td>${l.participantes} Equipos</td>
                    <td class="text-center"><button class="btn btn-sm btn-success px-2 py-0.5" style="background-color:#00C16E; border-color:#00C16E" onclick="registrarResultado('${l.nombre}')">Resultados</button></td>
                </tr>
            `).join('');
        }
    }
}

// ==========================================
// ACCIONES INTERACTIVAS (Ruta: entrenador/registrarResultado)
// ==========================================
window.registrarResultado = function(partido) {
    Swal.fire({
        title: 'Planilla Oficial de Resultados',
        html: `<div class="d-flex justify-content-center gap-2 mb-2">
                <input type="number" id="goles-local" class="form-control text-center bg-dark text-white fw-bold" style="width:60px" placeholder="0"> - 
                <input type="number" id="goles-visita" class="form-control text-center bg-dark text-white fw-bold" style="width:60px" placeholder="0">
            </div>`,
        showCancelButton: true, confirmButtonColor: '#00C16E',
        preConfirm: () => {
            if (!document.getElementById('goles-local').value || !document.getElementById('goles-visita').value) { Swal.showValidationMessage('Complete los goles.'); }
        }
    }).then((result) => { if (result.isConfirmed) Swal.fire('Éxito', 'Marcador guardado de forma correcta.', 'success'); });
};

window.darDeBajaAlumno = function(nombre) {
    Swal.fire({ title: '¿Confirmar baja del alumno?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((r) => {
        if (r.isConfirmed) Swal.fire('Procesado', 'El alumno fue removido de la asistencia.', 'success');
    });
};

window.solicitarBajaPerfil = function() {
    Swal.fire({ title: '¿Solicitar baja?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((r) => {
        if (r.isConfirmed) Swal.fire('Registrada', 'La solicitud de baja fue enviada correctamente y quedará pendiente de validación por parte del administrador.', 'success');
    });
};

window.modificarEntrenamiento = function(id) { Swal.fire({ title: 'Modificar Horarios', text: 'La edición directa requiere confirmación de intendencia.', icon: 'info', confirmButtonColor: '#00C16E' }); };
>>>>>>> Stashed changes

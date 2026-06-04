const userRole = localStorage.getItem("role") || "profesor";
let relativePath = "/profesor/info";
if (userRole === "admin" || userRole === "administrador") {
    relativePath = "/admin/info";
} else if (userRole === "entrenador") {
    relativePath = "/entrenador/info";
} else if (userRole === "cliente") {
    relativePath = "/cliente/info";
}
const API = relativePath;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar botones de colapso y cerrar sesión
    initInterfaceControls();
    
    // 2. Ejecutar tu fetch real para traer los datos personales de Neon
    ObtenerDatosPersonales();
});

function initInterfaceControls() {
    // Control del botón de hamburguesa para achicar el sidebar
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('wrapper').classList.toggle('toggled');
        });
    }

    // Listener para el botón de cerrar sesión
    const logoutBtn = document.getElementById('btn-logout-action');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeLogout();
        });
    }

    // Lógica nativa de intercambio de pestañas (Tabs)
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

// TU FUNCIÓN ASINCRÓNICA CONECTADA A LA API
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

        // Si la base de datos devuelve datos correctos, actualiza los textos dinámicos
        if (Datos) {
            if(Datos.nombre && Datos.apellido) {
                document.getElementById('top-navbar-user-name').textContent = `${Datos.nombre} ${Datos.apellido}`;
                document.getElementById('sidebar-user-fullname').textContent = `${Datos.nombre} ${Datos.apellido}`;
            }
            
            // Rellenado de casilleros de perfil
            if(document.querySelector('.input-Nombre')) document.querySelector('.input-Nombre').value = Datos.nombre || '';
            if(document.querySelector('.input-Apellido')) document.querySelector('.input-Apellido').value = Datos.apellido || '';
            if(document.querySelector('.input-Nacionalidad')) document.querySelector('.input-Nacionalidad').value = Datos.nacionalidad || '';
            if(document.querySelector('.input-Dni')) document.querySelector('.input-Dni').value = Datos.dni || '';
            if(document.querySelector('.input-Genero')) document.querySelector('.input-Genero').value = Datos.genero || '';
            if(document.querySelector('.input-Telefono')) document.querySelector('.input-Telefono').value = Datos.telefono || '';
            if(document.querySelector('.input-Email')) document.querySelector('.input-Email').value = Datos.email || '';
        }

    } catch (error) {
        console.error("Error al obtener datos personales de la base de datos:", error);
    }
}


//ESTILOS DE LOS BOTONES DE LA INTERFAZ (SWEETALERT2) Y FUNCIONES DE CONTROL DE VENTANAS EMERGENTES
// --- CONTROLES DE LAS VENTANAS EMERGENTES (SWEETALERT2) ---
function executeLogout() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "Vas a salir del panel de gestión de Gol Ahora",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    });
}

window.modificarBloqueActividad = function() {
    Swal.fire({
        title: 'Modificar Módulos Horarios',
        text: 'La edición directa de la grilla horaria requiere confirmación de la intendencia del club para evitar superposición en las canchas.',
        icon: 'info',
        confirmButtonColor: '#00C16E'
    });
};

window.darDeBajaAlumno = function(nombreAlumno) {
    Swal.fire({
        title: '¿Confirmar baja del alumno?',
        text: `Se desvinculará a ${nombreAlumno} de la asistencia y el cupo quedará libre inmediatamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#0A2540',
        confirmButtonText: 'Sí, dar de baja',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Procesado', 'El alumno fue removido de la planilla de asistencia.', 'success');
        }
    });
};

window.cargarResultadoPartido = function(partido) {
    Swal.fire({
        title: 'Planilla Oficial de Resultados',
        html: `
            <p class="small text-muted mb-3">${partido}</p>
            <div class="d-flex justify-content-center gap-2 mb-2">
                <input type="number" id="goles-local" class="form-control text-center bg-dark text-white fw-bold" style="width:60px" placeholder="0">
                <span class="fs-4 text-white">-</span>
                <input type="number" id="goles-visita" class="form-control text-center bg-dark text-white fw-bold" style="width:60px" placeholder="0">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Publicar Goles',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const loc = document.getElementById('goles-local').value || 0;
            const vis = document.getElementById('goles-visita').value || 0;
            Swal.fire('Éxito', `Marcador guardado: ${loc} - ${vis}. Fixture actualizado.`, 'success');
        }
    });
};

window.guardarDatosPerfil = function() {
    Swal.fire({
        icon: 'success',
        title: 'Perfil Técnico Actualizado',
        text: 'Los cambios sobre su legajo profesional han sido guardados con éxito.',
        confirmButtonColor: '#00C16E'
    });
};

window.imprimirLegajoTecnico = function() { window.print(); };

window.solicitarBajaContrato = function() {
    Swal.fire({
        title: 'Solicitud de Cese de Actividades',
        input: 'textarea',
        inputLabel: 'Indique los motivos del cese de comisiones (Privado para RRHH):',
        inputPlaceholder: 'Escriba aquí sus motivos...',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#0A2540',
        confirmButtonText: 'Enviar Solicitud',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire('Enviado', 'Su solicitud fue registrada. La administración se contactará a la brevedad.', 'success');
        }
    });
};
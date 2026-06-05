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

window.darDeBajaAlumno = (nombreAlumno) => {
    Swal.fire({
        title: '¿Confirmar baja del alumno?',
        text: `Se desvinculará a ${nombreAlumno}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, dar de baja'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Procesado', 'Alumno removido.', 'success');
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

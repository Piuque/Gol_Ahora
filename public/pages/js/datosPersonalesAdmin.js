

const API = window.location.origin;



/* -----------------------------------------------------------------------

INIT

----------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

ConsultarNombreSesion();

ActivarMenuToggle();

AsignarListenersFormularios();



const path = window.location.pathname.split("/").pop();



if (path === "interfazProfesor.html" || path === "") {

ConsultarDashboardOperativo();

} else if (path === "certificacionesProfesor.html") {

ConsultarCertificacionesLegajo();

} else if (path === "perfilProfesor.html") {

ConsultarPerfilFicha();

const formModalPerfil = document.getElementById('form-modal-perfil');

if (formModalPerfil) {

formModalPerfil.addEventListener('submit', async (e) => {

e.preventDefault();

const payload = {

telefono: document.getElementById('perfil-input-telefono')?.value.trim(),

email: document.getElementById('perfil-input-email')?.value.trim()

};

try {

const res = await fetch(`${API}/profesor/modificarPerfil`, {

method: "POST",

headers: { "Content-Type": "application/json" },

credentials: "include",

body: JSON.stringify(payload)

});

if (res.ok) {

bootstrap.Modal.getInstance(document.getElementById('modalModificarPerfil'))?.hide();

_setText('disp-telefono', payload.telefono || '—');

_setText('disp-email', payload.email || '—');

_setText('card-resumen-correo', payload.email || '');

_perfilCache.telefono = payload.telefono;

_perfilCache.email = payload.email;

Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Datos actualizados', text: 'Tu teléfono y correo fueron guardados correctamente.', confirmButtonColor: '#00C16E' });

} else throw new Error();

} catch {

Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los cambios.', confirmButtonColor: '#00C16E' });

}

});

}

}

});



/* -----------------------------------------------------------------------

SIDEBAR TOGGLE

----------------------------------------------------------------------- */

function ActivarMenuToggle() {

const btn = document.getElementById('menu-toggle');

const wrapper = document.getElementById('wrapper');

if (btn && wrapper) btn.addEventListener('click', () => wrapper.classList.toggle('toggled'));

}



/* -----------------------------------------------------------------------

NOMBRE DE SESIÓN → GET /profesor/info

JSON: { nombre, apellido, username, email, ... }

----------------------------------------------------------------------- */

async function ConsultarNombreSesion() {

try {

const res = await fetch(`${API}/profesor/info`, { method: "GET", credentials: "include" });

if (!res.ok) throw new Error();

const d = await res.json();



const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();

_setText('top-navbar-user-name', completo);

_setText('sidebar-user-fullname', completo);

_setText('card-resumen-nombre', completo);

_setText('card-resumen-username', d.username ? `@${d.username}` : '');

_setText('card-resumen-correo', d.email || '');

} catch {

_setText('top-navbar-user-name', 'Profesor');

_setText('sidebar-user-fullname', 'Profesor');

}

}



/* -----------------------------------------------------------------------

DASHBOARD → GET /profesor/clases

JSON array: [{ id_clase, nombre, capacidad_max, cancha_nombre, nivel,

hora_inicio, hora_fin, fecha_turno, inscriptos }]

----------------------------------------------------------------------- */

async function ConsultarDashboardOperativo() {

try {

const [resClases] = await Promise.all([

fetch(`${API}/profesor/clases`, { method: "GET", credentials: "include" })

]);



if (resClases.ok) InyectarTablaClases(await resClases.json());

else InyectarTablaClases([]);



// Alumnos: se cargan por clase al hacer click — ver ConsultarAlumnosPorClase()

InyectarTablaAlumnos([]);



} catch {

InyectarTablaClases([]);

InyectarTablaAlumnos([]);

}

}



/* — Tabla Clases — */

function InyectarTablaClases(lista) {

const tbody = document.getElementById('tabla-clases-body');

if (!tbody) return;



if (!lista || lista.length === 0) {

tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4" style="color:var(--text-light-50)">

<i class="fa-solid fa-chalkboard fa-lg me-2"></i>No posee clases en su agenda.</td></tr>`;

return;

}



tbody.innerHTML = lista.map(c => {

// Horario: "hora_inicio – hora_fin | fecha_turno"

const horario = `${c.hora_inicio || ''} – ${c.hora_fin || ''}`;

const fecha = c.fecha_turno ? `<br><small class="text-light-50">${c.fecha_turno}</small>` : '';

const nivel = c.nivel ? `<span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-2 ms-1">${c.nivel}</span>` : '';



return `<tr>

<td class="fw-semibold text-white">

<i class="fa-solid fa-chalkboard text-sports me-2"></i>${c.nombre}${nivel}

</td>

<td class="text-light-75">${horario}${fecha}</td>

<td class="text-light-75">${c.cancha_nombre || '—'}</td>

<td class="text-light-75">Capacidad: ${c.capacidad_max || '—'}</td>

<td><span class="badge bg-success bg-opacity-10 border border-success border-opacity-25 text-success px-2">${c.inscriptos || 0} inscriptos</span></td>

<td class="text-center">

<button class="btn btn-xs btn-outline-success border-sports text-sports"

onclick="ConsultarAlumnosPorClase('${c.id_clase}', \`${_esc(c.nombre)}\`)">

<i class="fa-solid fa-users me-1"></i>Ver alumnos

</button>

</td>

</tr>`;

}).join('');

}



/* -----------------------------------------------------------------------

ALUMNOS POR CLASE → GET /profesor/clases/{id}/alumnos

JSON array: [{ id_usuario, nombre, apellido, dni, telefono, asistencia }]

----------------------------------------------------------------------- */

window.ConsultarAlumnosPorClase = async function(idClase, nombreClase) {

// Actualizar encabezado de la tabla

const titulo = document.getElementById('titulo-tabla-alumnos');

if (titulo) titulo.textContent = `Alumnos — ${nombreClase}`;



const tbody = document.getElementById('tabla-alumnos-body');

if (!tbody) return;



tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3" style="color:var(--text-light-50);">

<div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>

Cargando alumnos de la clase...

</td></tr>`;



try {

const res = await fetch(`${API}/profesor/clases/${idClase}/alumnos`, { method: "GET", credentials: "include" });

if (!res.ok) throw new Error();

InyectarTablaAlumnos(await res.json(), idClase);

} catch {

tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3" style="color:var(--text-light-50);">

<i class="fa-solid fa-triangle-exclamation me-2 text-warning"></i>No se pudieron cargar los alumnos.</td></tr>`;

}

};



/* — Tabla Alumnos — */

function InyectarTablaAlumnos(lista, idClase) {

const tbody = document.getElementById('tabla-alumnos-body');

if (!tbody) return;



if (!lista || lista.length === 0) {

tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color:var(--text-light-50)">

<i class="fa-solid fa-users fa-lg me-2"></i>No hay alumnos inscriptos en esta clase.</td></tr>`;

return;

}



tbody.innerHTML = lista.map(a => {

// Badge de asistencia según valor del campo

const asistenciaBadge = a.asistencia

? `<span class="badge px-2" style="background:rgba(0,193,110,0.1);border:1px solid rgba(0,193,110,0.3);color:#00C16E;">${a.asistencia}</span>`

: `<span class="badge px-2" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);">—</span>`;



return `<tr>

<td class="fw-semibold">

<div class="d-flex align-items-center gap-2">

<div class="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center fw-bold"

style="width:30px;height:30px;font-size:0.7rem;flex-shrink:0;">

${_initials(a.nombre, a.apellido)}

</div>

<span class="text-white">${a.nombre} ${a.apellido}</span>

</div>

</td>

<td class="text-light-50 small">${a.dni || '—'}</td>

<td class="text-light-75">${a.telefono || '—'}</td>

<td>${asistenciaBadge}</td>

<td class="text-center">

<button class="btn btn-xs btn-outline-danger font-xs"

onclick="ProcesarBajaAlumno('${idClase}', '${a.id_usuario}', '${_esc(a.nombre)} ${_esc(a.apellido)}')">

<i class="fa-solid fa-user-minus me-1"></i>Dar Baja

</button>

</td>

</tr>`;

}).join('');

}



/* -----------------------------------------------------------------------

BAJA DE ALUMNO → DELETE /profesor/clases/{id_clase}/alumnos/{id_alumno}

----------------------------------------------------------------------- */

window.ProcesarBajaAlumno = function(idClase, idAlumno, nombre) {

Swal.fire({

title: '¿Dar de baja?',

html: `Se dará de baja a <strong>${nombre}</strong> de esta clase.`,

icon: 'warning',

iconColor: '#f25c54',

showCancelButton: true,

confirmButtonColor: '#f25c54',

cancelButtonColor: '#6c757d',

confirmButtonText: 'Sí, dar de baja',

cancelButtonText: 'Cancelar',

reverseButtons: true

}).then(async (result) => {

if (!result.isConfirmed) return;

try {

const res = await fetch(`${API}/profesor/clases/${idClase}/alumnos/${idAlumno}`, {

method: "DELETE",

credentials: "include"

});

if (res.ok) {

Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Baja registrada', text: `${nombre} fue removido de la clase.`, confirmButtonColor: '#00C16E' });

ConsultarAlumnosPorClase(idClase, '');

} else throw new Error();

} catch {

Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la baja.', confirmButtonColor: '#00C16E' });

}

});

};



/* -----------------------------------------------------------------------

CERTIFICACIONES (certificacionesProfesor.html)

— sin endpoint real aún, se deja el hook listo

----------------------------------------------------------------------- */

async function ConsultarCertificacionesLegajo() {

const container = document.getElementById('contenedor-certificaciones-cards');

if (!container) return;



container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">

<div class="spinner-border text-success" role="status"></div>

<p class="mt-3 small">Cargando certificaciones...</p>

</div>`;



try {

const res = await fetch(`${API}/profesor/certificaciones`, { method: "GET", credentials: "include" });

if (!res.ok) throw new Error();

renderizarCardsCertificadosHTML(await res.json());

} catch {

container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">

<i class="fa-solid fa-graduation-cap fa-3x mb-3 d-block" style="color:var(--sports-green);opacity:0.3;"></i>

<p class="small">No posee certificados cargados en su legajo.<br>

<span style="color:var(--text-light-50)">Usá el botón <strong>Agregar Certificación</strong> para iniciar.</span></p>

</div>`;

}

}



function renderizarCardsCertificadosHTML(lista) {

const container = document.getElementById('contenedor-certificaciones-cards');

if (!container) return;



if (!lista || lista.length === 0) {

container.innerHTML = `<div class="col-12 text-center py-5" style="color:var(--text-light-50)">

<i class="fa-solid fa-graduation-cap fa-3x mb-3 d-block" style="color:var(--sports-green);opacity:0.3;"></i>

<p class="small">No posee certificados cargados en su legajo.</p>

</div>`;

return;

}



container.innerHTML = lista.map(c => `

<div class="col-md-6 col-xl-4">

<div class="card card-sport h-100 p-3 d-flex flex-column justify-content-between">

<div>

<div class="d-flex justify-content-between align-items-start mb-2 gap-2">

<h6 class="fw-bold text-white mb-0" style="flex:1;min-width:0;word-break:break-word;">${c.nombre}</h6>

<span style="display:inline-block;flex-shrink:0;max-width:140px;background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.25);border-radius:4px;padding:3px 8px;font-size:0.7rem;color:#ffc107;text-align:right;line-height:1.4;">Pendiente de evaluación</span>

</div>

<p class="small text-light-75 mb-1">

<i class="fa-solid fa-building-columns text-sports me-1"></i>${c.institucion}

</p>

<small style="color:var(--text-light-50)">

<i class="fa-regular fa-calendar me-1"></i>Emisión: ${c.fecha_emision}

</small>

</div>

${c.archivo_url ? `

<div class="mt-3">

<a href="${c.archivo_url}" target="_blank"

class="btn btn-xs btn-outline-success border-sports text-sports w-100">

<i class="fa-solid fa-file-pdf me-1"></i>Ver adjunto

</a>

</div>` : ''}

</div>

</div>`).join('');

}



async function ProcesarAltaCertificacionConAdjunto() {

const nom = document.getElementById('cert-nombre')?.value.trim();

const ins = document.getElementById('cert-institucion')?.value.trim();

const fec = document.getElementById('cert-fecha')?.value;

const file = document.getElementById('cert-archivo');



if (!nom || !ins || !fec || !file?.files[0]) {

Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completá todos los campos y adjuntá el comprobante.', confirmButtonColor: '#00C16E' });

return;

}



const formData = new FormData();

formData.append('nombre', nom);

formData.append('institucion', ins);

formData.append('fecha_emision', fec);

formData.append('archivo', file.files[0]);



try {

const res = await fetch(`${API}/profesor/certificaciones/alta`, {

method: "POST", credentials: "include", body: formData

});

if (res.ok) {

bootstrap.Modal.getInstance(document.getElementById('modalAltaCertificacion'))?.hide();

Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Certificación enviada', text: 'Quedará pendiente de evaluación por el administrador.', confirmButtonColor: '#00C16E' });

document.getElementById('form-alta-certificacion').reset();

ConsultarCertificacionesLegajo();

} else throw new Error();

} catch {

Swal.fire({ icon: 'error', title: 'Error al subir', text: 'No se pudo cargar el archivo. Intentá más tarde.', confirmButtonColor: '#00C16E' });

}

}



/* -----------------------------------------------------------------------

PERFIL → GET /profesor/info

JSON: { nombre, apellido, dni, nacionalidad, genero, telefono, email,

username, fecha_nacimiento, direccion: { localidad, provincia, ... } }

----------------------------------------------------------------------- */

let _perfilCache = {};



async function ConsultarPerfilFicha() {

try {

const res = await fetch(`${API}/profesor/info`, { method: "GET", credentials: "include" });

if (!res.ok) throw new Error();

const d = await res.json();

_perfilCache = d;



_setText('disp-nombre', d.nombre || '—');

_setText('disp-apellido', d.apellido || '—');

_setText('disp-dni', d.dni || '—');

_setText('disp-nacionalidad', d.nacionalidad || '—');

_setText('disp-genero', d.genero || '—');

_setText('disp-telefono', d.telefono || '—');

_setText('disp-email', d.email || '—');



const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();

_setText('card-resumen-nombre', completo);

_setText('card-resumen-username', d.username ? `@${d.username}` : '');

_setText('card-resumen-correo', d.email || '');

_setText('card-resumen-especialidad', d.especialidad || '—');

_setText('card-resumen-estado', d.estado || 'Activo');



} catch {

console.warn("No se pudo cargar el perfil del profesor.");

}

}



window.AbrirModalModificarPerfil = function() {

const telInput = document.getElementById('perfil-input-telefono');

const mailInput = document.getElementById('perfil-input-email');

if (telInput) telInput.value = _perfilCache.telefono || '';

if (mailInput) mailInput.value = _perfilCache.email || '';



const el = document.getElementById('modalModificarPerfil');

let inst = bootstrap.Modal.getInstance(el);

if (!inst) inst = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });

inst.show();

};



/* -----------------------------------------------------------------------

SOLICITAR BAJA DE PERFIL

----------------------------------------------------------------------- */

window.solicitarBajaPerfil = function() {

Swal.fire({

title: '¿Solicitar baja del perfil?',

html: 'Esta acción iniciará el proceso de desvinculación de sus comisiones de enseñanza. Requiere validación del administrador.',

icon: 'warning', iconColor: '#f25c54',

showCancelButton: true,

confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',

confirmButtonText: 'Sí, solicitar baja', cancelButtonText: 'Cancelar',

reverseButtons: true

}).then(async (result) => {

if (!result.isConfirmed) return;

try {

const res = await fetch(`${API}/profesor/baja`, { method: "POST", credentials: "include" });

if (res.ok) Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Solicitud registrada', text: 'Quedará pendiente de validación.', confirmButtonColor: '#00C16E' });

else throw new Error();

} catch {

Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la solicitud.', confirmButtonColor: '#00C16E' });

}

});

};



/* -----------------------------------------------------------------------

CERRAR SESIÓN

----------------------------------------------------------------------- */

window.CerrarSesion = function() {

Swal.fire({

title: '¿Cerrar sesión?',

text: 'Serás redirigido al inicio de la aplicación.',

icon: 'question', iconColor: '#00C16E',

showCancelButton: true,

confirmButtonColor: '#00C16E', cancelButtonColor: '#6c757d',

confirmButtonText: '<i class="fa-solid fa-right-from-bracket me-1"></i>Sí, cerrar sesión',

cancelButtonText: 'Cancelar',

reverseButtons: true

}).then(async (result) => {

if (!result.isConfirmed) return;

try { await fetch(`${API}/logout`, { method: "POST", credentials: "include" }); } catch {}

window.location.href = "index.html";

});

};







/* -----------------------------------------------------------------------

HELPERS

----------------------------------------------------------------------- */

function _setText(id, value) {

const el = document.getElementById(id);

if (el) el.textContent = value;

}



function _initials(nombre, apellido) {

return `${(nombre||'')[0]||''}${(apellido||'')[0]||''}`.toUpperCase();

}



function _esc(str) {

return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

}tengo esta consulta que me muestra super bien los datos del profesor quiero que me funcione el del admin que ahora te paso la vista y decime si necesitasx las rutas o algo y yo te lo paso

Entendido. Para ayudarte a migrar o adaptar la funcionalidad para la vista del Administrador, necesito que sigamos un proceso lógico.

Como estás trabajando en el sistema "Gol Ahora", es fundamental mantener la coherencia entre el rol de Profesor y el de Administrador. Para darte una solución precisa, por favor compárteme lo siguiente:

La vista (HTML) del Administrador: Necesito ver la estructura (los IDs de los elementos donde quieres inyectar los datos, similar a cómo usas _setText('disp-nombre', ...) en el código del profesor).

Las rutas del Backend (si las tienes): Necesito saber qué endpoint usará el Administrador para obtener su información. Por ejemplo: ¿Es /admin/info o sigue siendo /profesor/info pero con un middleware que valide el rol?

¿Qué lógica específica buscas para el Admin? ¿Necesitas que vea exactamente lo mismo que el profesor, o tiene funciones adicionales (ej: gestionar otros usuarios, aprobar certificaciones, etc.)?

Pasos a seguir para la adaptación:
Una vez que me pases esa información, seguiremos este flujo de trabajo:

Mapping de Datos: Identificaré si los campos que recibes en el JSON del Admin coinciden con los que el front espera (o si debemos crear un nuevo objeto _adminCache similar a _perfilCache).

Ajuste de Endpoints: Adaptaremos los fetch para que apunten a los recursos correctos de administración.

Reutilización de Lógica: Optimizaremos el código para no repetir funciones que pueden ser genéricas (como los helpers _setText o _initials).

Nota sobre la arquitectura:
Si el Administrador va a tener su propio archivo de JavaScript, asegúrate de mantener la consistencia en el manejo de sesiones. Para entender mejor cómo estructurar esto, ¿te gustaría que te explique cómo separar la lógica común (helpers) de la lógica específica de cada rol (controllers)?

Quedo a la espera de la vista del Administrador y las rutas que tienes pensadas o implementadas.

la vista es la q te pase captura router.get('/info', usuarioController.obtenerInfoUsuarioLogueado);

Perfecto. Dado que el endpoint es /info y la estructura de la tarjeta que me compartiste es muy similar a la del profesor, la integración será directa.

Para que funcione correctamente, asumo que tu vista (HTML) tiene IDs correspondientes en los elementos que quieres actualizar (Email, Teléfono, DNI). Si no los tienes, asegúrate de agregarlos para que el JavaScript pueda encontrarlos.

Aquí tienes la propuesta de cómo debería lucir la función JavaScript para el Administrador:

1. Preparación del HTML (Asegúrate de que tengan estos IDs)
En tu vista HTML, los elementos deberían verse así:

HTML
<div id="disp-email">---</div>
<div id="disp-telefono">---</div>
<div id="disp-dni">---</div>
<span id="card-resumen-estado">Activo</span>
2. Lógica en JavaScript
Puedes reutilizar los helpers que ya tienes (_setText). Esta función se encargará de pedir los datos al endpoint /info y mapearlos a la vista:

JavaScript
/* -----------------------------------------------------------------------
   PERFIL ADMIN  →  GET /info
   JSON esperado: { nombre, apellido, dni, telefono, email, estado, ... }
----------------------------------------------------------------------- */
async function ConsultarPerfilAdmin() {
    try {
        const res = await fetch(`${API}/info`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("No se pudo obtener la info del usuario");
        
        const d = await res.json();

        // Actualización de campos en la vista
        _setText('disp-email',    d.email    || '—');
        _setText('disp-telefono', d.telefono || '—');
        _setText('disp-dni',      d.dni      || '—');
        _setText('card-resumen-estado', d.estado || 'Activo');
        
        // Si tienes el nombre en el top bar o sidebar
        const completo = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        _setText('top-navbar-user-name', completo);
        
    } catch (error) {
        console.error("Error al cargar perfil admin:", error);
    }
}
Recomendaciones para tu implementación:
Consistencia de Sesión: Como estás usando credentials: "include", asegúrate de que el backend esté validando la sesión mediante la cookie/token en ese endpoint /info.

Manejo de estados: Si el campo estado en tu base de datos puede cambiar (ej. de "Activo" a "Inactivo"), considera aplicar una clase CSS dinámica después de _setText para cambiar el color del badge (verde para activo, gris/rojo para otros).

Seguridad: Como este endpoint lo usan tanto profesores como administradores (según tu ruta), asegúrate de que el usuarioController.obtenerInfoUsuarioLogueado valide que quien consulta sea realmente quien dice ser.

¿Necesitas que te ayude a modificar el usuarioController en el backend para que devuelva exactamente los campos que tu vista necesita, o eso ya lo tienes resuelto?

<!DOCTYPE html>

<html lang="es">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Gol Ahora — Panel Administrador</title>

    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <link rel="stylesheet" href="css/style.css">

</head>

<body class="bg-football-dark text-light">



<div class="d-flex" id="wrapper">



    <!-- ===================== SIDEBAR ===================== -->

    <div id="sidebar-wrapper">



        <!-- Logo -->

        <a href="/admin/interfazAdministrador"

           class="sidebar-heading text-white fw-bold d-flex align-items-center p-3 border-bottom border-secondary border-opacity-25 text-decoration-none"

           style="transition:opacity 0.2s;"

           onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">

            <i class="fa-solid fa-futbol text-sports me-2"></i> GOL AHORA

        </a>



        <!-- Avatar admin -->

        <div class="p-3 border-bottom border-secondary border-opacity-25" style="background:rgba(0,0,0,0.15);">

            <div class="d-flex align-items-center gap-2">

                <div class="bg-success bg-opacity-10 text-sports rounded-circle d-flex align-items-center justify-content-center"

                     style="width:40px;height:40px;flex-shrink:0;">

                    <i class="fa-solid fa-user-shield"></i>

                </div>

                <div>

                    <div class="fw-bold text-white lh-1 small">Panel Admin</div>

                    <span class="text-sports text-uppercase fw-bold" style="font-size:0.63rem;letter-spacing:0.8px;">Administrador</span>

                </div>

            </div>

        </div>



        <!-- Menú con acordeón Bootstrap 5 -->

        <div class="flex-grow-1 py-2" style="overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(0,193,110,0.3) transparent;">



            <!-- Usuarios -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-usuarios" aria-expanded="false">

                    <span><i class="fa-solid fa-users me-2" style="width:16px;"></i>Usuarios</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-usuarios">

                    <a href="/admin/RegistrarCliente" class="sidebar-sub-link">

                        <i class="fa-solid fa-plus" style="width:14px;"></i>Registrar usuario

                    </a>

                    <a href="/admin/ConsultaClientes" class="sidebar-sub-link">

                        <i class="fa-solid fa-magnifying-glass" style="width:14px;"></i>Listar / Modificar / Eliminar

                    </a>

                </div>

            </div>



            <!-- Profesionales -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-profesionales" aria-expanded="false">

                    <span><i class="fa-solid fa-chalkboard-user me-2" style="width:16px;"></i>Profesionales</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-profesionales">

                    <a href="/admin/RegistrarProfesional" class="sidebar-sub-link">

                        <i class="fa-solid fa-plus" style="width:14px;"></i>Registrar profesional

                    </a>

                    <a href="/admin/ListarProfesionales" class="sidebar-sub-link">

                        <i class="fa-solid fa-magnifying-glass" style="width:14px;"></i>Listar / Modificar / Eliminar

                    </a>

                </div>

            </div>



            <!-- Reservas -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-reservas" aria-expanded="false">

                    <span><i class="fa-solid fa-calendar-alt me-2" style="width:16px;"></i>Reservas</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-reservas">

                    <a href="/admin/RegistrarReserva" class="sidebar-sub-link">

                        <i class="fa-solid fa-marker" style="width:14px;"></i>Registrar reserva

                    </a>

                    <a href="/admin/ListarReservas" class="sidebar-sub-link">

                        <i class="fa-solid fa-list-ul" style="width:14px;"></i>Listar / Modificar / Cancelar

                    </a>

                </div>

            </div>



            <!-- Canchas -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-canchas" aria-expanded="false">

                    <span><i class="fa-solid fa-futbol me-2" style="width:16px;"></i>Canchas</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-canchas">

                    <a href="/admin/RegistrarTipoDeCancha" class="sidebar-sub-link">

                        <i class="fa-solid fa-layer-group" style="width:14px;"></i>Registrar tipo de cancha

                    </a>

                    <a href="/admin/RegistrarCancha" class="sidebar-sub-link">

                        <i class="fa-solid fa-plus-circle" style="width:14px;"></i>Registrar nueva cancha

                    </a>

                    <a href="/admin/VerCanchas" class="sidebar-sub-link">

                        <i class="fa-solid fa-eye" style="width:14px;"></i>Listar / Modificar / Eliminar

                    </a>

                    <a href="/admin/ListarTiposCanchas" class="sidebar-sub-link">

                        <i class="fa-solid fa-layer-group" style="width:14px;"></i>Tipos de canchas

                    </a>

                </div>

            </div>



            <!-- Descuentos — directo -->

            <div class="mb-1">

                <a href="/admin/Descuentos" class="sidebar-direct-link">

                    <i class="fa-solid fa-tags me-2" style="width:16px;"></i>Descuentos

                </a>

            </div>



            <!-- Competencias -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-competencias" aria-expanded="false">

                    <span><i class="fa-solid fa-trophy me-2" style="width:16px;"></i>Competencias</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-competencias">

                    <a href="/admin/Ligas" class="sidebar-sub-link">

                        <i class="fa-solid fa-list-ol" style="width:14px;"></i>Ligas

                    </a>

                    <a href="/admin/Torneos" class="sidebar-sub-link">

                        <i class="fa-solid fa-medal" style="width:14px;"></i>Torneos

                    </a>

                </div>

            </div>



            <!-- Capacitaciones -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-capacitaciones" aria-expanded="false">

                    <span><i class="fa-solid fa-graduation-cap me-2" style="width:16px;"></i>Capacitaciones</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-capacitaciones">

                    <a href="/admin/Clases" class="sidebar-sub-link">

                        <i class="fa-solid fa-chalkboard-user" style="width:14px;"></i>Clases

                    </a>

                    <a href="/admin/Entrenamientos" class="sidebar-sub-link">

                        <i class="fa-solid fa-dumbbell" style="width:14px;"></i>Entrenamientos

                    </a>

                </div>

            </div>



            <!-- Finanzas -->

            <div class="mb-1">

                <button class="sidebar-section-btn" type="button"

                        data-bs-toggle="collapse" data-bs-target="#sub-finanzas" aria-expanded="false">

                    <span><i class="fa-solid fa-dollar-sign me-2" style="width:16px;"></i>Finanzas</span>

                    <i class="fa-solid fa-chevron-down chevron"></i>

                </button>

                <div class="collapse sidebar-submenu" id="sub-finanzas">

                    <a href="/admin/Cobros" class="sidebar-sub-link">

                        <i class="fa-solid fa-cash-register" style="width:14px;"></i>Cobros

                    </a>

                    <a href="Recibos.html" class="sidebar-sub-link">

                        <i class="fa-solid fa-receipt" style="width:14px;"></i>Recibos

                    </a>

                </div>

            </div>



            <!-- Reportes — directo -->

            <div class="mb-1">

                <a href="Reportes.html" class="sidebar-direct-link">

                    <i class="fa-solid fa-chart-bar me-2" style="width:16px;"></i>Reportes

                </a>

            </div>



        </div>



        <!-- Cerrar sesión + branding -->

        <div class="p-3 border-top border-secondary border-opacity-25" style="background:rgba(0,0,0,0.15);">

            <button onclick="cerrarSesionAdmin()"

                    class="btn sidebar-logout w-100 d-flex align-items-center justify-content-start gap-2 mb-3">

                <i class="fa-solid fa-right-from-bracket"></i>

                <span>Cerrar sesión</span>

            </button>

            <div class="d-flex align-items-center gap-2 px-1">

                <div class="bg-success bg-opacity-10 text-sports rounded-circle d-flex align-items-center justify-content-center fw-bold"

                     style="width:32px;height:32px;font-size:0.7rem;flex-shrink:0;">GA</div>

                <span class="text-white fw-semibold" style="font-size:0.82rem;">Gol Ahora Club</span>

            </div>

        </div>



    </div>

    <!-- ===================== /SIDEBAR ===================== -->



    <div id="page-content-wrapper" class="w-100 d-flex flex-column">



        <!-- TOPBAR -->

        <nav class="navbar navbar-dark bg-navy border-bottom border-secondary border-opacity-25 px-4 py-2">

            <button class="btn btn-outline-success btn-sm border-sports text-sports" id="menu-toggle">

                <i class="fa-solid fa-bars"></i>

            </button>

            <span class="navbar-brand fw-bold text-white mb-0 ms-3 small text-uppercase" style="letter-spacing:1px;">

                <i class="fa-solid fa-futbol text-sports me-2"></i>Gol Ahora

            </span>

            <span class="small fw-medium ms-auto" id="nav-fecha" style="color:var(--text-light-50);"></span>

        </nav>



        <!-- CONTENIDO PRINCIPAL -->

        <div class="container-fluid px-4 py-4 flex-grow-1" style="overflow-y:auto;" id="main-content">



            <!-- Encabezado -->

            <div class="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary border-opacity-25 pb-3">

                <div>

                    <h4 class="fw-bold text-white mb-1">Panel de Administración</h4>

                    <p class="mb-0 small" style="color:var(--text-light-50);">

                        Bienvenido al panel de control de Gol Ahora.

                    </p>

                </div>

                <span class="badge px-3 py-2"

                      style="background:rgba(0,193,110,0.1);border:1px solid rgba(0,193,110,0.3);color:#00C16E;font-size:0.72rem;letter-spacing:0.4px;">

                    <i class="fa-solid fa-shield-halved me-1"></i>Administrador

                </span>

            </div>



            <div class="row g-4">



                <!-- ================================================

                     COLUMNA IZQUIERDA — Datos del admin + contadores

                     ================================================ -->

                <div class="col-lg-4 d-flex flex-column gap-3">



                    <!-- Card datos del admin -->

                    <div class="admin-dash-card">

                        <div class="d-flex align-items-center gap-3 mb-3">

                            <div class="bg-success bg-opacity-10 text-sports rounded-circle d-flex align-items-center justify-content-center fw-bold"

                                 style="width:52px;height:52px;font-size:1.1rem;flex-shrink:0;">

                                <i class="fa-solid fa-user-shield"></i>

                            </div>

                            <div>

                                <div class="fw-bold text-white" id="admin-nombre">Gol Ahora Club</div>

                                <span style="font-size:0.68rem;color:var(--sports-green);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Administrador</span>

                            </div>

                        </div>

                        <hr style="border-color:rgba(255,255,255,0.07);margin:0 0 12px 0;">

                        <div class="admin-dato-row">

                            <span class="admin-dato-label">Email</span>

                            <span class="admin-dato-val" id="admin-email">—</span>

                        </div>

                        <div class="admin-dato-row">

                            <span class="admin-dato-label">Teléfono</span>

                            <span class="admin-dato-val" id="admin-telefono">—</span>

                        </div>

                        <div class="admin-dato-row">

                            <span class="admin-dato-label">DNI</span>

                            <span class="admin-dato-val" id="admin-dni">—</span>

                        </div>

                        <div class="admin-dato-row" style="border-bottom:none;">

                            <span class="admin-dato-label">Estado</span>

                            <span style="display:inline-block;background:rgba(0,193,110,0.1);border:1px solid rgba(0,193,110,0.3);border-radius:4px;padding:2px 10px;font-size:0.72rem;color:#00C16E;font-weight:600;">Activo</span>

                        </div>

                    </div>



                    <!-- Contadores de pendientes -->

                    <div class="row g-2">

                        <div class="col-6">

                            <div class="admin-counter-card" style="border-left:3px solid #f0c040;">

                                <div class="admin-counter-num" id="cnt-certificaciones" style="color:#f0c040;">—</div>

                                <div class="admin-counter-label">Certificaciones<br>pendientes</div>

                            </div>

                        </div>

                        <div class="col-6">

                            <div class="admin-counter-card" style="border-left:3px solid #f25c54;">

                                <div class="admin-counter-num" id="cnt-bajas" style="color:#f25c54;">—</div>

                                <div class="admin-counter-label">Solicitudes<br>de baja</div>

                            </div>

                        </div>

                        <div class="col-6">

                            <div class="admin-counter-card" style="border-left:3px solid var(--sports-green);">

                                <div class="admin-counter-num" id="cnt-horarios" style="color:var(--sports-green);">—</div>

                                <div class="admin-counter-label">Cambios de<br>horario</div>

                            </div>

                        </div>

                        <div class="col-6">

                            <div class="admin-counter-card" style="border-left:3px solid #6ea8fe;">

                                <div class="admin-counter-num" id="cnt-alumnos" style="color:#6ea8fe;">—</div>

                                <div class="admin-counter-label">Alumnos<br>a dar de baja</div>

                            </div>

                        </div>

                    </div>



                </div>



                <!-- ================================================

                     COLUMNA DERECHA — Feed de notificaciones

                     ================================================ -->

                <div class="col-lg-8">

                    <div class="admin-dash-card h-100 d-flex flex-column">



                        <div class="d-flex justify-content-between align-items-center mb-3">

                            <h6 class="fw-bold text-sports text-uppercase mb-0" style="font-size:0.75rem;letter-spacing:1px;">

                                <i class="fa-solid fa-bell me-2"></i>Solicitudes Pendientes

                            </h6>

                            <button class="btn btn-xs border-0 px-2 py-1"

                                    style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);font-size:0.72rem;border-radius:4px;"

                                    onclick="CargarNotificaciones()">

                                <i class="fa-solid fa-rotate-right me-1"></i>Actualizar

                            </button>

                        </div>



                        <!-- Tabs de tipo de notificación -->

                        <ul class="nav mb-3" id="notif-tabs" style="border-bottom:1px solid rgba(255,255,255,0.08);gap:4px;">

                            <li>

                                <button class="notif-tab-btn active" data-tab="certificaciones" onclick="FiltrarTab(this)">

                                    <i class="fa-solid fa-graduation-cap me-1"></i>Certificaciones

                                </button>

                            </li>

                            <li>

                                <button class="notif-tab-btn" data-tab="bajas" onclick="FiltrarTab(this)">

                                    <i class="fa-solid fa-user-xmark me-1"></i>Bajas

                                </button>

                            </li>

                            <li>

                                <button class="notif-tab-btn" data-tab="horarios" onclick="FiltrarTab(this)">

                                    <i class="fa-solid fa-clock me-1"></i>Horarios

                                </button>

                            </li>

                        </ul>



                        <!-- Lista de notificaciones -->

                        <div id="notif-feed" class="d-flex flex-column gap-2"

                             style="overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:rgba(0,193,110,0.3) transparent;max-height:420px;">

                            <!-- Inyectado por JS -->

                            <div class="text-center py-5" style="color:var(--text-light-50);">

                                <div class="spinner-border spinner-border-sm text-success mb-3 d-block mx-auto" role="status"></div>

                                <span class="small">Cargando solicitudes...</span>

                            </div>

                        </div>



                    </div>

                </div>



            </div>

        </div>

    </div>

</div>



<!-- Back to top -->

<a href="#" class="back-to-top" id="back-to-top" title="Volver arriba">

    <i class="fa-solid fa-angle-up"></i>

</a>



<!-- SCRIPTS -->

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<script>



    const API = window.location.origin;



    /* ── Init ── */

    document.addEventListener('DOMContentLoaded', () => {

        ActivarMenuToggle();

        ActivarBackToTop();

        MostrarFecha();

        CargarDatosAdmin();

        CargarNotificaciones();

    });



    /* ── Sidebar toggle ── */

    function ActivarMenuToggle() {

        document.getElementById('menu-toggle')?.addEventListener('click', () => {

            document.getElementById('wrapper').classList.toggle('toggled');

        });

    }



    /* ── Fecha topbar ── */

    function MostrarFecha() {

        const el = document.getElementById('nav-fecha');

        if (!el) return;

        el.innerHTML = `<i class="fa-regular fa-calendar text-sports me-2"></i>${

            new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

        }`;

    }



    /* ── Back to top ── */

    function ActivarBackToTop() {

        const btn  = document.getElementById('back-to-top');

        const main = document.getElementById('main-content');

        if (!btn || !main) return;

        main.addEventListener('scroll', () => btn.classList.toggle('visible', main.scrollTop > 200));

        btn.addEventListener('click', e => { e.preventDefault(); main.scrollTo({ top: 0, behavior: 'smooth' }); });

    }



    /* ── Datos del admin ── */

    async function CargarDatosAdmin() {

        try {

            const res = await fetch(${API}/admin/perfil, { credentials: 'include' });

            if (!res.ok) throw new Error();

            const d = await res.json();

            document.getElementById('admin-nombre').textContent   = ${d.nombre || ''} ${d.apellido || ''}.trim() || 'Gol Ahora Club';

            document.getElementById('admin-email').textContent    = d.email    || '—';

            document.getElementById('admin-telefono').textContent = d.telefono || '—';

            document.getElementById('admin-dni').textContent      = d.dni      || '—';

        } catch { /* mantiene valores por defecto */ }

    }



    /* ── Notificaciones ── */

    // Estado global de notificaciones por tipo

    let _notifs = { certificaciones: [], bajas: [], horarios: [] };

    let _tabActiva = 'certificaciones';



    async function CargarNotificaciones() {

        MostrarSpinner();

        try {

            const [resCert, resBajas, resHorarios] = await Promise.all([

                    fetch(${API}/admin/certificaciones/pendientes, { credentials: 'include' }),

                fetch(${API}/admin/bajas/pendientes,           { credentials: 'include' }),

            fetch(${API}/admin/horarios/pendientes,        { credentials: 'include' })

        ]);



            _notifs.certificaciones = resCert.ok    ? await resCert.json()    : [];

            _notifs.bajas           = resBajas.ok   ? await resBajas.json()   : [];

            _notifs.horarios        = resHorarios.ok ? await resHorarios.json(): [];



        } catch {

            _notifs = { certificaciones: [], bajas: [], horarios: [] };

        }



        // Actualizar contadores

        _setText('cnt-certificaciones', _notifs.certificaciones.length || '0');

        _setText('cnt-bajas',           (_notifs.bajas.filter(b => b.tipo === 'alumno') || _notifs.bajas).length || '0');

        _setText('cnt-horarios',        _notifs.horarios.length || '0');

        _setText('cnt-alumnos',         (_notifs.bajas.filter(b => b.tipo === 'alumno') || []).length || '0');



        RenderizarFeed(_tabActiva);

    }



    function FiltrarTab(btn) {

        document.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));

        btn.classList.add('active');

        _tabActiva = btn.dataset.tab;

        RenderizarFeed(_tabActiva);

    }



    function RenderizarFeed(tab) {

        const feed = document.getElementById('notif-feed');

        if (!feed) return;



        const lista = _notifs[tab] || [];



        if (lista.length === 0) {

            feed.innerHTML = `

            <div class="text-center py-5" style="color:var(--text-light-50);">

                <i class="fa-solid fa-circle-check fa-2x mb-3 d-block" style="color:var(--sports-green);opacity:0.4;"></i>

                <span class="small">No hay solicitudes pendientes en esta categoría.</span>

            </div>`;

            return;

        }



        feed.innerHTML = lista.map(n => {

            const config = _getNotifConfig(tab, n);

            return `

            <div class="notif-item" style="border-left:3px solid ${config.color};">

                <div class="d-flex justify-content-between align-items-start gap-2">

                    <div class="d-flex align-items-start gap-2 flex-grow-1 min-w-0">

                        <div class="notif-icon" style="background:${config.bg};color:${config.color};">

                            <i class="${config.icon}"></i>

                        </div>

                        <div class="min-w-0">

                            <div class="fw-semibold text-white small">${config.titulo}</div>

                            <div class="text-truncate" style="font-size:0.78rem;color:var(--text-light-50);">${config.subtitulo}</div>

                            ${n.fecha ? <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);margin-top:2px;">${n.fecha}</div> : ''}

                        </div>

                    </div>

                    <div class="d-flex gap-1 flex-shrink-0">

                        <button class="notif-btn-ok" onclick="AcceptarSolicitud('${tab}','${n.id}', this)" title="Aprobar">

                            <i class="fa-solid fa-check"></i>

                        </button>

                        <button class="notif-btn-x" onclick="RechazarSolicitud('${tab}','${n.id}', this)" title="Rechazar">

                            <i class="fa-solid fa-xmark"></i>

                        </button>

                    </div>

                </div>

            </div>`;

        }).join('');

    }



    function _getNotifConfig(tab, n) {

        if (tab === 'certificaciones') return {

            icon: 'fa-solid fa-graduation-cap',

            color: '#f0c040', bg: 'rgba(240,192,64,0.1)',

            titulo: n.nombre_certificacion || 'Certificación sin nombre',

            subtitulo: ${n.nombre_profesional || '—'} · ${n.institucion || '—'}

    };

        if (tab === 'bajas') return {

            icon: 'fa-solid fa-user-xmark',

            color: '#f25c54', bg: 'rgba(242,92,84,0.1)',

            titulo: Baja de ${n.rol || 'usuario'}: ${n.nombre || '—'},

        subtitulo: n.motivo || 'Sin motivo especificado'

    };

        if (tab === 'horarios') return {

            icon: 'fa-solid fa-clock',

            color: 'var(--sports-green)', bg: 'rgba(0,193,110,0.1)',

            titulo: Cambio de horario: ${n.actividad || '—'},

        subtitulo: ${n.nombre_profesional || '—'} · ${n.horario_nuevo || '—'}

    };

        return { icon: 'fa-solid fa-bell', color: '#aaa', bg: 'rgba(255,255,255,0.05)', titulo: '—', subtitulo: '—' };

    }



    /* ── Acciones sobre notificaciones ── */

    async function AcceptarSolicitud(tab, id, btn) {

        const labels = { certificaciones: 'certificación', bajas: 'solicitud de baja', horarios: 'cambio de horario' };

        const rutas  = { certificaciones: /admin/certificaciones/${id}/aprobar, bajas: /admin/bajas/${id}/aprobar, horarios: /admin/horarios/${id}/aprobar };



        const confirm = await Swal.fire({

            title: '¿Aprobar solicitud?',

            html: Se aprobará esta ${labels[tab]}.,

            icon: 'question', iconColor: '#00C16E',

            showCancelButton: true,

            confirmButtonColor: '#00C16E', cancelButtonColor: '#6c757d',

            confirmButtonText: 'Sí, aprobar', cancelButtonText: 'Cancelar',

            reverseButtons: true

        });

        if (!confirm.isConfirmed) return;



        try {

            const res = await fetch(${API}${rutas[tab]}, { method: 'POST', credentials: 'include' });

            if (res.ok) {

                Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Aprobado', text: 'La solicitud fue procesada correctamente.', confirmButtonColor: '#00C16E', timer: 2000, showConfirmButton: false });

                CargarNotificaciones();

            } else throw new Error();

        } catch {

            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la solicitud.', confirmButtonColor: '#00C16E' });

        }

    }



        async function RechazarSolicitud(tab, id, btn) {

            const labels = { certificaciones: 'certificación', bajas: 'solicitud de baja', horarios: 'cambio de horario' };

            const rutas  = { certificaciones: /admin/certificaciones/${id}/rechazar, bajas: /admin/bajas/${id}/rechazar, horarios: /admin/horarios/${id}/rechazar };



            const confirm = await Swal.fire({

                title: '¿Rechazar solicitud?',

                html: Se rechazará esta ${labels[tab]}.,

                icon: 'warning', iconColor: '#f25c54',

                showCancelButton: true,

                confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',

                confirmButtonText: 'Sí, rechazar', cancelButtonText: 'Cancelar',

                reverseButtons: true

            });

            if (!confirm.isConfirmed) return;



            try {

                const res = await fetch(${API}${rutas[tab]}, { method: 'POST', credentials: 'include' });

                if (res.ok) {

                    Swal.fire({ icon: 'success', iconColor: '#00C16E', title: 'Rechazado', text: 'La solicitud fue rechazada.', confirmButtonColor: '#00C16E', timer: 2000, showConfirmButton: false });

                    CargarNotificaciones();

                } else throw new Error();

            } catch {

                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo rechazar la solicitud.', confirmButtonColor: '#00C16E' });

            }

        }



            function MostrarSpinner() {

                const feed = document.getElementById('notif-feed');

                if (feed) feed.innerHTML = `

        <div class="text-center py-5" style="color:var(--text-light-50);">

            <div class="spinner-border spinner-border-sm text-success mb-3 d-block mx-auto" role="status"></div>

            <span class="small">Cargando solicitudes...</span>

        </div>`;

            }



            /* ── Cerrar sesión ── */

            function cerrarSesionAdmin() {

                Swal.fire({

                    title: '¿Cerrar sesión?',

                    text: 'Serás redirigido al inicio de la aplicación.',

                    icon: 'question', iconColor: '#00C16E',

                    showCancelButton: true,

                    confirmButtonColor: '#00C16E', cancelButtonColor: '#6c757d',

                    confirmButtonText: '<i class="fa-solid fa-right-from-bracket me-1"></i>Sí, cerrar sesión',

                    cancelButtonText: 'Cancelar', reverseButtons: true

                }).then(async result => {

                    if (!result.isConfirmed) return;

                    try { await fetch(${API}/logout, { method: 'POST', credentials: 'include' }); } catch {}

                        window.location.href = '/acceder';

                    });

                }



                /* ── Helper ── */

                function _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }



</script>

</body>

</html> esta es la interfaz del administrador,decime si cambio algo

He revisado tu código para la interfaz del administrador (interfazAdministrador) y la lógica de JavaScript que implementaste. La estructura es sólida, coherente con el panel del profesor y utiliza los mismos patrones de diseño, lo cual es excelente para el mantenimiento del sistema.

Sin embargo, hay un error de sintaxis crítico en las plantillas de cadena (template literals) de tu JavaScript que impedirá que las peticiones fetch funcionen.

1. Corrección de Sintaxis (Importante)
En JavaScript, para insertar variables dentro de una cadena, debes usar el signo de dólar y llaves ${variable} dentro de comillas invertidas (backticks `), no comillas simples '.

En tu código actual tienes:
fetch(${API}/admin/perfil, ...)

Debe ser:
fetch(\${API}/admin/perfil`, { ... })`

Aquí tienes el bloque corregido para que lo reemplaces en tu script (aplica esta misma corrección en todas las funciones que usan fetch):

JavaScript
/* ── Datos del admin ── */
async function CargarDatosAdmin() {
    try {
        const res = await fetch(`/admin/perfil`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const d = await res.json();
        
        // Corrección de sintaxis y lógica de nombre
        const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        document.getElementById('admin-nombre').textContent = nombreCompleto || 'Gol Ahora Club';
        
        document.getElementById('admin-email').textContent    = d.email    || '—';
        document.getElementById('admin-telefono').textContent = d.telefono || '—';
        document.getElementById('admin-dni').textContent      = d.dni      || '—';
    } catch { 
        console.warn("No se pudieron cargar los datos del admin");
    }
}

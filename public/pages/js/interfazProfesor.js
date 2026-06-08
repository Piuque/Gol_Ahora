/* ==========================================================================
   GOL AHORA — interfazProfesor.js
   ========================================================================== */

const API = window.location.origin;
let datosPerfilGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionYPerfil();
    ActivarMenuToggle();
    ConsultarDashboardOperativo();

    const tabTorneos = document.getElementById('torneos-tab');
    if (tabTorneos) {
        tabTorneos.addEventListener('shown.bs.tab', ConsultarCompetencias);
    }
});

function ActivarMenuToggle() {
    if (typeof activarMenuToggleTecnico === 'function') activarMenuToggleTecnico();
}

async function verificarSesionYPerfil() {
    try {
        const res = await fetch(`${API}/profesor/info`, { credentials: 'include' });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/pages/acceder.html';
            return;
        }
        if (!res.ok) throw new Error();
        datosPerfilGlobal = await res.json();
        renderizarSidebar(datosPerfilGlobal);
    } catch {
        Swal.fire({
            icon: 'error', title: 'Error de conexión',
            text: 'No pudimos cargar tu información.',
            confirmButtonColor: '#00C16E'
        });
    }
}

function renderizarSidebar(datos) {
    if (typeof renderizarSidebarTecnico === 'function') renderizarSidebarTecnico(datos);
}

async function ConsultarDashboardOperativo() {
    try {
        const res = await fetch(`${API}/profesor/clases`, { credentials: 'include' });
        if (res.ok) InyectarTablaClases(await res.json());
        else InyectarTablaClases([]);
        InyectarTablaAlumnos([]);
    } catch {
        InyectarTablaClases([]);
        InyectarTablaAlumnos([]);
    }
}

function InyectarTablaClases(lista) {
    const tbody = document.getElementById('tabla-clases-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-light-50">
            <i class="fa-solid fa-chalkboard fa-lg me-2"></i>No posee clases en su agenda.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => {
        const horario = `${c.hora_inicio || ''} – ${c.hora_fin || ''}`;
        const fecha = c.fecha_turno ? `<br><small class="text-light-50">${c.fecha_turno}</small>` : '';
        return `<tr>
            <td class="fw-semibold text-white"><i class="fa-solid fa-chalkboard text-warning me-2"></i>${c.nombre}</td>
            <td class="text-light-75">${horario}${fecha}</td>
            <td class="text-light-75">${c.cancha_nombre || '—'}</td>
            <td class="text-light-75">Capacidad: ${c.capacidad_max || '—'}</td>
            <td><span class="badge bg-warning bg-opacity-10 border border-warning border-opacity-25 text-warning px-2">${c.inscriptos || 0} inscriptos</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning text-warning"
                    onclick="ConsultarAlumnosPorClase('${c.id_clase}', \`${_esc(c.nombre)}\`)">
                    <i class="fa-solid fa-users me-1"></i>Ver alumnos
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.ConsultarAlumnosPorClase = async function(idClase, nombreClase) {
    const titulo = document.getElementById('titulo-tabla-alumnos');
    if (titulo) titulo.textContent = `Alumnos — ${nombreClase}`;

    const tbody = document.getElementById('tabla-alumnos-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-light-50">
        <div class="spinner-border spinner-border-sm text-warning me-2"></div>Cargando alumnos...</td></tr>`;

    try {
        const res = await fetch(`${API}/profesor/clases/${idClase}/alumnos`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        InyectarTablaAlumnos(await res.json(), idClase);
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-light-50">No se pudieron cargar los alumnos.</td></tr>`;
    }
};

function InyectarTablaAlumnos(lista, idClase) {
    const tbody = document.getElementById('tabla-alumnos-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-light-50">No hay alumnos inscriptos.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const badge = a.asistencia
            ? `<span class="badge px-2" style="background:rgba(255,193,7,0.12);border:1px solid rgba(255,193,7,0.35);color:#ffc107;">${a.asistencia}</span>`
            : `<span class="badge px-2 text-light-50">—</span>`;
        return `<tr>
            <td class="fw-semibold text-white">${a.nombre} ${a.apellido}</td>
            <td class="text-light-50 small">${a.dni || '—'}</td>
            <td class="text-light-75">${a.telefono || '—'}</td>
            <td>${badge}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="ProcesarBajaAlumno('${idClase}', '${a.id_usuario}', '${_esc(a.nombre)} ${_esc(a.apellido)}')">
                    <i class="fa-solid fa-user-minus me-1"></i>Dar Baja
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.ProcesarBajaAlumno = function(idClase, idAlumno, nombre) {
    Swal.fire({
        title: '¿Dar de baja?', html: `Se dará de baja a <strong>${nombre}</strong>.`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, dar de baja', cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API}/profesor/clases/${idClase}/alumnos/${idAlumno}`, {
                method: 'DELETE', credentials: 'include'
            });
            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Baja registrada', confirmButtonColor: '#00C16E' });
                ConsultarAlumnosPorClase(idClase, '');
                ConsultarDashboardOperativo();
            } else throw new Error();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la baja.' });
        }
    });
};

async function ConsultarCompetencias() {
    const tbody = document.getElementById('tabla-ligas-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-light-50">
        <div class="spinner-border spinner-border-sm text-warning me-2"></div>Cargando competencias...</td></tr>`;

    try {
        const res = await fetch(`${API}/profesor/competencias`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        InyectarTablaCompetencias(await res.json());
    } catch {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-light-50">No se pudieron cargar ligas y torneos.</td></tr>`;
    }
}

function InyectarTablaCompetencias(lista) {
    const tbody = document.getElementById('tabla-ligas-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-light-50">
            <i class="fa-solid fa-trophy me-2 opacity-50"></i>No tenés ligas ni torneos asignados como tutor.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => {
        const estadoClass = c.estado === 'En curso' ? 'text-success' : (c.estado === 'Programado' ? 'text-warning' : 'text-light-50');
        return `<tr>
            <td class="fw-semibold text-white">${c.nombre}</td>
            <td class="text-light-75">${c.fecha_encuentro || '—'}${c.fecha_fin ? ' → ' + c.fecha_fin : ''}</td>
            <td><span class="badge bg-dark border border-secondary">${c.categoria}</span></td>
            <td class="${estadoClass} fw-medium">${c.estado || '—'}</td>
            <td class="text-light-75">${c.participantes ?? 0} equipos</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning text-warning"
                    onclick="verPlanillaCompetencia('${c.categoria}', ${c.id}, '${_esc(c.nombre)}')">
                    <i class="fa-solid fa-list-check me-1"></i>Planilla
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.verPlanillaCompetencia = async function(categoria, id, nombre) {
    try {
        const res = await fetch(`${API}/profesor/competencias/${categoria}/${id}/planilla`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const equipos = data.equipos || [];
        const listaHtml = equipos.length
            ? `<ul style="text-align:left;padding-left:1.2rem;margin:0;">${equipos.map(e => `<li>${e.nombre}</li>`).join('')}</ul>`
            : '<p class="mb-0">Sin equipos inscriptos aún.</p>';

        Swal.fire({
            background: '#0A2540', color: '#fff', width: '480px',
            title: `Planilla — ${nombre}`,
            html: `<p class="small text-light-50 mb-2">${categoria} · ${equipos.length} equipo(s)</p>${listaHtml}`,
            confirmButtonColor: '#ffc107', confirmButtonText: 'Cerrar'
        });
    } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la planilla.' });
    }
};

function _esc(str) {
    return (str || '').replace(/'/g, "\\'").replace(/`/g, '\\`');
}

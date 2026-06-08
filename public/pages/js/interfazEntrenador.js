/* ==========================================================================
   GOL AHORA — interfazEntrenador.js
   ========================================================================== */

const API = window.location.origin;
let datosPerfilGlobal = null;

document.addEventListener('DOMContentLoaded', () => {
    verificarSesionYPerfil();
    ActivarMenuToggle();
    ConsultarDashboardOperativo();

    const tabCompetencias = document.getElementById('competencias-tab');
    if (tabCompetencias) {
        tabCompetencias.addEventListener('shown.bs.tab', ConsultarCompetencias);
    }
});

function ActivarMenuToggle() {
    if (typeof activarMenuToggleTecnico === 'function') activarMenuToggleTecnico();
}

async function verificarSesionYPerfil() {
    try {
        const res = await fetch(`${API}/entrenador/info`, { credentials: 'include' });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/acceder';
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

/* --- Dashboard entrenamientos --- */
async function ConsultarDashboardOperativo() {
    try {
        const res = await fetch(`${API}/entrenador/entrenamientos`, { credentials: 'include' });
        if (res.ok) InyectarTablaEntrenamientos(await res.json());
        else InyectarTablaEntrenamientos([]);
        InyectarTablaAlumnos([]);
    } catch {
        InyectarTablaEntrenamientos([]);
        InyectarTablaAlumnos([]);
    }
}

function InyectarTablaEntrenamientos(lista) {
    const tbody = document.getElementById('tabla-entrenamientos-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-light-50">
            <i class="fa-solid fa-dumbbell fa-lg me-2"></i>No posee entrenamientos en su agenda.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(e => {
        const horario = `${e.hora_inicio || ''} – ${e.hora_fin || ''}`;
        const fecha = e.fecha_turno ? `<br><small class="text-light-50">${e.fecha_turno}</small>` : '';
        return `<tr>
            <td class="fw-semibold text-white"><i class="fa-solid fa-dumbbell text-danger me-2"></i>${e.nombre}</td>
            <td class="text-light-75">${horario}${fecha}</td>
            <td class="text-light-75">${e.cancha_nombre || '—'}</td>
            <td class="text-light-75">Capacidad: ${e.capacidad_max || '—'}</td>
            <td><span class="badge bg-success bg-opacity-10 border border-success border-opacity-25 text-success px-2">${e.inscriptos || 0} inscriptos</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-success border-sports text-sports"
                    onclick="ConsultarAlumnosPorEntrenamiento('${e.id_entrenamiento}', \`${_esc(e.nombre)}\`)">
                    <i class="fa-solid fa-users me-1"></i>Ver alumnos
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.ConsultarAlumnosPorEntrenamiento = async function(idEntrenamiento, nombreEntrenamiento) {
    const titulo = document.getElementById('titulo-tabla-alumnos');
    if (titulo) titulo.textContent = `Alumnos — ${nombreEntrenamiento}`;

    const tbody = document.getElementById('tabla-alumnos-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-light-50">
        <div class="spinner-border spinner-border-sm text-success me-2"></div>Cargando alumnos...</td></tr>`;

    try {
        const res = await fetch(`${API}/entrenador/entrenamientos/${idEntrenamiento}/alumnos`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        InyectarTablaAlumnos(await res.json(), idEntrenamiento);
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-light-50">No se pudieron cargar los alumnos.</td></tr>`;
    }
};

function InyectarTablaAlumnos(lista, idEntrenamiento) {
    const tbody = document.getElementById('tabla-alumnos-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-light-50">No hay alumnos inscriptos.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(a => {
        const badge = a.asistencia
            ? `<span class="badge px-2" style="background:rgba(0,193,110,0.1);border:1px solid rgba(0,193,110,0.3);color:#00C16E;">${a.asistencia}</span>`
            : `<span class="badge px-2 text-light-50">—</span>`;
        return `<tr>
            <td class="fw-semibold text-white">${a.nombre} ${a.apellido}</td>
            <td class="text-light-50 small">${a.dni || '—'}</td>
            <td class="text-light-75">${a.telefono || '—'}</td>
            <td>${badge}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="ProcesarBajaAlumno('${idEntrenamiento}', '${a.id_usuario}', '${_esc(a.nombre)} ${_esc(a.apellido)}')">
                    <i class="fa-solid fa-user-minus me-1"></i>Dar Baja
                </button>
            </td>
        </tr>`;
    }).join('');
}

window.ProcesarBajaAlumno = function(idEntrenamiento, idAlumno, nombre) {
    Swal.fire({
        title: '¿Dar de baja?', html: `Se dará de baja a <strong>${nombre}</strong>.`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#f25c54', cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, dar de baja', cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`${API}/entrenador/entrenamientos/${idEntrenamiento}/alumnos/${idAlumno}`, {
                method: 'DELETE', credentials: 'include'
            });
            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Solicitud registrada', text: 'Quedará pendiente de validación del administrador.', confirmButtonColor: '#00C16E' });
                ConsultarAlumnosPorEntrenamiento(idEntrenamiento, '');
                ConsultarDashboardOperativo();
            } else throw new Error();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la baja.' });
        }
    });
};

/* --- Ligas y torneos --- */
async function ConsultarCompetencias() {
    const tbody = document.getElementById('tabla-ligas-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-light-50">
        <div class="spinner-border spinner-border-sm text-success me-2"></div>Cargando competencias...</td></tr>`;

    try {
        const res = await fetch(`${API}/entrenador/competencias`, { credentials: 'include' });
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
        const res = await fetch(`${API}/entrenador/competencias/${categoria}/${id}/planilla`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const equipos = data.equipos || [];
        const partidos = data.partidos || [];
        const listaHtml = equipos.length
            ? `<ul style="text-align:left;padding-left:1.2rem;margin:0;">${equipos.map(e => `<li>${e.nombre}</li>`).join('')}</ul>`
            : '<p class="mb-0">Sin equipos inscriptos aún.</p>';
        const partidosHtml = partidos.length
            ? `<ul style="text-align:left;padding-left:1.2rem;margin:0;">${partidos.map(p => {
                const resultado = p.goles_local !== null ? ` <span class="text-success">(${p.goles_local}-${p.goles_visitante})</span>` : '';
                return `<li>${p.equipo_local} vs ${p.equipo_visitante}${resultado}</li>`;
            }).join('')}</ul>`
            : '<p class="mb-0">Sin partidos generados aún.</p>';

        Swal.fire({
            background: '#0A2540', color: '#fff', width: '520px',
            title: `Planilla — ${nombre}`,
            html: `<p class="small text-light-50 mb-2">${categoria} · ${equipos.length} equipo(s)</p>
                   <p class="small text-warning fw-bold mb-1">Equipos</p>${listaHtml}
                   <p class="small text-warning fw-bold mb-1 mt-3">Partidos</p>${partidosHtml}`,
            confirmButtonColor: '#00C16E', confirmButtonText: 'Cerrar'
        });
    } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la planilla.' });
    }
};

function _esc(str) {
    return (str || '').replace(/'/g, "\\'").replace(/`/g, '\\`');
}

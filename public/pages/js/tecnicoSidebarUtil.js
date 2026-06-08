/* Sidebar y sesión compartidos — entrenador / profesor */

function renderizarSidebarTecnico(datos) {
    const nombreEl = document.querySelector('.id-nombre-completo');
    if (nombreEl) {
        nombreEl.textContent = `${datos.nombre || ''} ${datos.apellido || ''}`.trim() || 'Usuario';
    }

    const set = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = val || 'No registrado';
    };

    set('.input-Dni', datos.dni);
    set('.input-Email', datos.email);
    set('.input-Telefono', datos.telefono);
    set('.input-Genero', datos.genero || 'No definido');
    set('.input-Nacionalidad', datos.nacionalidad || 'No definida');

    if (datos.fecha_nacimiento) {
        set('.input-Fecha', datos.fecha_nacimiento.split('T')[0]);
    } else {
        set('.input-Fecha', null);
    }

    let dir = 'No registrada';
    const d = datos.direccion || datos;
    if (d.calle && d.numero) {
        dir = `${d.calle} ${d.numero}${d.localidad ? ', ' + d.localidad : ''}`;
    }
    set('.input-Direccion', dir);

    const fechaActual = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const navWelcome = document.getElementById('nav-welcome');
    if (navWelcome) {
        navWelcome.innerHTML = `<i class="fa-regular fa-calendar text-sports me-2"></i>${fechaActual}`;
    }
}

function activarMenuToggleTecnico() {
    const btn = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');
    if (btn && wrapper) btn.addEventListener('click', () => wrapper.classList.toggle('toggled'));
}

function confirmarCierreSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Serás redirigido al inicio.',
        icon: 'question',
        iconColor: '#00C16E',
        showCancelButton: true,
        confirmButtonColor: '#00C16E',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (r) => {
        if (!r.isConfirmed) return;
        try { await fetch(`${window.location.origin}/logout`, { method: 'POST', credentials: 'include' }); } catch {}
        window.location.href = '/acceder';
    });
}

window.cerrarSesion = confirmarCierreSesion;
window.CerrarSesion = confirmarCierreSesion;

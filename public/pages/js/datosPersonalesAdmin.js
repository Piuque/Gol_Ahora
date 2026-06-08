async function CargarDatosAdmin() {
    const userId = localStorage.getItem("userId");
    try {
        const headers = {};
        if (userId && userId !== 'null' && userId !== 'undefined') {
            headers['x-user-id'] = userId;
        }
        const res = await fetch(`${API}/admin/info`, {
            credentials: 'include',
            headers: headers
        });
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/acceder';
            return;
        }
        if (!res.ok) throw new Error("Error " + res.status);
        const d = await res.json();
        const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim();
        document.getElementById('admin-nombre').textContent   = nombreCompleto || 'Gol Ahora Club';
        document.getElementById('admin-email').textContent    = d.email    || '—';
        document.getElementById('admin-telefono').textContent = d.telefono || '—';
        document.getElementById('admin-dni').textContent      = d.dni      || '—';
    } catch (err) {
        console.error("Error al cargar datos del administrador:", err);
    }
}

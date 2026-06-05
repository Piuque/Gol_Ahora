let clientesData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedor-clientes");
    const buscador = document.getElementById("buscador");
    const selector = document.getElementById("selector-rol");

    async function cargarUsuarios() {
        const rol = selector.value;
        contenedor.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
                <p class="text-light-50 mt-2 small">Cargando usuarios...</p>
            </div>`;

        try {
            const res = await fetch(`/api/${rol}`, { credentials: "include" });
            clientesData = await res.json();

            if (!clientesData || clientesData.length === 0) {
                contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No hay usuarios registrados.</p>`;
                return;
            }

            renderClientes(clientesData);

        } catch (error) {
            contenedor.innerHTML = `<p class="text-danger text-center py-4">Error al cargar los usuarios.</p>`;
        }
    }

    await cargarUsuarios();

    selector.addEventListener("change", () => {
        buscador.value = "";
        cargarUsuarios();
    });

    buscador.addEventListener("input", () => {
        const query = buscador.value.toLowerCase();
        const filtrados = clientesData.filter(c =>
            c.nombre.toLowerCase().includes(query) ||
            c.apellido.toLowerCase().includes(query) ||
            c.dni.includes(query)
        );
        renderClientes(filtrados);
    });
});

function renderClientes(clientes) {
    const contenedor = document.getElementById("contenedor-clientes");

    if (clientes.length === 0) {
        contenedor.innerHTML = `<p class="text-light-50 text-center py-4">No se encontraron usuarios.</p>`;
        return;
    }

    contenedor.innerHTML = "";
    clientes.forEach(c => {
        const iniciales = `${c.nombre[0]}${c.apellido[0]}`.toUpperCase();
        const div = document.createElement("div");
        div.className = "cliente-card d-flex align-items-center gap-3";
        div.onclick = () => verDetalle(c.id);
        div.innerHTML = `
            <div class="avatar">${iniciales}</div>
            <div class="flex-grow-1">
                <p class="text-white fw-bold mb-0">${c.nombre} ${c.apellido}</p>
                <p class="text-light-50 small mb-0">DNI: ${c.dni} · ${c.email}</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #00C16E;"></i>
        `;
        contenedor.appendChild(div);
    });
}

async function verDetalle(id) {
    try {
        const res = await fetch(`/api/users/user_id=${id}/full_info`, { credentials: "include" });
        const c = await res.json();

        document.getElementById("modal-nombre").textContent = `${c.nombre} ${c.apellido}`;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Username</span><span class="info-value">${c.username}</span></div>
            <div class="info-row"><span class="info-label">DNI</span><span class="info-value">${c.dni}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${c.email}</span></div>
            <div class="info-row"><span class="info-label">Teléfono</span><span class="info-value">${c.telefono}</span></div>
            <div class="info-row"><span class="info-label">Género</span><span class="info-value">${c.genero}</span></div>
            <div class="info-row"><span class="info-label">Nacimiento</span><span class="info-value">${c.fecha_nacimiento}</span></div>
            <div class="info-row"><span class="info-label">Nacionalidad</span><span class="info-value">${c.nacionalidad}</span></div>
            <div class="info-row"><span class="info-label">Registro</span><span class="info-value">${new Date(c.fecha_registro).toLocaleDateString('es-AR')}</span></div>
            <div class="info-row"><span class="info-label">Rol</span><span class="info-value">${c.user_level}</span></div>
            <p class="text-light-50 small mt-3 mb-1">Dirección</p>
            <div class="info-row"><span class="info-label">Calle</span><span class="info-value">${c.direccion.calle} ${c.direccion.numero}</span></div>
            <div class="info-row"><span class="info-label">Localidad</span><span class="info-value">${c.direccion.localidad}, ${c.direccion.ciudad}</span></div>
            <div class="info-row"><span class="info-label">Provincia</span><span class="info-value">${c.direccion.provincia}, ${c.direccion.pais}</span></div>
            <div class="info-row"><span class="info-label">CP</span><span class="info-value">${c.direccion.cp}</span></div>
        `;

        const modal = new bootstrap.Modal(document.getElementById("modalCliente"));
        modal.show();

    } catch (error) {
        console.error(error);
    }
}
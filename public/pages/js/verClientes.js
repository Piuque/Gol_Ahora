let clientesData = [];
let clienteSeleccionado = null;
let modalDetalle = null;
let modalEditar = null;
let cargarUsuariosFn;

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedor-clientes");
    const buscador = document.getElementById("buscador");
    const selector = document.getElementById("selector-rol");

    // Inicializar modales de Bootstrap
    modalDetalle = new bootstrap.Modal(document.getElementById("modalCliente"));
    modalEditar = new bootstrap.Modal(document.getElementById("modalEditarCliente"));

    async function cargarUsuarios() {
        const rol = selector.value;
        contenedor.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status"></div>
                <p class="text-light-50 mt-2 small">Cargando usuarios...</p>
            </div>`;

        try {
            const userId = localStorage.getItem("userId");
            const res = await fetch(`/admin/clientes`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                credentials: "include"
            });
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

    cargarUsuariosFn = cargarUsuarios;
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

    // Configurar botón Editar (abre el formulario en modalEditar)
    document.getElementById("btn-editar-cliente").addEventListener("click", () => {
        if (!clienteSeleccionado) return;
        
        // Cargar datos en el modal de edición
        document.getElementById("edit-id-usuario").value = clienteSeleccionado.id_usuario;
        document.getElementById("edit-nombre").value = clienteSeleccionado.nombre || "";
        document.getElementById("edit-apellido").value = clienteSeleccionado.apellido || "";
        document.getElementById("edit-email").value = clienteSeleccionado.email || "";
        document.getElementById("edit-telefono").value = clienteSeleccionado.telefono || "";
        document.getElementById("edit-user-level").value = clienteSeleccionado.user_level || "cliente";

        modalDetalle.hide();
        modalEditar.show();
    });

    // Configurar botón Dar de Baja
    document.getElementById("btn-eliminar-cliente").addEventListener("click", async () => {
        if (!clienteSeleccionado) return;

        const result = await Swal.fire({
            title: '¿Dar de baja al cliente?',
            text: `Esta acción eliminará al cliente ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido} y todas sus reservas/cobros asociados de forma permanente.`,
            icon: 'warning',
            background: '#071524',
            color: '#fff',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const userId = localStorage.getItem("userId");
                const res = await fetch(`/admin/clientes/${clienteSeleccionado.id_usuario}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-id": userId
                    },
                    credentials: "include"
                });

                if (res.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '¡Dado de baja!',
                        text: 'El cliente ha sido eliminado correctamente.',
                        background: '#071524',
                        color: '#fff',
                        confirmButtonColor: '#00C16E'
                    });
                    modalDetalle.hide();
                    await cargarUsuarios();
                } else {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "No se pudo dar de baja al cliente.");
                }
            } catch (error) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message,
                    background: '#071524',
                    color: '#fff',
                    confirmButtonColor: '#00C16E'
                });
            }
        }
    });

    // Enviar formulario de edición
    document.getElementById("form-editar-cliente").addEventListener("submit", async (e) => {
        e.preventDefault();

        const idUsuario = document.getElementById("edit-id-usuario").value;
        const datos = {
            nombre: document.getElementById("edit-nombre").value,
            apellido: document.getElementById("edit-apellido").value,
            email: document.getElementById("edit-email").value,
            telefono: document.getElementById("edit-telefono").value,
            user_level: document.getElementById("edit-user-level").value
        };

        try {
            const userId = localStorage.getItem("userId");
            const res = await fetch(`/admin/clientes/${idUsuario}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                credentials: "include",
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: 'Los datos del cliente han sido actualizados exitosamente.',
                    background: '#071524',
                    color: '#fff',
                    confirmButtonColor: '#00C16E'
                });
                modalEditar.hide();
                await cargarUsuarios();
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "No se pudo actualizar el cliente.");
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                background: '#071524',
                color: '#fff',
                confirmButtonColor: '#00C16E'
            });
        }
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
        div.onclick = () => verDetalle(c.id_usuario);
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
        const userId = localStorage.getItem("userId");
        const res = await fetch(`/admin/clientes/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": userId
            },
            credentials: "include"
        });
        const c = await res.json();

        clienteSeleccionado = c;

        document.getElementById("modal-nombre").textContent = `${c.nombre} ${c.apellido}`;
        document.getElementById("modal-info").innerHTML = `
            <div class="info-row"><span class="info-label">Username</span><span class="info-value">${c.username || '-'}</span></div>
            <div class="info-row"><span class="info-label">DNI</span><span class="info-value">${c.dni || '-'}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${c.email || '-'}</span></div>
            <div class="info-row"><span class="info-label">Teléfono</span><span class="info-value">${c.telefono || '-'}</span></div>
            <div class="info-row"><span class="info-label">Género</span><span class="info-value">${c.genero || '-'}</span></div>
            <div class="info-row"><span class="info-label">Nacimiento</span><span class="info-value">${c.fecha_nacimiento || '-'}</span></div>
            <div class="info-row"><span class="info-label">Nacionalidad</span><span class="info-value">${c.nacionalidad || '-'}</span></div>
            <div class="info-row"><span class="info-label">Registro</span><span class="info-value">${c.fecha_registro ? new Date(c.fecha_registro).toLocaleDateString('es-AR') : '-'}</span></div>
            <div class="info-row"><span class="info-label">Rol</span><span class="info-value">${c.user_level || '-'}</span></div>
            <p class="text-light-50 small mt-3 mb-1">Dirección</p>
            <div class="info-row"><span class="info-label">Calle</span><span class="info-value">${c.calle || ''} ${c.numero || ''}</span></div>
            <div class="info-row"><span class="info-label">Localidad</span><span class="info-value">${c.localidad || '-'}</span></div>
            <div class="info-row"><span class="info-label">Provincia</span><span class="info-value">${c.provincia || '-'}</span></div>
            <div class="info-row"><span class="info-label">CP</span><span class="info-value">${c.codigo_postal || '-'}</span></div>
        `;

        modalDetalle.show();

    } catch (error) {
        console.error(error);
    }
}

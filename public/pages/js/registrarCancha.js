document.addEventListener("DOMContentLoaded", async () => {

    // Cargar tipos de cancha para el selector
    const userId = localStorage.getItem("userId");
    try {
        const res = await fetch("/admin/tipos-cancha", {
            credentials: "include",
            headers: { "x-user-id": userId }
        });
        const tipos = await res.json();
        const selector = document.getElementById("id_tipo_de_cancha");
        selector.innerHTML = `<option value="">Seleccionar tipo...</option>`;
        tipos.forEach(t => {
            selector.innerHTML += `<option value="${t.id}">${t.tipo_cancha}</option>`;
        });
    } catch (e) {
        console.error("Error cargando tipos de cancha", e);
    }

    document.getElementById("register-form-cancha").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_tipo = document.getElementById("id_tipo_de_cancha").value;
        if (!id_tipo) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona un tipo de cancha.', confirmButtonColor: '#00C16E' });
            return;
        }

        const datos = {
            nombre: document.getElementById("nombre").value,
            tiempo_cancelacion: parseInt(document.getElementById("tiempo_cancelacion").value),
            precio_hora_reserva: parseFloat(document.getElementById("precio_hora_reserva").value),
            id_tipo_de_cancha: parseInt(id_tipo)
        };

        try {
            const userId = localStorage.getItem("userId");
            const res = await fetch("/admin/canchas/registrar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                credentials: "include",
                body: JSON.stringify(datos)
            });

            const data = await res.json();

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Listo!',
                    text: 'Cancha registrada correctamente.',
                    confirmButtonColor: '#00C16E'
                });
                document.getElementById("register-form-cancha").reset();
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
            }
        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
        }
    });
});
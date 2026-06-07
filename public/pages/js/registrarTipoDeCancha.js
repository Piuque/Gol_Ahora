document.addEventListener("DOMContentLoaded", async () => {

    document.getElementById("register-form-tipo-cancha").addEventListener("submit", async (e) => {
        e.preventDefault();

        const datos = {
            tipo_cancha: document.getElementById("tipo_cancha").value,
            ancho: parseFloat(document.getElementById("ancho").value),
            largo: parseFloat(document.getElementById("largo").value),
            capacidad: parseInt(document.getElementById("capacidad").value),
            duracion_min: parseInt(document.getElementById("duracion_min").value),
            duracion_max: parseInt(document.getElementById("duracion_max").value),
            id_superficie: 1
        };

        // Validaciones
        if (datos.duracion_min >= datos.duracion_max) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La duracion minima debe ser menor a la maxima.', confirmButtonColor: '#00C16E' });
            return;
        }

        if (datos.capacidad <= 0) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'La capacidad debe ser mayor a 0.', confirmButtonColor: '#00C16E' });
            return;
        }

        try {
            const userId = localStorage.getItem("userId");
            const res = await fetch("/admin/tipos-cancha", {
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
                    text: 'Tipo de cancha registrado correctamente.',
                    confirmButtonColor: '#00C16E'
                });
                document.getElementById("register-form-tipo-cancha").reset();
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: data.error || data.message, confirmButtonColor: '#00C16E' });
            }
        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar.', confirmButtonColor: '#00C16E' });
        }
    });
});
const mensajeError = document.getElementsByClassName("error")[0];

// ==========================================
// NACIONALIDAD CON AUTOCOMPLETADO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const paisInput = document.getElementById("nacionalidad");
  const suggestionsBox = document.getElementById("nacionalidad-suggestions");

  let paises = [];

  try {
    const response = await fetch("/api/paises");
    paises = await response.json();
  } catch (error) {
    console.error("Error al cargar nacionalidades:", error);
  }

  paisInput.addEventListener("input", () => {
    const query = paisInput.value.toLowerCase();
    suggestionsBox.innerHTML = "";

    if (query.length === 0) {
      suggestionsBox.style.display = "none";
      return;
    }

    // Lista simple de strings
    const matches = paises.filter(p => p.toLowerCase().includes(query));

    if (matches.length > 0) {
      matches.forEach(p => {
        const div = document.createElement("div");
        div.textContent = p;
        div.addEventListener("click", () => {
          paisInput.value = p;
          suggestionsBox.style.display = "none";
        });
        suggestionsBox.appendChild(div);
      });
      suggestionsBox.style.display = "block";
    } else {
      suggestionsBox.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== paisInput) {
      suggestionsBox.style.display = "none";
    }
  });
});


// ==========================================
// PAÍS CON AUTOCOMPLETADO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const paisInput = document.getElementById("pais");
  const suggestionsBox = document.getElementById("pais-suggestions");

  let paises = [];

  try {
    const response = await fetch("/api/paises");
    paises = await response.json();
  } catch (error) {
    console.error("Error al cargar países:", error);
  }

  paisInput.addEventListener("input", () => {
    const query = paisInput.value.toLowerCase();
    suggestionsBox.innerHTML = "";

    if (query.length === 0) {
      suggestionsBox.style.display = "none";
      return;
    }

    // Lista simple de strings
    const matches = paises.filter(p => p.toLowerCase().includes(query));

    if (matches.length > 0) {
      matches.forEach(p => {
        const div = document.createElement("div");
        div.textContent = p;
        div.addEventListener("click", () => {
          paisInput.value = p;
          suggestionsBox.style.display = "none";
        });
        suggestionsBox.appendChild(div);
      });
      suggestionsBox.style.display = "block";
    } else {
      suggestionsBox.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== paisInput) {
      suggestionsBox.style.display = "none";
    }
  });
});

// ==========================================
// ENVÍO DEL FORMULARIO
// ==========================================
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  mensajeError.classList.add("escondido");
  mensajeError.innerHTML = "";

  const nombre = document.getElementById('nombre').value.trim();
  const apellido = document.getElementById('apellido').value.trim();
  const dni = document.getElementById('dni').value.trim();
  const fecha_nacimiento = document.getElementById('fecha_nacimiento').value;
  const email = document.getElementById('email').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const genero = document.getElementById('genero').value;
  const nacionalidad = document.getElementById('nacionalidad').value.trim();
  const password = document.getElementById('password').value;
  const confirm_password = document.getElementById('confirm_password').value;
  const calle = document.getElementById('calle').value.trim();
  const numero = document.getElementById('numero').value.trim();
  const codigo_postal = document.getElementById('codigo_postal').value.trim();
  const pais = document.getElementById('pais').value.trim();
  const provincia = document.getElementById('provincia').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const localidad = document.getElementById('localidad').value.trim();

  // Helper local para mostrar errores
  const showError = async (text) => {
    mensajeError.innerHTML = text;
    mensajeError.classList.remove("escondido");
    await Swal.fire({
        icon: 'error',
        title: 'Error de Validación',
        text: text,
        confirmButtonColor: '#00C16E'
    });
  };

  // 1. Campos obligatorios
  if (!nombre || !apellido || !dni || !fecha_nacimiento || !email || !telefono || !genero || !nacionalidad || !password || !confirm_password || !calle || !numero || !codigo_postal || !pais || !provincia || !ciudad || !localidad) {
    await showError("Por favor, completa todos los campos del formulario.");
    return;
  }

  // 2. DNI: número entre 7 y 9 dígitos
  if (!/^\d{7,9}$/.test(dni)) {
    await showError("El DNI debe tener entre 7 y 9 dígitos numéricos sin puntos ni espacios.");
    return;
  }

  // 3. Fecha de nacimiento: no futura y año >= 1900
  const birthDate = new Date(fecha_nacimiento + 'T00:00:00');
  const minDate = new Date("1900-01-01T00:00:00");
  const today = new Date();
  if (isNaN(birthDate.getTime())) {
    await showError("Fecha de nacimiento inválida.");
    return;
  }
  if (birthDate < minDate) {
    await showError("La fecha de nacimiento no puede ser anterior al año 1900.");
    return;
  }
  if (birthDate > today) {
    await showError("La fecha de nacimiento no puede estar en el futuro.");
    return;
  }

  // 4. Email: patrón válido con @ y .
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    await showError("Por favor ingresa un correo electrónico válido (ej: nombre@correo.com).");
    return;
  }

  // 5. Teléfono: números, mínimo 8, máximo 15 dígitos
  if (!/^\+?\d{8,15}$/.test(telefono)) {
    await showError("El teléfono debe contener entre 8 y 15 dígitos (solo números, opcionalmente con un '+' al inicio).");
    return;
  }

  // 6. Contraseñas coinciden y mínimo 6 caracteres
  if (password.length < 6) {
    await showError("La contraseña debe tener al menos 6 caracteres.");
    return;
  }
  if (password !== confirm_password) {
    await showError("Las contraseñas ingresadas no coinciden.");
    return;
  }

  // 7. Número de dirección: positivo entero
  if (!/^\d+$/.test(numero)) {
    await showError("El número de dirección debe ser un valor numérico.");
    return;
  }

  const res = await fetch("/api/usuario/registro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "plataform": "web"
    },
    body: JSON.stringify({
      nombre,
      apellido,
      nacionalidad,
      dni,
      genero,
      fecha_nacimiento,
      telefono,
      email,
      password,
      confirm_password,
      calle,
      numero,
      codigo_postal,
      pais,
      provincia,
      ciudad,
      localidad
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    mensajeError.innerHTML = data.details || data.error || "Error al registrar el usuario";
    mensajeError.classList.remove("escondido");
    
    await Swal.fire({
        icon: 'error',
        title: 'Error de Registro',
        text: data.details || data.error || 'Por favor verificá los datos e intentalo de nuevo.',
        confirmButtonColor: '#00C16E'
    });
    return;
  }

  await Swal.fire({
      icon: 'success',
      title: '¡Bienvenido!',
      text: 'Tu cuenta fue creada exitosamente. Iniciá sesión para continuar.',
      confirmButtonColor: '#00C16E'
  });
  window.location.href = "/acceder";
});

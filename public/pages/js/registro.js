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
// GÉNERO CON AUTOCOMPLETADO
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const generoInput = document.getElementById("genero");
  const suggestionsBox = document.getElementById("genero-suggestions");

  let generos = [];

  try {
    const response = await fetch("/api/generos");
    generos = await response.json();
  } catch (error) {
    console.error("Error al cargar géneros:", error);
  }

  generoInput.addEventListener("input", () => {
    const query = generoInput.value.toLowerCase();
    suggestionsBox.innerHTML = "";

    if (query.length === 0) {
      suggestionsBox.style.display = "none";
      return;
    }

    // Lista simple de strings
    const matches = generos.filter(g => g.toLowerCase().includes(query));

    if (matches.length > 0) {
      matches.forEach(g => {
        const div = document.createElement("div");
        div.textContent = g;
        div.addEventListener("click", () => {
          generoInput.value = g;
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
    if (!suggestionsBox.contains(e.target) && e.target !== generoInput) {
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

  const res = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "plataform": "web"
    },
    body: JSON.stringify({
    nombre: document.getElementById('nombre').value,
    apellido: document.getElementById('apellido').value,
    nacionalidad: document.getElementById('nacionalidad').value,
    dni: document.getElementById('dni').value,
    genero: document.getElementById('genero').value,
    fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
    telefono: document.getElementById('telefono').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    confirm_password: document.getElementById('confirm_password').value,
    calle: document.getElementById('calle').value,
    numero: document.getElementById('numero').value,
    codigo_postal: document.getElementById('codigo_postal').value,
    pais: document.getElementById('pais').value,
    provincia: document.getElementById('provincia').value,
    ciudad: document.getElementById('ciudad').value,
    localidad: document.getElementById('localidad').value
}) });

  if (!res.ok) {
    mensajeError.innerHTML = (await res.json()).message;
    return mensajeError.classList.toggle("escondido", false);
  }

  const resJson = await res.json();
  if (resJson.redirect) {
    await Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Tu cuenta fue creada exitosamente.',
        confirmButtonColor: '#00C16E'
    });
    window.location.href = resJson.redirect;
}
});
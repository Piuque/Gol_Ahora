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
      nombre: e.target.children.nombre.value,
      apellido: e.target.children.apellido.value,
      nacionalidad: e.target.children.nacionalidad.value,
      dni: e.target.children.dni.value,
      genero: e.target.children.genero.value,
      fecha_nacimiento: e.target.children.fecha_nacimiento.value,
      telefono: e.target.children.telefono.value,
      email: e.target.children.email.value,
      password: e.target.children.password.value,
      confirm_password: e.target.children.confirm_password.value,
      calle: e.target.children.calle.value,
      numero: e.target.children.numero.value,
      codigo_postal: e.target.children.codigo_postal.value,
      pais: e.target.children.pais.value,
      provincia: e.target.children.provincia.value,
      ciudad: e.target.children.ciudad.value,
      localidad: e.target.children.localidad.value
    })
  });

  if (!res.ok) {
    mensajeError.innerHTML = (await res.json()).message;
    return mensajeError.classList.toggle("escondido", false);
  }

  const resJson = await res.json();
  if (resJson.redirect) {
    window.location.href = "ReservadeCancha";
  }
});
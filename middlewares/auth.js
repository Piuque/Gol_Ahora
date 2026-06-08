const db = require('../config/db.js');

// ─────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────
const GENEROS_PERMITIDOS = ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOLO_DIGITOS = /^\d+$/;

/**
 * Devuelve la edad en años completos a partir de una fecha de nacimiento.
 * @param {Date} fechaNac
 * @returns {number}
 */
function calcularEdad(fechaNac) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

// ─────────────────────────────────────────────
// Middleware de validación de registro (firewall)
// Usar ANTES de authMiddleware en la ruta de registro:
//   router.post('/register', validateRegistration, authMiddleware, registerController)
// ─────────────────────────────────────────────
const validateRegistration = (req, res, next) => {
  const errors = [];
  const {
    fecha_nacimiento,
    password,
    confirm_password,
    genero,
    email,
    telefono,
    dni,
  } = req.body;

  // ── 1. Fecha de nacimiento ───────────────────────────────────────────────
  if (!fecha_nacimiento) {
    errors.push({ field: 'fecha_nacimiento', message: 'La fecha de nacimiento es obligatoria.' });
  } else {
    const fechaNac = new Date(fecha_nacimiento);

    if (isNaN(fechaNac.getTime())) {
      errors.push({ field: 'fecha_nacimiento', message: 'La fecha de nacimiento no tiene un formato válido.' });
    } else {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaNac >= hoy) {
        errors.push({ field: 'fecha_nacimiento', message: 'La fecha de nacimiento no puede ser en el futuro.' });
      } else {
        const edad = calcularEdad(fechaNac);
        if (edad < 18) {
          errors.push({ field: 'fecha_nacimiento', message: 'Debes tener al menos 18 años para registrarte.' });
        }
        if (edad > 120) {
          errors.push({ field: 'fecha_nacimiento', message: 'La fecha de nacimiento no es válida (supera los 120 años).' });
        }
      }
    }
  }

  // ── 2. Contraseña y confirmación ─────────────────────────────────────────
  if (!password) {
    errors.push({ field: 'password', message: 'La contraseña es obligatoria.' });
  } else {
    if (password.length < 8) {
      errors.push({ field: 'password', message: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (!confirm_password) {
      errors.push({ field: 'confirm_password', message: 'La confirmación de contraseña es obligatoria.' });
    } else if (password !== confirm_password) {
      errors.push({ field: 'confirm_password', message: 'Las contraseñas no coinciden.' });
    }
  }

  // ── 3. Género ────────────────────────────────────────────────────────────
  if (!genero) {
    errors.push({ field: 'genero', message: 'El género es obligatorio.' });
  } else if (!GENEROS_PERMITIDOS.includes(genero.toLowerCase().trim())) {
    errors.push({
      field: 'genero',
      message: `El género debe ser uno de: ${GENEROS_PERMITIDOS.join(', ')}.`,
    });
  }

  // ── 4. Email ─────────────────────────────────────────────────────────────
  if (!email) {
    errors.push({ field: 'email', message: 'El email es obligatorio.' });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'El email no tiene un formato válido (debe incluir @ y dominio).' });
  }

  // ── 5. Teléfono (opcional) ───────────────────────────────────────────────
  if (telefono !== undefined && telefono !== null && telefono !== '') {
    const telStr = String(telefono).trim();
    if (!SOLO_DIGITOS.test(telStr)) {
      errors.push({ field: 'telefono', message: 'El teléfono solo puede contener dígitos numéricos.' });
    } else if (telStr.length < 7 || telStr.length > 15) {
      errors.push({ field: 'telefono', message: 'El teléfono debe tener entre 7 y 15 dígitos.' });
    }
  }

  // ── 6. DNI ───────────────────────────────────────────────────────────────
  if (!dni) {
    errors.push({ field: 'dni', message: 'El DNI es obligatorio.' });
  } else {
    const dniStr = String(dni).trim();
    if (!SOLO_DIGITOS.test(dniStr)) {
      errors.push({ field: 'dni', message: 'El DNI solo puede contener dígitos numéricos.' });
    } else if (dniStr.length < 7 || dniStr.length > 9) {
      errors.push({ field: 'dni', message: 'El DNI debe tener entre 7 y 9 dígitos.' });
    }
  }

  // ── Respuesta ────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Datos de registro inválidos', errors });
  }

  // Normalizar datos saneados antes de continuar
  req.body.genero    = genero.toLowerCase().trim();
  req.body.email     = email.trim().toLowerCase();
  if (telefono) req.body.telefono = String(telefono).trim();
  req.body.dni       = String(dni).trim();

  next();
};

// ─────────────────────────────────────────────
// Auth middleware (tu código original sin cambios)
// ─────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  // Soporte para testing/Swagger/Web: buscamos x-user-id en headers, query, body o cookies.
  let userId = req.headers['x-user-id'] || req.query.userId || (req.body && req.body.userId);

  if (userId === 'null' || userId === 'undefined') {
    userId = null;
  }

  if (!userId && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
      const parts = c.split('=');
      if (parts.length === 2) {
        acc[parts[0].trim()] = parts[1].trim();
      }
      return acc;
    }, {});
    userId = cookies['x-user-id'] || cookies['userId'];
  }

  if (userId === 'null' || userId === 'undefined') {
    userId = null;
  }

  if (!userId) {
    // Si no se proporciona ID, por defecto lo tratamos como público/visitante
    req.user = { id_usuario: null, user_level: 0, role: 'usuario' };
    return next();
  }

  try {
    const user = await db.query.get('SELECT * FROM usuarios WHERE id_usuario = $1', [userId]);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    // Mapeo de roles basado en user_level (administrador, profesor, entrenador, cliente)
    const level = typeof user.user_level === 'string' ? user.user_level.trim().toLowerCase() : user.user_level;
    let role = 'usuario';
    if (level === 'cliente'       || level === '1'   || level === 1)   role = 'cliente';
    if (level === 'profesor'      || level === '10'  || level === 10)  role = 'profesor';
    if (level === 'entrenador')                                         role = 'entrenador';
    if (level === 'administrador' || level === 'admin' || level === '152' || level === 152) role = 'admin';

    req.user = {
      id_usuario: user.id_usuario,
      username:   user.username,
      nombre:     user.nombre,
      apellido:   user.apellido,
      email:      user.email,
      user_level: user.user_level,
      role:       role,
    };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de autenticación', message: err.message });
  }
};

// ─────────────────────────────────────────────
// requireRole (tu código original sin cambios)
// ─────────────────────────────────────────────
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: `Permisos insuficientes. Se requiere rol de: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
};

module.exports = {
  validateRegistration,
  authMiddleware,
  requireRole,
};


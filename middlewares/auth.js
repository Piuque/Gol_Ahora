const db = require('../config/db.js');

const authMiddleware = async (req, res, next) => {
  // Soporte para testing/Swagger/Web: buscamos x-user-id en headers, query, body o cookies.
  let userId = req.headers['x-user-id'] || req.query.userId || (req.body && req.body.userId);
  
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
  
  if (!userId || userId === 'null' || userId === 'undefined') {
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
    const level = typeof user.user_level === 'string' ? user.user_level.trim() : user.user_level;
    let role = 'usuario';
    if (level === 'cliente' || level === '1' || level === 1) role = 'cliente';
    if (level === 'profesor' || level === '10' || level === 10) role = 'profesor';
    if (level === 'entrenador') role = 'entrenador';
    if (level === 'administrador' || level === '152' || level === 152) role = 'admin';

    req.user = {
      id_usuario: user.id_usuario,
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      user_level: user.user_level,
      role: role
    };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de autenticación', message: err.message });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado', 
        message: `Permisos insuficientes. Se requiere rol de: ${allowedRoles.join(', ')}.` 
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole
};
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email({ message: "Formato de email inválido" }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
  confirmPassword: z.string(),
  birthDate: z.string().refine((val) => {
    const date = new Date(val);
    const now = new Date();
    return date < now && date.getFullYear() >= 1900;
  }, { message: "Fecha de nacimiento inválida" }),
  dni: z.string().regex(/^\d+$/, { message: "El DNI debe contener solo números" }),
  phone: z.string().regex(/^\d+$/, { message: "El teléfono debe contener solo números" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Middleware para aplicar el esquema
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    res.status(400).json({ errors: err.errors });
  }
};

module.exports = { registerSchema, validate };

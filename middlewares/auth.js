const db = require('../config/db.js');

const authMiddleware = async (req, res, next) => {
  // Soporte para testing/Swagger: buscamos x-user-id en headers, query o body.
  const userId = req.headers['x-user-id'] || req.query.userId || (req.body && req.body.userId);
  
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
    
    // Mapeo de roles basado en user_level (0: Público, >=1: Cliente, >=152: Admin)
    let role = 'usuario';
    if (user.user_level >= 1) role = 'cliente';
    if (user.user_level >= 152) role = 'admin';

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

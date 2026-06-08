const db = require('../config/db.js');

function parseMatriculaCertificacion(matricula) {
  const texto = (matricula || '').trim();
  const match = texto.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (match) return { nombre: match[1].trim(), institucion: match[2].trim() };
  return { nombre: texto || 'Certificación', institucion: '—' };
}

async function ensureSolicitudesTable() {
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS solicitudes_admin (
      id_solicitud SERIAL PRIMARY KEY,
      tipo VARCHAR(30) NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      id_usuario_solicitante INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      id_usuario_objetivo INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      id_referencia INTEGER,
      referencia_tipo VARCHAR(30),
      rol VARCHAR(50),
      motivo TEXT,
      datos JSONB,
      fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function crearSolicitudAdmin({
  tipo,
  id_usuario_solicitante,
  id_usuario_objetivo = null,
  id_referencia = null,
  referencia_tipo = null,
  rol = null,
  motivo = null,
  datos = null
}) {
  await ensureSolicitudesTable();
  const result = await db.pool.query(
    `INSERT INTO solicitudes_admin
      (tipo, id_usuario_solicitante, id_usuario_objetivo, id_referencia, referencia_tipo, rol, motivo, datos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_solicitud`,
    [tipo, id_usuario_solicitante, id_usuario_objetivo, id_referencia, referencia_tipo, rol, motivo, datos ? JSON.stringify(datos) : null]
  );
  return result.rows[0].id_solicitud;
}

async function marcarSolicitud(id, estado) {
  await db.pool.query(
    `UPDATE solicitudes_admin SET estado = $1 WHERE id_solicitud = $2`,
    [estado, id]
  );
}

async function obtenerSolicitudPendiente(id) {
  return db.query.get(
    `SELECT * FROM solicitudes_admin WHERE id_solicitud = $1 AND estado = 'pendiente'`,
    [id]
  );
}

module.exports = {
  parseMatriculaCertificacion,
  ensureSolicitudesTable,
  crearSolicitudAdmin,
  marcarSolicitud,
  obtenerSolicitudPendiente
};

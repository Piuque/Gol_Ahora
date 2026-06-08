// ============================================================
// AGREGAR ESTO AL CONTROLLER (adminController.js)
// ============================================================

// GET /admin/reportes/tipos-cancha
// RF-89 — Reporte de tipos de canchas y sus características
const reporteTiposCancha = async (req, res) => {
    try {
        const sql = `
      SELECT
        tc.id_tipo_de_cancha  AS id,
        tc.tipo_cancha,
        tc.ancho,
        tc.largo,
        tc.capacidad,
        tc.duracion_min,
        tc.duracion_max,
        s.superficie,
        COUNT(c.id_cancha)::int          AS total_canchas,
        COALESCE(
          ROUND(AVG(c.precio_hora_reserva)::numeric, 2), 0
        )                                AS precio_promedio
      FROM tipos_de_cancha tc
      LEFT JOIN superficies s   ON tc.id_superficie   = s.id_superficie
      LEFT JOIN canchas     c   ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      GROUP BY
        tc.id_tipo_de_cancha, tc.tipo_cancha,
        tc.ancho, tc.largo, tc.capacidad,
        tc.duracion_min, tc.duracion_max,
        s.superficie
      ORDER BY tc.id_tipo_de_cancha ASC
    `;
        const rows = await db.query.all(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({
            error: 'Error al generar reporte de tipos de cancha',
            message: err.message
        });
    }
};

// ============================================================
// AGREGAR AL module.exports del controller:
// reporteTiposCancha,
// ============================================================


// ============================================================
// AGREGAR ESTO AL ROUTER (donde están las rutas /admin/reportes)
// ============================================================

// router.get('/admin/reportes/tipos-cancha', reporteTiposCancha);


// ============================================================
// SI NO TENÉS TABLA "superficies", usá esta versión simplificada:
// ============================================================

const reporteTipoCanchaSimple = async (req, res) => {
    try {
        const sql = `
      SELECT
        tc.id_tipo_de_cancha  AS id,
        tc.tipo_cancha,
        tc.ancho,
        tc.largo,
        tc.capacidad,
        tc.duracion_min,
        tc.duracion_max,
        COUNT(c.id_cancha)::int          AS total_canchas,
        COALESCE(
          ROUND(AVG(c.precio_hora_reserva)::numeric, 2), 0
        )                                AS precio_promedio
      FROM tipos_de_cancha tc
      LEFT JOIN canchas c ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      GROUP BY
        tc.id_tipo_de_cancha, tc.tipo_cancha,
        tc.ancho, tc.largo, tc.capacidad,
        tc.duracion_min, tc.duracion_max
      ORDER BY tc.id_tipo_de_cancha ASC
    `;
        const rows = await db.query.all(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({
            error: 'Error al generar reporte de tipos de cancha',
            message: err.message
        });
    }
};

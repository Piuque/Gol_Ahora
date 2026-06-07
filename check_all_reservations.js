const db = require('./config/db.js');

async function main() {
  try {
    const res = await db.query.all(`
      SELECT r.id_reserva, r.id_cancha, r.id_usuario, r.id_cobro, 
             c.fecha, c.monto, c.id_estado_cobro, c.id_metodo_de_pago 
      FROM reservas r
      INNER JOIN cobros c ON r.id_cobro = c.id_cobro
      ORDER BY c.fecha DESC
    `);
    console.log("RESERVATIONS IN DB:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    process.exit(0);
  }
}

main();

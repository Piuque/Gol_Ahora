const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const isLocal = !process.env.DATABASE_URL || 
                process.env.DATABASE_URL.includes('localhost') || 
                process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Error inesperado en el PostgreSQL pool:', err.message);
});

const query = {
  all: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },
  get: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows[0];
  },
  run: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    const generatedId = res.rows[0] ? Object.values(res.rows[0])[0] : null;
    return {
      id: generatedId,
      changes: res.rowCount
    };
  },
  exec: async (sql) => {
    await pool.query(sql);
  }
};

const initDatabase = async () => {
  try {
    console.log('Verificando conexión con PostgreSQL (Neon)...');
    await pool.query('SELECT NOW()');
    const { ensureSolicitudesTable } = require('../utils/solicitudesAdmin.js');
    await ensureSolicitudesTable();
    console.log('Conexión PostgreSQL validada exitosamente.');
  } catch (err) {
    console.error('Error crítico al conectar a PostgreSQL:', err.message);
  }
};

module.exports = {
  pool,
  query,
  initDatabase
};

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { query } = require('./db.js');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // --- Endpoints de la API Dinámica por Roles (PostgreSQL) ---

  // GET /api/v1/admin/clientes (Acceso Administrador / Personal)
  if (req.url === '/api/v1/admin/clientes' && req.method === 'GET') {
    try {
      const clients = await query.all('SELECT * FROM usuarios ORDER BY id_usuario ASC');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(clients, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error al consultar la base de datos PostgreSQL', message: err.message }));
    }
    return;
  }

  // POST /api/v1/usuario/registro (Acceso Usuario / Público no registrado)
  if (req.url === '/api/v1/usuario/registro' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const clientData = JSON.parse(body);
        
        const username = clientData.username || `user_${Date.now()}`;
        const user_level = clientData.user_level !== undefined ? clientData.user_level : 0;
        const nombre = clientData.nombre;
        const apellido = clientData.apellido;
        const email = clientData.email;
        const password = clientData.password || 'default_hashed_pass';
        const fecha_nacimiento = clientData.fecha_nacimiento || '1990-01-01';
        const dni = clientData.dni || `DNI_${Date.now().toString().slice(-8)}`;
        const telefono = clientData.telefono || '-';
        const id_direccion = clientData.id_direccion || 1;
        const id_direccion_opcional = clientData.id_direccion_opcional || null;
        const id_genero = clientData.id_genero || 1;
        const id_nacionalidad = clientData.id_nacionalidad || 1;
        const id_club = clientData.id_club || 1;

        if (!nombre || !apellido || !email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Campos obligatorios faltantes', details: 'nombre, apellido y email son requeridos' }));
          return;
        }

        // Inserción en PostgreSQL usando placeholders numerados
        const insertSql = `
          INSERT INTO usuarios (
            username, user_level, nombre, apellido, email, password,
            fecha_nacimiento, dni, telefono, id_direccion, id_direccion_opcional,
            id_genero, id_nacionalidad, id_club
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id_usuario
        `;

        const params = [
          username, user_level, nombre, apellido, email, password,
          fecha_nacimiento, dni, telefono, id_direccion, id_direccion_opcional,
          id_genero, id_nacionalidad, id_club
        ];

        const result = await query.run(insertSql, params);
        
        const newClient = await query.get('SELECT * FROM usuarios WHERE id_usuario = $1', [result.id]);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newClient, null, 2));
      } catch (err) {
        // Interceptamos la violación de restricción única de PostgreSQL (Código 23505)
        if (err.code === '23505') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Datos duplicados', 
            details: 'El nombre de usuario (username), correo electrónico (email) o DNI ya se encuentra registrado en el complejo. Por favor, ingresa valores diferentes.' 
          }));
          return;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error al registrar cliente en PostgreSQL', message: err.message }));
      }
    });
    return;
  }

  // --- Servidor de Archivos Estáticos (Swagger UI) ---
  
  let filePath = req.url === '/' ? './index.html' : '.' + req.url;
  filePath = path.join(__dirname, filePath);
  
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Access Denied');
    return;
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('File Not Found');
      } else {
        res.statusCode = 500;
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Servidor de Gol Ahora corriendo en http://localhost:${PORT}`);
  console.log(`Abre el navegador en http://localhost:${PORT} para explorar Swagger UI`);
  console.log(`Endpoints PostgreSQL disponibles de prueba por roles:`);
  console.log(`  - POST http://localhost:${PORT}/api/v1/usuario/registro  (Usuario / Público)`);
  console.log(`  - GET  http://localhost:${PORT}/api/v1/admin/clientes    (Administrador / Personal)`);
  console.log(`Presiona Ctrl+C para detener el servidor`);
  console.log(`==================================================`);
});

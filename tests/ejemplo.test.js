const test = require('node:test');
const assert = require('node:assert');

test('Verificar cálculo básico de prueba', () => {
  const precioHora = 1200;
  const horas = 2;
  const total = precioHora * horas;
  
  assert.strictEqual(total, 2400);
});

test('Validación de estructura de respuesta simulada', () => {
  const usuarioSimulado = {
    username: 'jugador10',
    user_level: 1,
    genero: 'Masculino',
    nacionalidad: 'Argentina'
  };
  
  assert.ok(usuarioSimulado.username);
  assert.strictEqual(usuarioSimulado.user_level, 1);
});

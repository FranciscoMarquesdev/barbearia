const jwt = require('jsonwebtoken');
require('dotenv').config();

// Gere um token de admin válido para testes
const token = jwt.sign(
  { id: 1, role: 'admin' }, // payload
  process.env.JWT_SECRET || 'SUA_SENHA_SECRETA', // segredo
  { expiresIn: '1h' }
);

console.log('Token JWT para testes:');
console.log(token);

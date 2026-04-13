const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

db.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => console.error('❌ Error conexión PostgreSQL:', err.message));

module.exports = db;

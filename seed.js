require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function seed() {
  const name = 'Local Administrator';
  const email = String(process.env.SEED_ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!');

  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must contain at least 8 characters.');
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin'`,
    [name, email, passwordHash]
  );
  console.log(`Local administrator is ready: ${email}`);
}

seed()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());


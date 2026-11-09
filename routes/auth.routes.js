const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normaliseEmail(req.body.email);
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Name must contain between 2 and 80 characters.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'An account already exists for that email address.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const user = { id: result.insertId, name, email, role: 'staff' };
    return res.status(201).json({
      message: 'Account created successfully.',
      token: createToken(user),
      user
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    const passwordIsValid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.json({
      message: 'Signed in successfully.',
      token: createToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;


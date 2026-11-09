require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { testDatabaseConnection, ensureDatabaseSchema } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/books.routes');

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.CORS_ORIGIN || undefined;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again in a few minutes.' }
}));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' }
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'A book with that ISBN already exists.' });
  }
  if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
    return res.status(400).json({ message: 'One of the submitted values has an invalid format.' });
  }
  return res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
});

async function startServer() {
  try {
    await testDatabaseConnection();
    await ensureDatabaseSchema();
    console.log('Connected to MySQL database.');
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    console.error('Check the values in your .env file and import sql/add.sql before using the application.');
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Book Management System is running at http://localhost:${port}`);
  });
}

startServer();


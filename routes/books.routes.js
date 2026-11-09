const express = require('express');
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const allowedStatuses = new Set(['available', 'borrowed', 'reserved']);

function validateBook(payload, partial = false) {
  const errors = [];
  const book = {};
  const fieldNames = ['title', 'author', 'isbn', 'category', 'description', 'publishedYear', 'status'];

  for (const field of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      book[field] = typeof payload[field] === 'string' ? payload[field].trim() : payload[field];
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(book, 'title')) {
    if (!book.title || book.title.length > 150) errors.push('Title is required and must not exceed 150 characters.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(book, 'author')) {
    if (!book.author || book.author.length > 120) errors.push('Author is required and must not exceed 120 characters.');
  }
  if (!partial || Object.prototype.hasOwnProperty.call(book, 'isbn')) {
    if (!/^[0-9Xx-]{10,17}$/.test(book.isbn || '')) errors.push('ISBN must contain 10 to 17 digits, hyphens, or X.');
  }
  if (Object.prototype.hasOwnProperty.call(book, 'category') && book.category.length > 80) {
    errors.push('Category must not exceed 80 characters.');
  }
  if (Object.prototype.hasOwnProperty.call(book, 'description') && book.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters.');
  }
  if (Object.prototype.hasOwnProperty.call(book, 'publishedYear')) {
    const year = Number(book.publishedYear);
    if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 1) {
      errors.push('Published year must be a valid four digit year.');
    } else {
      book.publishedYear = year;
    }
  }
  if (Object.prototype.hasOwnProperty.call(book, 'status') && !allowedStatuses.has(book.status)) {
    errors.push('Status must be available, borrowed, or reserved.');
  }

  return { errors, book };
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 9, 1), 50);
    const offset = (page - 1) * limit;
    const query = String(req.query.q || '').trim();
    const where = query ? 'WHERE b.title LIKE ? OR b.author LIKE ? OR b.category LIKE ?' : '';
    const values = query ? [`%${query}%`, `%${query}%`, `%${query}%`] : [];

    const [books] = await pool.execute(
      `SELECT b.id, b.title, b.author, b.isbn, b.category, b.description, b.published_year AS publishedYear,
              b.status, b.created_by AS createdBy, b.created_at AS createdAt, b.updated_at AS updatedAt,
              u.name AS addedBy
       FROM books b LEFT JOIN users u ON b.created_by = u.id
       ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM books b ${where}`, values);

    return res.json({ books, page, limit, total: countRows[0].total });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.title, b.author, b.isbn, b.category, b.description, b.published_year AS publishedYear,
              b.status, b.created_by AS createdBy, b.created_at AS createdAt, b.updated_at AS updatedAt,
              u.name AS addedBy
       FROM books b LEFT JOIN users u ON b.created_by = u.id WHERE b.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Book not found.' });
    return res.json({ book: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { errors, book } = validateBook(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const [result] = await pool.execute(
      `INSERT INTO books (title, author, isbn, category, description, published_year, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [book.title, book.author, book.isbn, book.category || null, book.description || null,
        book.publishedYear || null, book.status || 'available', req.user.id]
    );
    const [rows] = await pool.execute('SELECT * FROM books WHERE id = ?', [result.insertId]);
    return res.status(201).json({ message: 'Book added successfully.', book: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { errors, book } = validateBook(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    if (Object.keys(book).length === 0) return res.status(400).json({ message: 'Include at least one book field to update.' });

    const [existingRows] = await pool.execute('SELECT created_by FROM books WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ message: 'Book not found.' });
    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit books that you added.' });
    }

    const fieldMap = {
      title: 'title', author: 'author', isbn: 'isbn', category: 'category', description: 'description',
      publishedYear: 'published_year', status: 'status'
    };
    const fields = Object.keys(book).map((key) => `${fieldMap[key]} = ?`);
    const values = Object.values(book);
    await pool.execute(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
    const [rows] = await pool.execute('SELECT * FROM books WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Book updated successfully.', book: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT created_by FROM books WHERE id = ?', [req.params.id]);
    const book = rows[0];
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    if (book.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete books that you added.' });
    }

    await pool.execute('DELETE FROM books WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;


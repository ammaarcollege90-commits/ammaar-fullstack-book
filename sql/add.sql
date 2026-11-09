CREATE DATABASE IF NOT EXISTS book_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE book_management;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('staff', 'admin') NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  author VARCHAR(120) NOT NULL,
  isbn VARCHAR(17) NOT NULL UNIQUE,
  category VARCHAR(80) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  published_year SMALLINT UNSIGNED DEFAULT NULL,
  status ENUM('available', 'borrowed', 'reserved') NOT NULL DEFAULT 'available',
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_books_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_books_title (title),
  INDEX idx_books_author (author),
  INDEX idx_books_status (status)
) ENGINE=InnoDB;

INSERT INTO books (title, author, isbn, category, description, published_year, status) VALUES
  ('The Alchemist', 'Paulo Coelho', '978-0061122415', 'Fiction', 'A short novel about following a personal dream.', 1988, 'available'),
  ('Clean Code', 'Robert C. Martin', '978-0132350884', 'Programming', 'A practical guide to writing readable and maintainable software.', 2008, 'available'),
  ('Atomic Habits', 'James Clear', '978-0735211292', 'Self Development', 'A guide to building better habits through small changes.', 2018, 'reserved')
ON DUPLICATE KEY UPDATE title = VALUES(title);


# Book Management System

This Book Management System is built with Node.js, Express.js and MySQL. It has a simple web interface plus a REST API for maintaining a book catalogue. Staff members can create accounts, sign in, add books, edit their own books and remove their own books. Administrators can manage every book.

## Main features

- REST API for creating, reading, updating and deleting books
- User registration and login with bcrypt password hashing and JWT authentication
- Search by title, author or category
- Ownership checks for changing or deleting books
- Input validation, parameterised MySQL queries, Helmet security headers, CORS and rate limiting
- Responsive frontend served by Express

## Technologies

Node.js, Express.js, MySQL, mysql2, bcryptjs, JSON Web Tokens, Helmet, CORS, HTML, CSS and JavaScript.

## Run locally

1. Install Node.js 18 or newer and MySQL.
2. Import `sql/add.sql` into MySQL. It creates a database named `book_management` and includes three sample books.
3. Copy `.env.example` to `.env`, then update the MySQL details and set a strong `JWT_SECRET`.
4. Install packages with `npm install`.
5. Start the system with `npm run dev` or `npm start`.
6. Open `http://localhost:3000` in your browser.

To add a local test administrator after importing the schema, run `npm run seed`. Change the seed email and password in `.env` before doing this.

## REST API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Checks that the server is running |
| POST | `/api/auth/register` | Public | Creates a staff account |
| POST | `/api/auth/login` | Public | Returns a JWT access token |
| GET | `/api/books` | Public | Lists books; accepts `q`, `page` and `limit` |
| GET | `/api/books/:id` | Public | Returns one book |
| POST | `/api/books` | Signed in | Adds a book |
| PUT | `/api/books/:id` | Owner or admin | Updates a book |
| DELETE | `/api/books/:id` | Owner or admin | Deletes a book |

For protected API calls include `Authorization: Bearer <token>` in the request header.

Example request body for `POST /api/books`:

```json
{
  "title": "Refactoring",
  "author": "Martin Fowler",
  "isbn": "978-0201485677",
  "category": "Programming",
  "publishedYear": 1999,
  "status": "available",
  "description": "Improving the design of existing code."
}
```

## Security choices

Passwords are hashed with bcrypt before storage. JWTs expire after two hours by default. The application uses prepared statements for every database operation, validates input on the server, limits request sizes, adds Helmet headers, rate-limits the API and checks book ownership before updates or deletions. Keep `.env` out of version control and set `CORS_ORIGIN` to the final public URL before deployment.

## Deployment and submission

The repository includes `render.yaml` for a Render web-service deployment. Push this folder to a new GitHub repository, create a MySQL database service, set the database environment variables in Render, then deploy. After deployment, put the real repository URL and the live application URL in the PDF report before submitting.

The system needs an external MySQL service when deployed. PlanetScale, Aiven, Railway MySQL or another managed MySQL provider can be used if it provides the variables shown in `.env.example`.


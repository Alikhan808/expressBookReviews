# Express Book Reviews

Completed IBM online bookstore API, forked from `ibm-developer-skills-network/expressBookReviews`.

## Run

Requires Node.js 18 or newer.

```sh
npm ci
npm start
```

Default address: http://127.0.0.1:5000. `PORT` changes the port.

```sh
npm test
```

The original `router/booksdb.js` is unchanged. Its keys 1–10 are the ISBN identifiers used by the supplied lab data. Initial reviews are empty objects.

## Public routes

- GET `/`: all books.
- GET `/isbn/:isbn`: a book by ISBN.
- GET `/author/:author`: books by author (case insensitive exact name).
- GET `/title/:title`: books matching the title (case insensitive substring).
- GET `/review/:isbn`: reviews for a book.
- POST `/register`: JSON username and password.

## Authenticated routes

- POST `/customer/login`: JSON username and password; save the returned session cookie.
- PUT `/customer/auth/review/:isbn`: JSON review (or `?review=`). Adds or updates only the logged-in user's review.
- DELETE `/customer/auth/review/:isbn`: deletes only the logged-in user's review.

Use `curl -c cookies.txt` when logging in and `curl -b cookies.txt` for review mutations. Usernames require 3–40 letters, digits or underscores; passwords require 8–128 characters. Passwords are salted and hashed with scrypt. JWTs are verified inside server-side sessions. Demo users, reviews and sessions are held in memory and reset when the server restarts. Secrets are generated on startup or provided with `SESSION_SECRET` and `JWT_SECRET`; no real credentials are in this repository.

## Axios asynchronous tasks

`router/general.js` exports `getAllBooks(callback, baseURL)` (callback and Promise), `getBookByISBN(isbn, baseURL)` (Promise), `getBooksByAuthor(author, baseURL)` and `getBooksByTitle(title, baseURL)` (async/await). All four use Axios against the API; the optional base URL supports isolated test servers.

Tests cover all four clients, parallel retrieval, duplicate registration races, session login and review ownership across two users.

## Submission evidence

The `evidence` directory contains actual cURL commands and captured outputs for the assessment. Published example credentials are disposable local demonstration credentials, not a real account password.

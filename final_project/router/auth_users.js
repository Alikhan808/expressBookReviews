'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');
const books = require('./booksdb');
const { users, isValid, authenticatedUser } = require('./users');
const regd_users = express.Router();
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!await authenticatedUser(username, password)) return res.status(401).json({ message: 'Invalid username or password.' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.authorization = { username, accessToken: jwt.sign({ username }, req.app.locals.jwtSecret, { expiresIn: '1h', algorithm: 'HS256' }) };
      req.session.save(error => {
        if (error) return next(error);
        res.json({ message: 'Customer successfully logged in.', username });
      });
    });
  } catch (error) { next(error); }
});
regd_users.put('/auth/review/:isbn', (req, res) => {
  if (!own(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found.' });
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 5000) return res.status(400).json({ message: 'Provide a nonempty review of at most 5000 characters.' });
  const username = req.user.username;
  const reviews = books[req.params.isbn].reviews;
  const updated = own(reviews, username);
  // Only the logged-in user's entry changes. Other reviews are preserved.
  Object.defineProperty(reviews, username, { value: review.trim(), writable: true, enumerable: true, configurable: true });
  res.json({ message: updated ? 'Book review successfully updated.' : 'Book review successfully added.', reviews });
});
regd_users.delete('/auth/review/:isbn', (req, res) => {
  if (!own(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found.' });
  const reviews = books[req.params.isbn].reviews;
  if (!own(reviews, req.user.username)) return res.status(404).json({ message: 'You have no review for this book.' });
  delete reviews[req.user.username];
  res.json({ message: 'Book review successfully deleted.', reviews });
});
module.exports = { authenticated: regd_users, isValid, users, authenticatedUser };

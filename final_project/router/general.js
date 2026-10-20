'use strict';
const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const { registerUser } = require('./users');
const public_users = express.Router();
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

public_users.post('/register', async (req, res, next) => {
  try {
    const result = await registerUser(req.body?.username, req.body?.password);
    res.status(result.status).json({ message: result.message });
  } catch (error) { next(error); }
});

// Public routes serve the original IBM book data without altering its contents.
public_users.get('/', (req, res) => res.json(books));
public_users.get('/isbn/:isbn', (req, res) => {
  if (!own(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found.' });
  res.json(books[req.params.isbn]);
});
public_users.get('/author/:author', (req, res) => {
  const author = req.params.author.trim().toLowerCase();
  res.json(Object.fromEntries(Object.entries(books).filter(([, book]) => book.author.toLowerCase() === author)));
});
public_users.get('/title/:title', (req, res) => {
  const title = req.params.title.trim().toLowerCase();
  res.json(Object.fromEntries(Object.entries(books).filter(([, book]) => book.title.toLowerCase().includes(title))));
});
public_users.get('/review/:isbn', (req, res) => {
  if (!own(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found.' });
  res.json(books[req.params.isbn].reviews);
});

// Asynchronous Axios client methods for the four retrieval tasks.
// These call the API routes above, without recursive route calls.
function apiClient(baseURL = process.env.BOOKS_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}`) {
  return axios.create({ baseURL, timeout: 5000, proxy: false });
}

// Retrieve all books with an asynchronous callback and Promise chaining.
function getAllBooks(callback, baseURL) {
  return apiClient(baseURL).get('/').then(response => {
    if (callback) callback(null, response.data);
    return response.data;
  }, error => {
    if (callback) callback(error);
    throw error;
  });
}

// Retrieve a book by ISBN using a Promise and Axios.
function getBookByISBN(isbn, baseURL) {
  return apiClient(baseURL).get(`/isbn/${encodeURIComponent(isbn)}`).then(response => response.data);
}

// Retrieve books by author using async/await and Axios.
async function getBooksByAuthor(author, baseURL) {
  const response = await apiClient(baseURL).get(`/author/${encodeURIComponent(author)}`);
  return response.data;
}

// Retrieve books by title using async/await and Axios.
async function getBooksByTitle(title, baseURL) {
  const response = await apiClient(baseURL).get(`/title/${encodeURIComponent(title)}`);
  return response.data;
}

module.exports = { general: public_users, getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle };

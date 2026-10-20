'use strict';
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(scryptCallback);
const users = new Map();
function isValid(username) { return users.has(username); }
async function registerUser(username, password) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,40}$/.test(username) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { status: 400, message: 'Provide a username of 3–40 letters, digits or underscores and a password of 8–128 characters.' };
  }
  if (isValid(username)) return { status: 409, message: 'Username already exists.' };
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  // Recheck after hashing: concurrent registrations must not overwrite a user.
  if (isValid(username)) return { status: 409, message: 'Username already exists.' };
  users.set(username, { salt, hash });
  return { status: 201, message: 'User successfully registered. You can now log in.' };
}
async function authenticatedUser(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128) return false;
  const user = users.get(username);
  if (!user) return false;
  const hash = await scrypt(password, user.salt, 64);
  return timingSafeEqual(user.hash, hash);
}
module.exports = { users, isValid, registerUser, authenticatedUser };

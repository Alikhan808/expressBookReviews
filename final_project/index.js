'use strict';
const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const app = express();
app.disable('x-powered-by');
app.set('json spaces', 2);
app.locals.jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
app.use(express.json({ limit: '32kb' }));
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 3600000 }
}));
app.use('/customer/auth', (req, res, next) => {
  const authorization = req.session?.authorization;
  if (!authorization) return res.status(401).json({ message: 'Please log in to manage reviews.' });
  try {
    const user = jwt.verify(authorization.accessToken, app.locals.jwtSecret, { algorithms: ['HS256'] });
    if (user.username !== authorization.username) return res.status(401).json({ message: 'Invalid session.' });
    req.user = user;
    next();
  } catch { res.status(401).json({ message: 'Your session has expired. Please log in again.' }); }
});
app.use('/customer', require('./router/auth_users').authenticated);
app.use('/', require('./router/general').general);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  console.error(error.message);
  res.status(error.status || 500).json({ message: 'The request could not be completed.' });
});
if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, '127.0.0.1', () => console.log(`Book review API listening on http://127.0.0.1:${port}`));
}
module.exports = app;

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const app = require('../index');
const books = require('../router/booksdb');
const clients = require('../router/general');

test('book retrieval, authentication, ownership, concurrency and Axios clients', async () => {
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const api = axios.create({ baseURL, proxy: false, validateStatus: () => true });
  try {
    assert.deepEqual((await api.get('/')).data, books);
    assert.equal((await api.get('/isbn/1')).data.title, 'Things Fall Apart');
    assert.equal(Object.keys((await api.get('/author/Unknown')).data).length, 4);
    assert.equal((await api.get('/title/Pride')).data['8'].author, 'Jane Austen');
    assert.deepEqual((await api.get('/review/1')).data, {});
    assert.equal((await api.get('/isbn/999')).status, 404);
    assert.equal((await api.get('/isbn/toString')).status, 404);
    assert.equal((await api.post('/register', {})).status, 400);
    assert.equal((await api.put('/customer/auth/review/1', {review:'unauthorized'})).status, 401);
    assert.equal((await api.post('/customer/login', {username:'missing',password:'wrongpass'})).status, 401);

    const registration = await Promise.all(Array.from({length:5}, () => api.post('/register', {username:'concurrent_reader',password:'TestOnlyPass123'})));
    assert.equal(registration.filter(r=>r.status===201).length, 1);
    assert.equal(registration.filter(r=>r.status===409).length, 4);
    async function login(username) {
      const r = await api.post('/customer/login', {username,password:'TestOnlyPass123'});
      assert.equal(r.status,200);
      return { headers: { Cookie: r.headers['set-cookie'][0].split(';')[0] } };
    }
    const alice = await login('concurrent_reader');
    await api.post('/register', {username:'second_reader',password:'TestOnlyPass123'});
    const bob = await login('second_reader');
    const writes = await Promise.all([
      api.put('/customer/auth/review/1', {review:'First reader review'},alice),
      api.put('/customer/auth/review/1', {review:'Second reader review'},bob)
    ]);
    assert.ok(writes.every(r=>r.status===200));
    assert.equal(Object.keys((await api.get('/review/1')).data).length,2);
    const update = await api.put('/customer/auth/review/1', {review:'Updated first review',username:'second_reader'},alice);
    assert.equal(update.data.message,'Book review successfully updated.');
    assert.equal(update.data.reviews.second_reader,'Second reader review');
    assert.equal((await api.put('/customer/auth/review/1',{review:'   '},alice)).status,400);
    assert.equal((await api.delete('/customer/auth/review/1',alice)).status,200);
    assert.deepEqual((await api.get('/review/1')).data,{second_reader:'Second reader review'});
    assert.equal((await api.delete('/customer/auth/review/1',alice)).status,404);
    await api.delete('/customer/auth/review/1',bob);

    let callbackCalled=false;
    assert.deepEqual(await clients.getAllBooks((error,data)=>{assert.equal(error,null);assert.equal(Object.keys(data).length,10);callbackCalled=true;},baseURL),books);
    assert.equal(callbackCalled,true);
    assert.deepEqual(await clients.getBookByISBN('1',baseURL),books['1']);
    assert.equal(Object.keys(await clients.getBooksByAuthor('Unknown',baseURL)).length,4);
    assert.equal((await clients.getBooksByTitle('Pride',baseURL))['8'].title,'Pride and Prejudice');
    await assert.rejects(clients.getBookByISBN('999',baseURL));
    const parallelReads=await Promise.all(Array.from({length:20},()=>clients.getAllBooks(undefined,baseURL)));
    assert.ok(parallelReads.every(result=>Object.keys(result).length===10));
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

// tests/healthz.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import your app (you may need to refactor server.js to export the app instance)
const app = require('../server'); // see note below

describe('GET /healthz', () => {
  it('should return 200 and db up', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'OK', db: 'up' }));
  });
});

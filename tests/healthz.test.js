// tests/healthz.test.js
const request = require('supertest');
const app = require('../server');

describe('GET /healthz', () => {
  it('should return 200 and db up', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'OK', db: 'up' }));
  });
});

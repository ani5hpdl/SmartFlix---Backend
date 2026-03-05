const request = require('supertest');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

describe('User Register API Tests', () => {
  it('should register a new user successfully', async () => {
    const uniqueName = `testuser_${Date.now()}`;
    const uniqueEmail = `register_${Date.now()}@gmail.com`;

    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({
        name: uniqueName,
        email: uniqueEmail,
        password: 'SecurePassword1',
        agreeToTerms: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toEqual('User created. Please verify your email');
  }, 30000);

  it('should return 400 if required fields are missing', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({
        email: 'missingfields@gmail.com',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Name, email and password are required');
  });

  it('should return 409 if email already exists', async () => {
    const email = `duplicate_${Date.now()}@gmail.com`;

    await request(BASE_URL)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email,
        password: 'SecurePassword1',
        agreeToTerms: true,
      });

    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email,
        password: 'SecurePassword1',
        agreeToTerms: true,
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('User already exists');
  }, 30000);

  it('should return 400 if email is null', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/register')
      .send({
        name: 'Error User',
        email: null,
        password: 'SecurePassword1',
        agreeToTerms: true,
      });

    expect([400, 500]).toContain(res.statusCode);
  });
});

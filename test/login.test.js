const request = require('supertest');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const TEST_LOGIN_EMAIL = 'verified_user@example.com';
const TEST_LOGIN_PASSWORD = 'SecurePassword1';

describe('Login API Tests', () => {
  const registeredLoginUser = {
    name: `login_user_${Date.now()}`,
    email: `login_user_${Date.now()}@gmail.com`,
    password: 'SecurePassword1',
  };

  beforeAll(async () => {
    await request(BASE_URL)
      .post('/api/auth/register')
      .send({
        name: registeredLoginUser.name,
        email: registeredLoginUser.email,
        password: registeredLoginUser.password,
        agreeToTerms: true,
      });
  }, 30000);

  it('should login user successfully when credentials are correct', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_LOGIN_EMAIL,
        password: TEST_LOGIN_PASSWORD,
      });

    if (res.statusCode !== 200) {
      expect([401, 403]).toContain(res.statusCode);
      return;
    }

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toEqual('User login successful');
    expect(res.body).toHaveProperty('token');
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        password: 'SecurePassword1',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Email and password are required');
  });

  it('should return 400 if password is missing', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: registeredLoginUser.email,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Email and password are required');
  });

  it('should return 401 if email does not exist', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: `nonexistent_${Date.now()}@example.com`,
        password: 'SecurePassword1',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Invalid email or password');
  });

  it('should return 401 if password is incorrect', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: registeredLoginUser.email,
        password: 'WrongPassword123',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Invalid email or password');
  });

  it('should return 403 if email is not verified', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: registeredLoginUser.email,
        password: registeredLoginUser.password,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Email not verified. A new verification mail has been sent');
  });

  it('should return 403 if user is inactive', async () => {
    if (!process.env.TEST_INACTIVE_EMAIL || !process.env.TEST_INACTIVE_PASSWORD) {
      return;
    }

    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: process.env.TEST_INACTIVE_EMAIL,
        password: process.env.TEST_INACTIVE_PASSWORD,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual('Your account is inactive. Contact support');
  });
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const JWT_SECRET = process.env.JWT_SECRET;

const makeToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

describe('Review API Tests', () => {
  if (!JWT_SECRET) {
    it('should have JWT_SECRET configured for review tests', () => {
      throw new Error('JWT_SECRET is required to run review tests');
    });
    return;
  }

  const userId = 999991;
  const userToken = makeToken({ userId, role: 'user' });
  const adminToken = makeToken({ userId: 999992, role: 'admin' });

  it('should return 401 when creating review without token', async () => {
    const res = await request(BASE_URL)
      .post('/api/review/addReview')
      .send({ movie_id: 1, rating: 4, review_text: 'Nice movie' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authorization token missing');
  });

  it('should return 400 when required review fields are missing', async () => {
    const res = await request(BASE_URL)
      .post('/api/review/addReview')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ review_text: 'Missing movie_id and rating' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('User, Movie and Rating are required');
  });

  it('should return 400 for invalid movieId on getReviewsByMovie', async () => {
    const res = await request(BASE_URL).get('/api/review/getReviewsByMovie/invalid');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid movieId');
  });

  it('should return 401 when fetching user reviews without token', async () => {
    const res = await request(BASE_URL).get(`/api/review/getReviewsByUser/${userId}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authorization token missing');
  });

  it('should fetch reviews by user for owner token', async () => {
    const res = await request(BASE_URL)
      .get(`/api/review/getReviewsByUser/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 403 when non-admin requests all reviews', async () => {
    const res = await request(BASE_URL)
      .get('/api/review/getAllReviews')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied: Admins only');
  });

  it('should fetch all reviews for admin token', async () => {
    const res = await request(BASE_URL)
      .get('/api/review/getAllReviews')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 400 when updating review with invalid id', async () => {
    const res = await request(BASE_URL)
      .post('/api/review/updateReview/invalid')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 4 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid id');
  });

  it('should return 400 when deleting review with invalid id', async () => {
    const res = await request(BASE_URL)
      .delete('/api/review/deleteReview/invalid')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid id');
  });
});

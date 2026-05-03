import request from 'supertest';
import app from '../../app.js';
import User from './user.model.js';
import { connectTestDB, clearTestDB, closeTestDB } from '../../tests/setup.js';

// Setup and Teardown Hooks
beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

describe('Authentication API', () => {
  
  const testAdmin = {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Password123',
    role: 'admin'
  };

  describe('POST /api/auth/login', () => {
    
    it('should successfully log in with valid credentials', async () => {
      await User.create(testAdmin);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });

      // 3. Assert the expected outcomes
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return 401 for incorrect password', async () => {
      await User.create(testAdmin);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: 'Wrongpassword'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toMatch(/Incorrect email or password/i);
    });
  });
});
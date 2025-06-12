import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface ErrorResponse {
  statusCode: number;
  message: string[] | string;
  error: string;
}

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    wallet?: unknown;
  };
}

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fail if email is not valid', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'invalid-email', password: 'Password123!' })
      .expect(400);

    const body = res.body as ErrorResponse;
    if (Array.isArray(body.message)) {
      expect(body.message).toContain('Invalid email format');
    } else {
      expect(body.message).toBe('Invalid email format');
    }
  });
  it('should fail if email is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ password: 'Password123!' })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.message).toContain('Email is required');
  });

  it('should fail if password is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@test.com' })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.message).toContain('Password is required');
  });
  it('should fail if password is too short', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@test.com', password: '123' })
      .expect(400);

    const body = res.body as ErrorResponse;
    if (Array.isArray(body.message)) {
      expect(body.message).toContain(
        'Password must be at least 8 characters long',
      );
    } else {
      expect(body.message).toBe('Password must be at least 8 characters long');
    }
  });
  it('should fail if password lacks uppercase letters', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@test.com', password: 'password123!' })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.message).toContain(
      'Password must contain at least one uppercase letter',
    );
  });

  it('should fail if password lacks numbers', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@test.com', password: 'Password!' })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.message).toContain('Password must contain at least one number');
  });
  it('should fail if password lacks special characters', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@test.com', password: 'Password123' })
      .expect(400);

    const body = res.body as ErrorResponse;
    expect(body.message).toContain(
      'Password must contain at least one special character',
    );
  });

  it('should signup and login successfully', async () => {
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'newuser@test.com', password: 'Password123!' })
      .expect(201);

    const respBody = signupRes.body as { email: string };

    expect(respBody.email).toBe('newuser@test.com');
    expect(signupRes.body).not.toHaveProperty('password');

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'newuser@test.com', password: 'Password123!' })
      .expect(201);

    const body = loginRes.body as LoginResponse;

    expect(body.access_token).toBeDefined();
    expect(typeof body.access_token).toBe('string');
    expect(body.user.email).toBe('newuser@test.com');
  });

  it('should fail login with wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'wrongpass@test.com', password: 'Password123!' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'wrongpass@test.com', password: 'WrongPassword1!' })
      .expect(401);

    const body = loginRes.body as ErrorResponse;
    expect(body.message).toBe('Invalid credentials');
  });
});

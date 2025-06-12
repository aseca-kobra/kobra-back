import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { User } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
interface LoginResponse {
  access_token: string;
}

describe('UsersModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});

    const _signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'testuser@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const body = loginRes.body as LoginResponse;
    token = body.access_token;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should return 401 if no token is provided', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should return 1 user in the list after signup', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const respBody = res.body as { email: string; id: string }[];

      expect(respBody).toHaveLength(1);
      expect(respBody[0].email).toBe('testuser@example.com');
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return the user by id', async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        throw new Error('User not found in test setup');
      }

      const res = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect((res.body as User).email).toBe('testuser@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '9ecbad42-bddb-4b3b-88c9-ff4e4e5d1234';

      const res = await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      const errorBody = res.body as ErrorResponse;

      expect(errorBody.message).toContain('User with ID');
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should update user email', async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        throw new Error('User not found in test setup');
      }

      const res = await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'updated@example.com' })
        .expect(200);

      expect((res.body as User).email).toBe('updated@example.com');
    });

    it('should return 409 if email already exists', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
        })
        .expect(201);

      const user = await prisma.user.findFirst({
        where: { email: 'testuser@example.com' },
      });
      if (!user) {
        throw new Error('User not found in test setup');
      }

      const res = await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'duplicate@example.com' })
        .expect(409);

      const errorBody = res.body as ErrorResponse;
      expect(errorBody.message).toContain('Email already exists');
    });
    it('should return 400 if email is invalid', async () => {
      const user = await prisma.user.findFirst();

      await request(app.getHttpServer())
        .patch(`/users/${user!.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should soft delete the user, changing "isActive to false', async () => {
      const user = await prisma.user.findFirst();
      if (!user) {
        throw new Error('User not found in test setup');
      }

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const found = await prisma.user.findUnique({ where: { id: user.id } });

      expect(found).not.toBeNull();
      expect(found?.isActive).toBe(false);
    });
  });
});

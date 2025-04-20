import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean the database before tests
    await prismaService.user.deleteMany();

    await app.init();
  });

  afterAll(async () => {
    await prismaService.user.deleteMany();
    await app.close();
  });

  it('/users (POST) - should create a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
    expect(response.body).not.toHaveProperty('password'); // Password should not be returned
  });

  it('/users (GET) - should return all users', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

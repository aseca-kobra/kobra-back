import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Define interfaces for expected responses
interface UserResponse {
  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

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

    const responseBody = response.body as UserResponse;

    expect(responseBody).toHaveProperty('id');
    expect(responseBody.email).toBe('test@example.com');
    expect(responseBody).not.toHaveProperty('password'); // Password should not be returned
  });

  it('/users (GET) - should return all users', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    const responseBody = response.body as UserResponse[];

    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBeGreaterThan(0);
  });
});

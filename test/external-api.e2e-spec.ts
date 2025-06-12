import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  access_token: string;
}

describe('WalletController (e2e) - requestDebin integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        AppModule,
      ],
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

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'user1@example.com', password: 'Password123!' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user1@example.com', password: 'Password123!' })
      .expect(201);

    const loginResponse = res.body as LoginResponse;
    token = loginResponse.access_token;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  it('/wallet/debin (POST) should process a debin with SimBank', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallet/debin')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 });

    const responseBody = response.body as { id: string; balance: number };
    expect(response.status).toBe(201);
    expect(responseBody.balance).toBeDefined();
  });
  it('/wallet/debin (POST) should fail with invalid amount', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallet/debin')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -100 });

    expect(response.status).toBe(400);
  });
  it('/wallet/debin (POST) should fail without authorization', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallet/debin')
      .send({ amount: 100 });

    expect(response.status).toBe(401);
  });
  it('/wallet/debin (POST) should fail without amount', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallet/debin')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });
});

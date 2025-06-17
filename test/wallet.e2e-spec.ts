import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExternalApiService } from '../src/wallet/external-api.service';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

interface WalletResponse {
  balance: number;
}
const mockExternalApiService = {
  requestDebin: jest.fn().mockResolvedValue({ success: true }),
};

describe('WalletModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ExternalApiService)
      .useValue(mockExternalApiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'walletuser@example.com', password: 'Password123!' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'walletuser@example.com', password: 'Password123!' })
      .expect(201);

    const body = loginRes.body as { access_token: string };
    token = body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });
  describe('/wallet/balance (GET)', () => {
    it('should return 401 if no token provided', () => {
      return request(app.getHttpServer()).get('/wallet/balance').expect(401);
    });

    it('should return wallet balance for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const wallet = res.body as WalletResponse;
      expect(wallet).toHaveProperty('balance');
      expect(typeof wallet.balance).toBe('number');
    });
    it('should return initial wallet balance as 0 for a new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const wallet = res.body as WalletResponse;
      expect(wallet.balance).toBe(0);
    });
  });
  describe('/wallet/deposit (POST)', () => {
    it('should deposit amount successfully', async () => {
      const amount = 100;

      const res = await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ email: 'walletuser@example.com', amount })
        .expect(201);

      const wallet = res.body as WalletResponse;

      expect(wallet).toHaveProperty('balance');
      expect(wallet.balance).toBe(amount);
    });
    it('should return 400 if amount is zero or negative', async () => {
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ email: 'walletuser@example.com', amount: 0 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ email: 'walletuser@example.com', amount: -10 })
        .expect(400);
    });

    it('should return 404 if wallet not found', async () => {
      await request(app.getHttpServer())
        .post('/wallet/deposit')
        .send({ email: 'nonexistent@example.com', amount: 50 })
        .expect(404);
    });
  });
  describe('/wallet/debin (POST)', () => {
    it('should call externalApiService.requestDebin on /wallet/debin', async () => {
      const amount = 100;
      await request(app.getHttpServer())
        .post('/wallet/debin')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount })
        .expect(201);

      expect(mockExternalApiService.requestDebin).toHaveBeenCalledWith(
        'walletuser@example.com',
        amount,
      );
    });
    it('should return 400 if amount is missing or invalid', async () => {
      await request(app.getHttpServer())
        .post('/wallet/debin')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/wallet/debin')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -10 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/wallet/debin')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 0 })
        .expect(400);
    });

    it('should return 401 if no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/wallet/debin')
        .send({ amount: 50 })
        .expect(401);
    });
    it('should return 400 if external API responds with insufficient funds', async () => {
      mockExternalApiService.requestDebin.mockResolvedValueOnce({
        success: false,
        message: 'Insufficient funds',
      });

      const response = await request(app.getHttpServer())
        .post('/wallet/debin')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 999999 }) // Simula monto excesivo
        .expect(400);

      const errorBody = response.body as ErrorResponse;
      expect(errorBody.message).toContain('Insufficient funds');
    });
    it('should return 400 if external API responds with account not found', async () => {
      mockExternalApiService.requestDebin.mockResolvedValueOnce({
        success: false,
        message: 'Account not found',
      });

      const response = await request(app.getHttpServer())
        .post('/wallet/debin')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 }) // Monto normal
        .expect(400);

      const errorBody = response.body as ErrorResponse;
      expect(errorBody.message).toContain('Account not found');
    });
  });
});

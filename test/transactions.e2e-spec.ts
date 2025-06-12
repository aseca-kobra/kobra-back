import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Transaction } from '@prisma/client';

interface LoginResponse {
  access_token: string;
}
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

describe('TransactionsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenUser1: string;
  let tokenUser2: string;
  let user1Id: string;
  let user2Email: string;

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

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'user1@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user1@example.com',
        password: 'Password123!',
      })
      .expect(201);

    tokenUser1 = (login1.body as LoginResponse).access_token;

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'user2@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user2@example.com',
        password: 'Password123!',
      })
      .expect(201);

    tokenUser2 = (login2.body as LoginResponse).access_token;

    const user1 = await prisma.user.findFirst({
      where: { email: 'user1@example.com' },
    });
    const user2 = await prisma.user.findFirst({
      where: { email: 'user2@example.com' },
    });

    user1Id = user1!.id;
    user2Email = user2!.email;

    await prisma.wallet.update({
      where: { userId: user1Id },
      data: { balance: 1000 },
    });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('/transactions (POST)', () => {
    it('should transfer money between users', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          recipientEmail: user2Email,
          amount: 300,
        })
        .expect(201);

      const tx = res.body as Transaction;
      expect(tx.amount).toBe(300);
      expect(tx.type).toBe('TRANSFER_OUT');

      const user1Wallet = await prisma.wallet.findFirst({
        where: { userId: user1Id },
      });

      const user2Wallet = await prisma.wallet.findFirst({
        where: { user: { email: user2Email } },
      });

      expect(user1Wallet!.balance).toBe(700);
      expect(user2Wallet!.balance).toBe(300);
    });
    it('user2 should see received transaction', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          recipientEmail: user2Email,
          amount: 150,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .expect(200);

      const transactions = res.body as Transaction[];

      expect(
        transactions.some((tx: Transaction) => tx.type === 'TRANSFER_IN'),
      ).toBe(true);
    });

    it('should not allow transfer to yourself', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          recipientEmail: 'user1@example.com',
          amount: 100,
        })
        .expect(400);

      const errorResponse = res.body as ErrorResponse;
      expect(errorResponse.message).toContain('Cannot transfer to yourself');
    });

    it('should fail if balance is insufficient', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          recipientEmail: user2Email,
          amount: 10000,
        })
        .expect(400);

      const errorResponse = res.body as ErrorResponse;
      expect(errorResponse.message).toContain('Insufficient balance');
    });
  });

  describe('/transactions (GET)', () => {
    it('should list user transactions', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          recipientEmail: user2Email,
          amount: 100,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      const transactions = res.body as Transaction[];
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBe(1);
      expect(transactions[0]).toHaveProperty('relatedUser');
    });
  });

  describe('/transactions/:id (GET)', () => {
    it('should return transaction by id', async () => {
      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          recipientEmail: user2Email,
          amount: 100,
        })
        .expect(201);

      const tx = txRes.body as Transaction;

      const res = await request(app.getHttpServer())
        .get(`/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(200);

      expect(res.body).toHaveProperty('amount', 100);
      expect(res.body).toHaveProperty('relatedUser');
    });

    it('should return 404 for invalid transaction ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions/invalid-id-1234`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .expect(404);

      const errorResponse = res.body as ErrorResponse;
      expect(errorResponse.message).toContain('Transaction');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
  };
}

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('transfer', () => {
    it('should create a transfer transaction', async () => {
      const userId = '1';
      const mockRequest = { user: { userId } } as RequestWithUser;
      const transferDto = {
        amount: 100,
        recipientEmail: 'recipient@example.com',
      };
      const expectedTransaction = {
        id: 'transaction1',
        amount: 100,
        type: 'TRANSFER_OUT',
        walletId: 'wallet1',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: userId,
          wallet: { id: 'wallet1', balance: 200 },
        })
        .mockResolvedValueOnce({
          id: '2',
          wallet: { id: 'wallet2', balance: 0 },
        });
      mockPrismaService.transaction.create.mockResolvedValue(
        expectedTransaction,
      );

      const result = await controller.transfer(transferDto, mockRequest);

      expect(result).toEqual(expectedTransaction);
    });
  });

  describe('findAll', () => {
    it('should return all transactions for a user', async () => {
      const userId = '1';
      const mockRequest = { user: { userId } } as RequestWithUser;
      const expectedTransactions = [
        {
          id: 'transaction1',
          amount: 100,
          type: 'TRANSFER_OUT',
          walletId: 'wallet1',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        wallet: { id: 'wallet1' },
      });
      mockPrismaService.transaction.findMany.mockResolvedValue(
        expectedTransactions,
      );

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(expectedTransactions);
    });
  });

  describe('findOne', () => {
    it('should return a specific transaction', async () => {
      const userId = '1';
      const transactionId = 'transaction1';
      const mockRequest = { user: { userId } } as RequestWithUser;
      const expectedTransaction = {
        id: transactionId,
        amount: 100,
        type: 'TRANSFER_OUT',
        walletId: 'wallet1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        wallet: { id: 'wallet1' },
      });
      mockPrismaService.transaction.findFirst.mockResolvedValue(
        expectedTransaction,
      );

      const result = await controller.findOne(transactionId, mockRequest);

      expect(result).toEqual(expectedTransaction);
    });
  });
});

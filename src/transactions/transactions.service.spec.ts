import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionType, User, Wallet, Transaction } from '@prisma/client';

type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
  };
  wallet: {
    update: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(prisma: MockPrismaService) => Promise<unknown>]
  >;
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrismaService: MockPrismaService = {
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
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transfer transaction', async () => {
      const senderId = '1';
      const recipientEmail = 'recipient@example.com';
      const amount = 100;

      const mockSender: User & { wallet: Wallet } = {
        id: senderId,
        wallet: {
          id: 'wallet1',
          balance: 200,
          userId: senderId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'sender@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRecipient: User & { wallet: Wallet } = {
        id: '2',
        wallet: {
          id: 'wallet2',
          balance: 0,
          userId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: recipientEmail,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction: Transaction = {
        id: 'transaction1',
        amount,
        type: TransactionType.TRANSFER_OUT,
        walletId: mockSender.wallet.id,
        relatedUserId: mockRecipient.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockRecipient);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.create({ amount, recipientEmail }, senderId);

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.transaction.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if sender wallet not found', async () => {
      const senderId = '1';
      const recipientEmail = 'recipient@example.com';
      const amount = 100;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ amount, recipientEmail }, senderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if recipient not found', async () => {
      const senderId = '1';
      const recipientEmail = 'nonexistent@example.com';
      const amount = 100;

      const mockSender: User & { wallet: Wallet } = {
        id: senderId,
        wallet: {
          id: 'wallet1',
          balance: 200,
          userId: senderId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'sender@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(null);

      await expect(
        service.create({ amount, recipientEmail }, senderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      const senderId = '1';
      const recipientEmail = 'recipient@example.com';
      const amount = 300;

      const mockSender: User & { wallet: Wallet } = {
        id: senderId,
        wallet: {
          id: 'wallet1',
          balance: 200,
          userId: senderId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'sender@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRecipient: User & { wallet: Wallet } = {
        id: '2',
        wallet: {
          id: 'wallet2',
          balance: 0,
          userId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: recipientEmail,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockRecipient);

      await expect(
        service.create({ amount, recipientEmail }, senderId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all transactions for a user', async () => {
      const userId = '1';
      const mockUser: User & { wallet: Wallet } = {
        id: userId,
        wallet: {
          id: 'wallet1',
          balance: 100,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'user@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransactions: Transaction[] = [
        {
          id: 'transaction1',
          amount: 100,
          type: TransactionType.TRANSFER_OUT,
          walletId: 'wallet1',
          relatedUserId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.transaction.findMany.mockResolvedValue(
        mockTransactions,
      );

      const result = await service.findAll(userId);

      expect(result).toEqual(mockTransactions);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { walletId: mockUser.wallet.id },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a specific transaction', async () => {
      const userId = '1';
      const transactionId = 'transaction1';
      const mockUser: User & { wallet: Wallet } = {
        id: userId,
        wallet: {
          id: 'wallet1',
          balance: 100,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'user@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction: Transaction = {
        id: transactionId,
        amount: 100,
        type: TransactionType.TRANSFER_OUT,
        walletId: 'wallet1',
        relatedUserId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.transaction.findFirst.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.findOne(transactionId, userId);

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id: transactionId,
          walletId: mockUser.wallet.id,
        },
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      const transactionId = 'transaction1';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(transactionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const userId = '1';
      const transactionId = 'nonexistent';
      const mockUser: User & { wallet: Wallet } = {
        id: userId,
        wallet: {
          id: 'wallet1',
          balance: 100,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'user@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne(transactionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

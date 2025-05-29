import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsRepository } from './transactions.repository';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
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

describe('TransactionsRepository', () => {
  let repository: TransactionsRepository;
  let _prismaService: PrismaService;

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
        TransactionsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<TransactionsRepository>(TransactionsRepository);
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findUserWithWallet', () => {
    it('should return user with wallet', async () => {
      const userId = '1';
      const mockUser: User & { wallet: Wallet } = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        wallet: {
          id: 'wallet1',
          balance: 100,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserWithWallet(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { wallet: true },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = '999';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(repository.findUserWithWallet(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user has no wallet', async () => {
      const userId = '1';
      const mockUser: User & { wallet: null } = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        wallet: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(repository.findUserWithWallet(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findRecipientWithWallet', () => {
    it('should return recipient with wallet', async () => {
      const email = 'recipient@example.com';
      const mockRecipient: User & { wallet: Wallet } = {
        id: '2',
        email,
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        wallet: {
          id: 'wallet2',
          balance: 0,
          userId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockRecipient);

      const result = await repository.findRecipientWithWallet(email);

      expect(result).toEqual(mockRecipient);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { wallet: true },
      });
    });

    it('should throw NotFoundException if recipient not found', async () => {
      const email = 'nonexistent@example.com';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(repository.findRecipientWithWallet(email)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if recipient has no wallet', async () => {
      const email = 'recipient@example.com';
      const mockRecipient: User & { wallet: null } = {
        id: '2',
        email,
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        wallet: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockRecipient);

      await expect(repository.findRecipientWithWallet(email)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTransfer', () => {
    it('should create transfer transaction', async () => {
      const senderWalletId = 'wallet1';
      const recipientWalletId = 'wallet2';
      const amount = 100;
      const senderId = '1';
      const recipientId = '2';

      const mockTransaction: Transaction = {
        id: 'transaction1',
        amount,
        type: TransactionType.TRANSFER_OUT,
        walletId: senderWalletId,
        relatedUserId: recipientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await repository.createTransfer(
        senderWalletId,
        recipientWalletId,
        amount,
        senderId,
        recipientId,
      );

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.transaction.create).toHaveBeenCalledTimes(2);
    });

    it('should handle transaction errors', async () => {
      const senderWalletId = 'wallet1';
      const recipientWalletId = 'wallet2';
      const amount = 100;
      const senderId = '1';
      const recipientId = '2';
      const error = new Error('Transaction failed');

      mockPrismaService.wallet.update.mockRejectedValue(error);

      await expect(
        repository.createTransfer(
          senderWalletId,
          recipientWalletId,
          amount,
          senderId,
          recipientId,
        ),
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('findAllByWalletId', () => {
    it('should return all transactions for a wallet', async () => {
      const walletId = 'wallet1';
      const mockTransactions: Transaction[] = [
        {
          id: 'transaction1',
          amount: 100,
          type: TransactionType.TRANSFER_OUT,
          walletId,
          relatedUserId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.transaction.findMany.mockResolvedValue(
        mockTransactions,
      );

      const result = await repository.findAllByWalletId(walletId);

      expect(result).toEqual(mockTransactions);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: {
          walletId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          relatedUser: {
            select: {
              email: true,
            },
          },
        },
      });
    });
  });

  describe('findOneByWalletId', () => {
    it('should return a specific transaction', async () => {
      const id = 'transaction1';
      const walletId = 'wallet1';
      const mockTransaction: Transaction = {
        id,
        amount: 100,
        type: TransactionType.TRANSFER_OUT,
        walletId,
        relatedUserId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.transaction.findFirst.mockResolvedValue(
        mockTransaction,
      );

      const result = await repository.findOneByWalletId(id, walletId);

      expect(result).toEqual(mockTransaction);

      expect(mockPrismaService.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          id,
          walletId,
          relatedUserId: { not: null },
        },
        include: {
          relatedUser: {
            select: {
              email: true,
            },
          },
        },
      });
    });

    it('should return null if transaction not found', async () => {
      const id = 'nonexistent';
      const walletId = 'wallet1';

      mockPrismaService.transaction.findFirst.mockResolvedValue(null);

      const result = await repository.findOneByWalletId(id, walletId);

      expect(result).toBeNull();
    });
  });
});

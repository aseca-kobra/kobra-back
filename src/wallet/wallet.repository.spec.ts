import { Test, TestingModule } from '@nestjs/testing';
import { WalletRepository } from './wallet.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, Wallet } from '@prisma/client';

type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
  };
  wallet: {
    update: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(prisma: MockPrismaService) => Promise<unknown>]
  >;
};

describe('WalletRepository', () => {
  let repository: WalletRepository;
  let _prismaService: PrismaService;

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<WalletRepository>(WalletRepository);
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('find', () => {
    it('should return a wallet by id', async () => {
      const walletId = 'wallet1';
      const mockWallet: Wallet = {
        id: walletId,
        balance: 100,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await repository.find(walletId);

      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { id: walletId },
      });
    });

    it('should return null if wallet not found', async () => {
      const walletId = '999';
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      const result = await repository.find(walletId);

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return a wallet for a user', async () => {
      const userId = '1';
      const mockWallet = {
        id: 'wallet1',
        balance: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.wallet.findFirst.mockResolvedValue(mockWallet);

      const result = await repository.findByUserId(userId);

      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.wallet.findFirst).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        select: {
          id: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null if wallet not found', async () => {
      const userId = '999';
      mockPrismaService.wallet.findFirst.mockResolvedValue(null);

      const result = await repository.findByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('deposit', () => {
    it('should deposit money and create transaction', async () => {
      const walletId = 'wallet1';
      const amount = 100;
      const expectedWallet: Wallet = {
        id: walletId,
        balance: 200,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.wallet.update.mockResolvedValue(expectedWallet);
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'transaction1',
        amount,
        type: TransactionType.DEPOSIT,
        walletId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.deposit(walletId, amount);

      expect(result).toEqual(expectedWallet);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          amount,
          type: TransactionType.DEPOSIT,
          walletId,
        },
      });
    });

    it('should handle transaction errors', async () => {
      const walletId = 'wallet1';
      const amount = 100;
      const error = new Error('Transaction failed');

      mockPrismaService.wallet.update.mockRejectedValue(error);

      await expect(repository.deposit(walletId, amount)).rejects.toThrow(
        'Transaction failed',
      );
    });
  });
});

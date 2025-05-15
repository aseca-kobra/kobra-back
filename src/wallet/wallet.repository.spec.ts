import { Test, TestingModule } from '@nestjs/testing';
import { WalletRepository } from './wallet.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, User, Wallet } from '@prisma/client';

type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
  };
  wallet: {
    update: jest.Mock;
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

  describe('findByUserId', () => {
    it('should return a wallet for a user', async () => {
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

      const result = await repository.findByUserId(userId);

      expect(result).toEqual(mockUser.wallet);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { wallet: true },
      });
    });

    it('should return null if user not found', async () => {
      const userId = '999';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserId(userId);

      expect(result).toBeNull();
    });

    it('should return null if user has no wallet', async () => {
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

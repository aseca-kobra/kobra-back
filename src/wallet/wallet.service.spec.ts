import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  TransactionType,
  Prisma,
  User,
  Wallet,
  Transaction,
} from '@prisma/client';

describe('WalletService', () => {
  let service: WalletService;

  const mockPrismaService = {
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
  } as unknown as jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
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

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await service.getBalance(userId);

      expect(result).toEqual({ balance: 100 });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { wallet: true },
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getBalance(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deposit', () => {
    it('should deposit money to wallet', async () => {
      const userId = '1';
      const amount = 100;
      const mockUser: User & { wallet: Wallet } = {
        id: userId,
        wallet: {
          id: 'wallet1',
          balance: 0,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        email: 'user@example.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedWallet: Wallet = {
        id: 'wallet1',
        balance: 100,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (mockPrismaService.wallet.update as jest.Mock).mockResolvedValue(
        updatedWallet,
      );

      const result = await service.deposit(userId, amount);

      expect(result).toEqual(updatedWallet);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: mockUser.wallet.id },
        data: { balance: { increment: amount } },
      });
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          amount,
          type: TransactionType.DEPOSIT,
          walletId: mockUser.wallet.id,
        },
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      const amount = 100;
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deposit(userId, amount)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('extract', () => {
    it('should extract money from wallet', async () => {
      const userId = '1';
      const amount = 50;
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

      const updatedWallet: Wallet = {
        id: 'wallet1',
        balance: 50,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (mockPrismaService.wallet.update as jest.Mock).mockResolvedValue(
        updatedWallet,
      );

      const result = await service.extract(userId, amount);

      expect(result).toEqual(updatedWallet);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: mockUser.wallet.id },
        data: { balance: { decrement: amount } },
      });
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          amount,
          type: TransactionType.WITHDRAWAL,
          walletId: mockUser.wallet.id,
        },
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      const amount = 50;
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.extract(userId, amount)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      const userId = '1';
      const amount = 150;
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

      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );

      await expect(service.extract(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

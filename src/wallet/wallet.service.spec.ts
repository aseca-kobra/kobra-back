import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { NotFoundException } from '@nestjs/common';
import { Wallet } from '@prisma/client';

describe('WalletService', () => {
  let service: WalletService;
  let _repository: WalletRepository;

  const mockRepository = {
    findByUserId: jest.fn(),
    deposit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    _repository = module.get<WalletRepository>(WalletRepository);
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
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 100,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserId.mockResolvedValue(mockWallet);

      const result = await service.getBalance(userId);

      expect(result).toEqual({ balance: 100 });
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '999';
      mockRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getBalance(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deposit', () => {
    it('should deposit money to wallet', async () => {
      const userId = '1';
      const amount = 100;
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 200,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserId.mockResolvedValue(mockWallet);
      mockRepository.deposit.mockResolvedValue(mockWallet);

      const result = await service.deposit(userId, amount);

      expect(result).toEqual(mockWallet);
      expect(mockRepository.deposit).toHaveBeenCalledWith(
        mockWallet.id,
        amount,
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '999';
      const amount = 100;
      mockRepository.findByUserId.mockResolvedValue(null);

      await expect(service.deposit(userId, amount)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

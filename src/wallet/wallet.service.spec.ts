import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Wallet } from '@prisma/client';
import { ExternalApiService } from './external-api.service';

describe('WalletService', () => {
  let service: WalletService;
  let _repository: WalletRepository;

  const mockRepository = {
    find: jest.fn(),
    deposit: jest.fn(),
    findByUserId: jest.fn(),
    findByUserEmail: jest.fn(),
  };

  const mockExternalApiService = {
    requestDebin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: mockRepository,
        },
        {
          provide: ExternalApiService,
          useValue: mockExternalApiService,
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

      mockRepository.find.mockResolvedValue(mockWallet);
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
      const email = 'test@example.com';
      const amount = 100;
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 200,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
      mockRepository.deposit.mockResolvedValue(mockWallet);

      const result = await service.deposit(email, amount);

      expect(result).toEqual(mockWallet);
      expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
      expect(mockRepository.deposit).toHaveBeenCalledWith(
        mockWallet.id,
        amount,
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const email = 'nonexistent@example.com';
      const amount = 100;
      mockRepository.findByUserEmail.mockResolvedValue(null);

      await expect(service.deposit(email, amount)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('requestDebin', () => {
    it('should successfully process a DEBIN request', async () => {
      const email = 'test@example.com';
      const amount = 100;
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 100,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
      mockExternalApiService.requestDebin.mockResolvedValue({ success: true });
      mockRepository.deposit.mockResolvedValue(mockWallet);

      const result = await service.requestDebin(email, amount);

      expect(result).toEqual(mockWallet);
      expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
      expect(mockExternalApiService.requestDebin).toHaveBeenCalledWith(
        email,
        amount,
      );
      expect(mockRepository.deposit).toHaveBeenCalledWith(
        mockWallet.id,
        amount,
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const email = 'nonexistent@example.com';
      const amount = 100;
      mockRepository.findByUserEmail.mockResolvedValue(null);

      await expect(service.requestDebin(email, amount)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
      expect(mockRepository.deposit).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if DEBIN request fails', async () => {
      const email = 'test@example.com';
      const amount = 100;
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 200,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
      mockExternalApiService.requestDebin.mockResolvedValue({
        success: false,
        message: 'Insufficient funds',
      });

      await expect(service.requestDebin(email, amount)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.deposit).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if external API throws an error', async () => {
      const email = 'test@example.com';
      const amount = 100;
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 200,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
      mockExternalApiService.requestDebin.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(service.requestDebin(email, amount)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.deposit).not.toHaveBeenCalled();
    });
  });
});

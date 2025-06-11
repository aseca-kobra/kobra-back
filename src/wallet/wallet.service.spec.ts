import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Wallet } from '@prisma/client';
import { ExternalApiService } from './external-api.service';

describe('WalletService', () => {
  let service: WalletService;
  let _repository: WalletRepository;
  let _externalApiService: ExternalApiService;

  const mockRepository = {
    find: jest.fn(),
    deposit: jest.fn(),
    findByUserId: jest.fn(),
    findByUserEmail: jest.fn(),
  };

  const mockExternalApiService = {
    requestDebin: jest.fn(),
  };

  const mockWallet: Wallet = {
    id: 'wallet-123',
    balance: 100,
    userId: 'user-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    isActive: true,
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
    _externalApiService = module.get<ExternalApiService>(ExternalApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalance', () => {
    describe('when wallet exists', () => {
      it('should return wallet balance for valid user ID', async () => {
        const userId = 'user-123';
        mockRepository.findByUserId.mockResolvedValue(mockWallet);

        const result = await service.getBalance(userId);

        expect(result).toEqual({ balance: 100 });
        expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
        expect(mockRepository.findByUserId).toHaveBeenCalledTimes(1);
      });

      it('should return zero balance when wallet has zero balance', async () => {
        const userId = 'user-123';
        const zeroBalanceWallet = { ...mockWallet, balance: 0 };
        mockRepository.findByUserId.mockResolvedValue(zeroBalanceWallet);

        const result = await service.getBalance(userId);

        expect(result).toEqual({ balance: 0 });
      });

      it('should return negative balance when wallet is overdrawn', async () => {
        const userId = 'user-123';
        const negativeBalanceWallet = { ...mockWallet, balance: -50 };
        mockRepository.findByUserId.mockResolvedValue(negativeBalanceWallet);

        const result = await service.getBalance(userId);

        expect(result).toEqual({ balance: -50 });
      });

      it('should return very large balance correctly', async () => {
        const userId = 'user-123';
        const largeBalanceWallet = { ...mockWallet, balance: 999999999.99 };
        mockRepository.findByUserId.mockResolvedValue(largeBalanceWallet);

        const result = await service.getBalance(userId);

        expect(result).toEqual({ balance: 999999999.99 });
      });
    });

    describe('when wallet does not exist', () => {
      it('should throw NotFoundException when wallet not found for user', async () => {
        const userId = 'non-existent-user';
        mockRepository.findByUserId.mockResolvedValue(null);

        await expect(service.getBalance(userId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.getBalance(userId)).rejects.toThrow(
          'Wallet not found for this user',
        );
        expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
      });

      it('should throw NotFoundException when wallet is undefined', async () => {
        const userId = 'user-123';
        mockRepository.findByUserId.mockResolvedValue(undefined);

        await expect(service.getBalance(userId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('edge cases for user ID', () => {
      it('should handle empty string user ID', async () => {
        const userId = '';
        mockRepository.findByUserId.mockResolvedValue(null);

        await expect(service.getBalance(userId)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockRepository.findByUserId).toHaveBeenCalledWith('');
      });
    });
  });

  describe('deposit', () => {
    describe('when wallet exists', () => {
      it('should deposit positive amount successfully', async () => {
        const email = 'test@example.com';
        const amount = 50;
        const updatedWallet = { ...mockWallet, balance: 150 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        const result = await service.deposit(email, amount);

        expect(result).toEqual(updatedWallet);
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockRepository.deposit).toHaveBeenCalledWith(
          'wallet-123',
          amount,
        );
      });

      it('should deposit small positive amount (0.01)', async () => {
        const email = 'test@example.com';
        const amount = 0.01;
        const updatedWallet = { ...mockWallet, balance: 100.01 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        const result = await service.deposit(email, amount);

        expect(result).toEqual(updatedWallet);
        expect(mockRepository.deposit).toHaveBeenCalledWith('wallet-123', 0.01);
      });

      it('should deposit large amount successfully', async () => {
        const email = 'test@example.com';
        const amount = 1000000;
        const updatedWallet = { ...mockWallet, balance: 1000100 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        const result = await service.deposit(email, amount);

        expect(result).toEqual(updatedWallet);
        expect(mockRepository.deposit).toHaveBeenCalledWith(
          'wallet-123',
          amount,
        );
      });

      it('should fail to deposit negative amount', async () => {
        const email = 'test@example.com';
        const amount = -50;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);

        await expect(service.deposit(email, amount)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.deposit(email, amount)).rejects.toThrow(
          'Amount must be greater than zero',
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });

      it('should fail to deposit zero amount', async () => {
        const email = 'test@example.com';
        const amount = 0;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);

        await expect(service.deposit(email, amount)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.deposit(email, amount)).rejects.toThrow(
          'Amount must be greater than zero',
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });
    });

    describe('when wallet does not exist', () => {
      it('should throw NotFoundException when email not found', async () => {
        const email = 'nonexistent@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(null);

        await expect(service.deposit(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.deposit(email, amount)).rejects.toThrow(
          'Wallet not found for this user',
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when wallet is undefined', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(undefined);

        await expect(service.deposit(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });
    });

    describe('edge cases for email', () => {
      it('should handle empty email string', async () => {
        const email = '';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(null);

        await expect(service.deposit(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith('');
      });
    });
  });

  describe('requestDebin', () => {
    describe('successful DEBIN requests', () => {
      it('should successfully process DEBIN with valid data', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const updatedWallet = { ...mockWallet, balance: 200 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: true,
        });
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(updatedWallet);
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockExternalApiService.requestDebin).toHaveBeenCalledWith(
          email,
          amount,
        );
        expect(mockRepository.deposit).toHaveBeenCalledWith(
          'wallet-123',
          amount,
        );
      });

      it('should process DEBIN with minimum amount', async () => {
        const email = 'test@example.com';
        const amount = 0.01;
        const updatedWallet = { ...mockWallet, balance: 100.01 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: true,
        });
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(updatedWallet);
        expect(mockExternalApiService.requestDebin).toHaveBeenCalledWith(
          email,
          0.01,
        );
      });

      it('should process DEBIN with large amount', async () => {
        const email = 'test@example.com';
        const amount = 1000000;
        const updatedWallet = { ...mockWallet, balance: 1000100 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: true,
        });
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(updatedWallet);
        expect(mockExternalApiService.requestDebin).toHaveBeenCalledWith(
          email,
          amount,
        );
      });

      it('should fail to process DEBIN with negative amount', async () => {
        const email = 'test@example.com';
        const amount = -50;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'Amount must be greater than zero',
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });

      it('should fail to process DEBIN with zero amount', async () => {
        const email = 'test@example.com';
        const amount = 0;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'Amount must be greater than zero',
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });
    });

    describe('wallet not found scenarios', () => {
      it('should fail when wallet not found by email', async () => {
        const email = 'nonexistent@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(null);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'Wallet not found for this user',
        );
        expect(mockRepository.findByUserEmail).toHaveBeenCalledWith(email);
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });

      it('should fail when wallet is undefined', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(undefined);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
      });

      it('should fail when wallet has no ID', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const walletWithoutId = { ...mockWallet, id: null };
        mockRepository.findByUserEmail.mockResolvedValue(walletWithoutId);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
      });

      it('should fail when wallet has empty string ID', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const walletWithEmptyId = { ...mockWallet, id: '' };
        mockRepository.findByUserEmail.mockResolvedValue(walletWithEmptyId);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
      });
    });

    describe('DEBIN request failures', () => {
      it('should fail when DEBIN request fails with success false', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: false,
          message: 'Insufficient funds',
        });

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'Failed to process DEBIN request: Insufficient funds',
        );
        expect(mockExternalApiService.requestDebin).toHaveBeenCalledWith(
          email,
          amount,
        );
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });

      it('should fail when DEBIN fails with empty message', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: false,
          message: '',
        });

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'Failed to process DEBIN request: ',
        );
      });
    });

    describe('method call order verification', () => {
      it('should call methods in correct order for successful DEBIN', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const updatedWallet = { ...mockWallet, balance: 200 };
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: true,
        });
        mockRepository.deposit.mockResolvedValue(updatedWallet);

        await service.requestDebin(email, amount);

        const findCall =
          mockRepository.findByUserEmail.mock.invocationCallOrder[0];
        const debinCall =
          mockExternalApiService.requestDebin.mock.invocationCallOrder[0];
        const depositCall = mockRepository.deposit.mock.invocationCallOrder[0];

        expect(findCall).toBeLessThan(debinCall);
        expect(debinCall).toBeLessThan(depositCall);
      });

      it('should not call deposit when wallet not found', async () => {
        const email = 'nonexistent@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(null);

        await expect(service.requestDebin(email, amount)).rejects.toThrow();
        expect(mockRepository.findByUserEmail).toHaveBeenCalled();
        expect(mockExternalApiService.requestDebin).not.toHaveBeenCalled();
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });

      it('should not call deposit when DEBIN fails', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockRepository.findByUserEmail.mockResolvedValue(mockWallet);
        mockExternalApiService.requestDebin.mockResolvedValue({
          success: false,
          message: 'Failed',
        });

        await expect(service.requestDebin(email, amount)).rejects.toThrow();
        expect(mockRepository.findByUserEmail).toHaveBeenCalled();
        expect(mockExternalApiService.requestDebin).toHaveBeenCalled();
        expect(mockRepository.deposit).not.toHaveBeenCalled();
      });
    });
  });
});

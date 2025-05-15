import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.types';
import { WalletOperationDto } from './dto/wallet.dto';
import { Wallet } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletController', () => {
  let controller: WalletController;
  let _service: WalletService;

  const mockWalletService = {
    getBalance: jest.fn(),
    deposit: jest.fn(),
    requestDebin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletController>(WalletController);
    _service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWallet', () => {
    it('should return wallet balance', async () => {
      const userId = '1';
      const expectedBalance = { balance: 100 };
      const mockRequest = { user: { userId } } as RequestWithUser;

      mockWalletService.getBalance.mockResolvedValue(expectedBalance);

      const result = await controller.getWallet(mockRequest);

      expect(result).toEqual(expectedBalance);
      expect(mockWalletService.getBalance).toHaveBeenCalledWith(userId);
    });
  });

  describe('deposit', () => {
    it('should deposit money to wallet', async () => {
      const walletId = 'walletId';
      const amount = 100;
      const mockRequest = { walletId, amount } as WalletOperationDto;
      const expectedWallet = { id: 'wallet1', balance: 100 };

      mockWalletService.deposit.mockResolvedValue(expectedWallet);

      const result = await controller.deposit(mockRequest);

      expect(result).toEqual(expectedWallet);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(walletId, amount);
    });
  });

  describe('requestDebin', () => {
    it('should successfully process a DEBIN request', async () => {
      const dto: WalletOperationDto = {
        walletId: 'wallet1',
        amount: 100,
      };
      const mockWallet: Wallet = {
        id: dto.walletId,
        balance: 200,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletService.requestDebin.mockResolvedValue(mockWallet);

      const result = await controller.requestDebin(dto);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.requestDebin).toHaveBeenCalledWith(
        dto.walletId,
        dto.amount,
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const dto: WalletOperationDto = {
        walletId: '999',
        amount: 100,
      };

      mockWalletService.requestDebin.mockRejectedValue(
        new NotFoundException('Wallet not found for this user'),
      );

      await expect(controller.requestDebin(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if DEBIN request fails', async () => {
      const dto: WalletOperationDto = {
        walletId: 'wallet1',
        amount: 100,
      };

      mockWalletService.requestDebin.mockRejectedValue(
        new BadRequestException('Failed to process DEBIN request'),
      );

      await expect(controller.requestDebin(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

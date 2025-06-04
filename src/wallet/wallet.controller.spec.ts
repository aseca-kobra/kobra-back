import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.types';
import {
  ExternalWalletOperationDto,
  WalletOperationDto,
} from './dto/wallet.dto';
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
      const email = 'test@example.com';
      const amount = 100;
      const dto: ExternalWalletOperationDto = { email, amount };
      const expectedWallet = { id: 'wallet1', balance: 100 };

      mockWalletService.deposit.mockResolvedValue(expectedWallet);

      const result = await controller.deposit(dto);

      expect(result).toEqual(expectedWallet);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(email, amount);
    });
  });

  describe('requestDebin', () => {
    it('should successfully process a DEBIN request', async () => {
      const email = 'test@example.com';
      const mockRequest = { user: { email } } as RequestWithUser;
      const dto: WalletOperationDto = { amount: 100 };
      const mockWallet: Wallet = {
        id: 'wallet1',
        balance: 200,
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletService.requestDebin.mockResolvedValue(mockWallet);

      const result = await controller.requestDebin(dto, mockRequest);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.requestDebin).toHaveBeenCalledWith(
        email,
        dto.amount,
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const email = 'nonexistent@example.com';
      const mockRequest = { user: { email } } as RequestWithUser;
      const dto: WalletOperationDto = { amount: 100 };

      mockWalletService.requestDebin.mockRejectedValue(
        new NotFoundException('Wallet not found for this user'),
      );

      await expect(controller.requestDebin(dto, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if DEBIN request fails', async () => {
      const email = 'test@example.com';
      const mockRequest = { user: { email } } as RequestWithUser;
      const dto: WalletOperationDto = { amount: 100 };

      mockWalletService.requestDebin.mockRejectedValue(
        new BadRequestException('Failed to process DEBIN request'),
      );

      await expect(controller.requestDebin(dto, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

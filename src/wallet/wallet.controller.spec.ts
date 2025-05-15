import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.types';

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
      const userId = '1';
      const amount = 100;
      const mockRequest = { user: { userId } } as RequestWithUser;
      const expectedWallet = { id: 'wallet1', balance: 100 };

      mockWalletService.deposit.mockResolvedValue(expectedWallet);

      const result = await controller.deposit(mockRequest, { amount });

      expect(result).toEqual(expectedWallet);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(userId, amount);
    });
  });
});

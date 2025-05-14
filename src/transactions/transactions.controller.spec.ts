import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/types/request.types';
import { TransactionType, Transaction } from '@prisma/client';
import { TransactionOwnerGuard } from './guards/transaction-owner.guard';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let _service: TransactionsService;

  const mockTransactionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TransactionOwnerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
    _service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('transfer', () => {
    it('should create a transfer transaction', async () => {
      const userId = '1';
      const mockRequest = { user: { userId } } as RequestWithUser;
      const transferDto = {
        amount: 100,
        recipientEmail: 'recipient@example.com',
      };
      const expectedTransaction: Transaction = {
        id: 'transaction1',
        amount: 100,
        type: TransactionType.TRANSFER_OUT,
        walletId: 'wallet1',
        relatedUserId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionService.create.mockResolvedValue(expectedTransaction);

      const result = await controller.transfer(transferDto, mockRequest);

      expect(result).toEqual(expectedTransaction);
      expect(mockTransactionService.create).toHaveBeenCalledWith(
        transferDto,
        userId,
      );
    });
  });

  describe('findAll', () => {
    it('should return all transactions for a user', async () => {
      const userId = '1';
      const mockRequest = { user: { userId } } as RequestWithUser;
      const expectedTransactions: Transaction[] = [
        {
          id: 'transaction1',
          amount: 100,
          type: TransactionType.TRANSFER_OUT,
          walletId: 'wallet1',
          relatedUserId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockTransactionService.findAll.mockResolvedValue(expectedTransactions);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(expectedTransactions);
      expect(mockTransactionService.findAll).toHaveBeenCalledWith(userId);
    });
  });

  describe('findOne', () => {
    it('should return a specific transaction', async () => {
      const userId = '1';
      const transactionId = 'transaction1';
      const mockRequest = { user: { userId } } as RequestWithUser;
      const expectedTransaction: Transaction = {
        id: transactionId,
        amount: 100,
        type: TransactionType.TRANSFER_OUT,
        walletId: 'wallet1',
        relatedUserId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionService.findOne.mockResolvedValue(expectedTransaction);

      const result = await controller.findOne(transactionId, mockRequest);

      expect(result).toEqual(expectedTransaction);
      expect(mockTransactionService.findOne).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
    });
  });
});

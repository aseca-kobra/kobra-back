import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionType, User, Wallet, Transaction } from '@prisma/client';
import { TransactionWithRelatedUser } from './types/transaction.types';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let _repository: TransactionsRepository;

  const mockRepository = {
    findUserWithWallet: jest.fn(),
    findRecipientWithWallet: jest.fn(),
    createTransfer: jest.fn(),
    findAllByWalletId: jest.fn(),
    findOneByWalletId: jest.fn(),
  };

  const mockSender: User & { wallet: Wallet } = {
    id: 'sender-123',
    email: 'sender@example.com',
    password: 'hashedPassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    wallet: {
      id: 'wallet-sender-123',
      balance: 1000,
      userId: 'sender-123',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  };

  const mockRecipient: User & { wallet: Wallet } = {
    id: 'recipient-123',
    email: 'recipient@example.com',
    password: 'hashedPassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    wallet: {
      id: 'wallet-recipient-123',
      balance: 500,
      userId: 'recipient-123',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  };

  const mockTransaction: Transaction = {
    id: 'transaction-123',
    amount: 100,
    type: TransactionType.TRANSFER_OUT,
    walletId: 'wallet-sender-123',
    relatedUserId: 'recipient-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    _repository = module.get<TransactionsRepository>(TransactionsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    describe('successful transfers', () => {
      it('should create transfer with valid amount', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);
        mockRepository.createTransfer.mockResolvedValue(mockTransaction);

        const result = await service.create(createDto, senderId);

        expect(result).toEqual(mockTransaction);
        expect(mockRepository.findUserWithWallet).toHaveBeenCalledWith(
          senderId,
        );
        expect(mockRepository.findRecipientWithWallet).toHaveBeenCalledWith(
          createDto.recipientEmail,
        );
        expect(mockRepository.createTransfer).toHaveBeenCalledWith(
          mockSender.wallet.id,
          mockRecipient.wallet.id,
          createDto.amount,
          mockSender.id,
          mockRecipient.id,
        );
      });

      it('should create transfer with small valid amount (0.01)', async () => {
        const createDto = {
          amount: 0.01,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';
        const smallAmountTransaction = { ...mockTransaction, amount: 0.01 };

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);
        mockRepository.createTransfer.mockResolvedValue(smallAmountTransaction);

        const result = await service.create(createDto, senderId);

        expect(result).toEqual(smallAmountTransaction);
        expect(mockRepository.createTransfer).toHaveBeenCalledWith(
          mockSender.wallet.id,
          mockRecipient.wallet.id,
          0.01,
          mockSender.id,
          mockRecipient.id,
        );
      });

      it('should create transfer with exact balance amount', async () => {
        const createDto = {
          amount: 1000,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';
        const exactBalanceTransaction = { ...mockTransaction, amount: 1000 };

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);
        mockRepository.createTransfer.mockResolvedValue(
          exactBalanceTransaction,
        );

        const result = await service.create(createDto, senderId);

        expect(result).toEqual(exactBalanceTransaction);
        expect(mockRepository.createTransfer).toHaveBeenCalledWith(
          mockSender.wallet.id,
          mockRecipient.wallet.id,
          1000,
          mockSender.id,
          mockRecipient.id,
        );
      });
    });

    describe('insufficient balance scenarios', () => {
      it('should throw BadRequestException when amount exceeds balance', async () => {
        const createDto = {
          amount: 1500,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);

        await expect(service.create(createDto, senderId)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.create(createDto, senderId)).rejects.toThrow(
          'Insufficient balance',
        );
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when amount slightly exceeds balance', async () => {
        const createDto = {
          amount: 1000.01,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);

        await expect(service.create(createDto, senderId)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when sender has zero balance', async () => {
        const createDto = {
          amount: 1,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';
        const zeroBalanceSender = {
          ...mockSender,
          wallet: { ...mockSender.wallet, balance: 0 },
        };

        mockRepository.findUserWithWallet.mockResolvedValue(zeroBalanceSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);

        await expect(service.create(createDto, senderId)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });
    });

    describe('sender not found scenarios', () => {
      it('should throw NotFoundException when sender user not found', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'non-existent-sender';

        mockRepository.findUserWithWallet.mockRejectedValue(
          new NotFoundException('Wallet not found for this user'),
        );

        await expect(service.create(createDto, senderId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.create(createDto, senderId)).rejects.toThrow(
          'Wallet not found for this user',
        );
        expect(mockRepository.findRecipientWithWallet).not.toHaveBeenCalled();
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when sender wallet is null', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';
        const senderWithoutWallet = { ...mockSender, wallet: null };

        mockRepository.findUserWithWallet.mockResolvedValue(
          senderWithoutWallet,
        );
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);

        await expect(service.create(createDto, senderId)).rejects.toThrow();
        expect(mockRepository.findRecipientWithWallet).toHaveBeenCalledWith(
          createDto.recipientEmail,
        );
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });
    });

    describe('recipient not found scenarios', () => {
      it('should throw NotFoundException when recipient email not found', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'nonexistent@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockRejectedValue(
          new NotFoundException('Recipient not found'),
        );

        await expect(service.create(createDto, senderId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.create(createDto, senderId)).rejects.toThrow(
          'Recipient not found',
        );
        expect(mockRepository.findUserWithWallet).toHaveBeenCalledWith(
          senderId,
        );
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when recipient wallet is null', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';
        const recipientWithoutWallet = { ...mockRecipient, wallet: null };

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(
          recipientWithoutWallet,
        );

        await expect(service.create(createDto, senderId)).rejects.toThrow();
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });
    });

    describe('method call order verification', () => {
      it('should call methods in correct order for successful transfer', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);
        mockRepository.createTransfer.mockResolvedValue(mockTransaction);

        await service.create(createDto, senderId);

        const senderCall =
          mockRepository.findUserWithWallet.mock.invocationCallOrder[0];
        const recipientCall =
          mockRepository.findRecipientWithWallet.mock.invocationCallOrder[0];
        const transferCall =
          mockRepository.createTransfer.mock.invocationCallOrder[0];

        expect(senderCall).toBeLessThan(recipientCall);
        expect(recipientCall).toBeLessThan(transferCall);
      });

      it('should not call createTransfer when sender not found', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'non-existent';

        mockRepository.findUserWithWallet.mockRejectedValue(
          new NotFoundException('Wallet not found for this user'),
        );

        await expect(service.create(createDto, senderId)).rejects.toThrow();
        expect(mockRepository.findUserWithWallet).toHaveBeenCalled();
        expect(mockRepository.findRecipientWithWallet).not.toHaveBeenCalled();
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });

      it('should not call createTransfer when recipient not found', async () => {
        const createDto = {
          amount: 100,
          recipientEmail: 'nonexistent@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockRejectedValue(
          new NotFoundException('Recipient not found'),
        );

        await expect(service.create(createDto, senderId)).rejects.toThrow();
        expect(mockRepository.findUserWithWallet).toHaveBeenCalled();
        expect(mockRepository.findRecipientWithWallet).toHaveBeenCalled();
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });

      it('should not call createTransfer when insufficient balance', async () => {
        const createDto = {
          amount: 2000,
          recipientEmail: 'recipient@example.com',
        };
        const senderId = 'sender-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);

        await expect(service.create(createDto, senderId)).rejects.toThrow();
        expect(mockRepository.findUserWithWallet).toHaveBeenCalled();
        expect(mockRepository.findRecipientWithWallet).toHaveBeenCalled();
        expect(mockRepository.createTransfer).not.toHaveBeenCalled();
      });
    });
  });

  describe('findAll', () => {
    describe('successful retrieval', () => {
      it('should return all transactions for user with transactions', async () => {
        const userId = 'sender-123';
        const mockTransactions: TransactionWithRelatedUser[] = [
          {
            ...mockTransaction,
            relatedUser: {
              email: 'recipient@example.com',
            },
          },
          {
            id: 'transaction-456',
            amount: 200,
            type: TransactionType.TRANSFER_IN,
            walletId: 'wallet-sender-123',
            relatedUserId: 'sender-456',
            createdAt: new Date('2025-01-02'),
            updatedAt: new Date('2025-01-02'),
            relatedUser: {
              email: 'another@example.com',
            },
          },
        ];

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findAllByWalletId.mockResolvedValue(mockTransactions);

        const result = await service.findAll(userId);

        expect(result).toEqual(mockTransactions);
        expect(mockRepository.findUserWithWallet).toHaveBeenCalledWith(userId);
        expect(mockRepository.findAllByWalletId).toHaveBeenCalledWith(
          mockSender.wallet.id,
        );
        expect(result).toHaveLength(2);
      });

      it('should return empty array for user with no transactions', async () => {
        const userId = 'sender-123';
        const emptyTransactions: TransactionWithRelatedUser[] = [];

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findAllByWalletId.mockResolvedValue(emptyTransactions);

        const result = await service.findAll(userId);

        expect(result).toEqual([]);
        expect(mockRepository.findAllByWalletId).toHaveBeenCalledWith(
          mockSender.wallet.id,
        );
      });

      it('should return single transaction for user with one transaction', async () => {
        const userId = 'sender-123';
        const singleTransaction: TransactionWithRelatedUser[] = [
          {
            ...mockTransaction,
            relatedUser: {
              email: 'recipient@example.com',
            },
          },
        ];

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findAllByWalletId.mockResolvedValue(singleTransaction);

        const result = await service.findAll(userId);

        expect(result).toEqual(singleTransaction);
        expect(result).toHaveLength(1);
      });
    });

    describe('user not found scenarios', () => {
      it('should throw NotFoundException when user not found', async () => {
        const userId = 'non-existent-user';

        mockRepository.findUserWithWallet.mockRejectedValue(
          new NotFoundException('Wallet not found for this user'),
        );

        await expect(service.findAll(userId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findAll(userId)).rejects.toThrow(
          'Wallet not found for this user',
        );
        expect(mockRepository.findUserWithWallet).toHaveBeenCalledWith(userId);
        expect(mockRepository.findAllByWalletId).not.toHaveBeenCalled();
      });

      it('should throw error when wallet is null', async () => {
        const userId = 'sender-123';
        const userWithoutWallet = { ...mockSender, wallet: null };

        mockRepository.findUserWithWallet.mockResolvedValue(userWithoutWallet);

        await expect(service.findAll(userId)).rejects.toThrow();
        expect(mockRepository.findAllByWalletId).not.toHaveBeenCalled();
      });
    });
  });

  describe('findOne', () => {
    describe('successful retrieval', () => {
      it('should return specific transaction when found', async () => {
        const userId = 'sender-123';
        const transactionId = 'transaction-123';
        const mockTransactionWithUser: TransactionWithRelatedUser = {
          ...mockTransaction,
          relatedUser: {
            email: 'recipient@example.com',
          },
        };

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findOneByWalletId.mockResolvedValue(
          mockTransactionWithUser,
        );

        const result = await service.findOne(transactionId, userId);

        expect(result).toEqual(mockTransactionWithUser);
        expect(mockRepository.findUserWithWallet).toHaveBeenCalledWith(userId);
        expect(mockRepository.findOneByWalletId).toHaveBeenCalledWith(
          transactionId,
          mockSender.wallet.id,
        );
      });

      it('should return transaction with different types', async () => {
        const userId = 'sender-123';
        const transactionId = 'transaction-456';
        const transferInTransaction: TransactionWithRelatedUser = {
          id: transactionId,
          amount: 200,
          type: TransactionType.TRANSFER_IN,
          walletId: 'wallet-sender-123',
          relatedUserId: 'sender-456',
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
          relatedUser: {
            email: 'another@example.com',
          },
        };

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findOneByWalletId.mockResolvedValue(
          transferInTransaction,
        );

        const result = await service.findOne(transactionId, userId);

        expect(result).toEqual(transferInTransaction);
        expect(result.type).toBe(TransactionType.TRANSFER_IN);
      });
    });

    describe('transaction not found scenarios', () => {
      it('should throw NotFoundException when transaction not found', async () => {
        const userId = 'sender-123';
        const transactionId = 'non-existent-transaction';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findOneByWalletId.mockResolvedValue(null);

        await expect(service.findOne(transactionId, userId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findOne(transactionId, userId)).rejects.toThrow(
          `Transaction with ID ${transactionId} not found`,
        );
        expect(mockRepository.findOneByWalletId).toHaveBeenCalledWith(
          transactionId,
          mockSender.wallet.id,
        );
      });

      it('should throw NotFoundException when transaction is undefined', async () => {
        const userId = 'sender-123';
        const transactionId = 'transaction-123';

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findOneByWalletId.mockResolvedValue(undefined);

        await expect(service.findOne(transactionId, userId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('user not found scenarios', () => {
      it('should throw NotFoundException when user not found', async () => {
        const userId = 'non-existent-user';
        const transactionId = 'transaction-123';

        mockRepository.findUserWithWallet.mockRejectedValue(
          new NotFoundException('Wallet not found for this user'),
        );

        await expect(service.findOne(transactionId, userId)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.findOne(transactionId, userId)).rejects.toThrow(
          'Wallet not found for this user',
        );
        expect(mockRepository.findUserWithWallet).toHaveBeenCalledWith(userId);
        expect(mockRepository.findOneByWalletId).not.toHaveBeenCalled();
      });

      it('should throw error when wallet is null', async () => {
        const userId = 'sender-123';
        const transactionId = 'transaction-123';
        const userWithoutWallet = { ...mockSender, wallet: null };

        mockRepository.findUserWithWallet.mockResolvedValue(userWithoutWallet);

        await expect(service.findOne(transactionId, userId)).rejects.toThrow();
        expect(mockRepository.findOneByWalletId).not.toHaveBeenCalled();
      });
    });

    describe('method call order verification', () => {
      it('should call methods in correct order for successful retrieval', async () => {
        const userId = 'sender-123';
        const transactionId = 'transaction-123';
        const mockTransactionWithUser: TransactionWithRelatedUser = {
          ...mockTransaction,
          relatedUser: {
            email: 'recipient@example.com',
          },
        };

        mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
        mockRepository.findOneByWalletId.mockResolvedValue(
          mockTransactionWithUser,
        );

        await service.findOne(transactionId, userId);

        const userCall =
          mockRepository.findUserWithWallet.mock.invocationCallOrder[0];
        const transactionCall =
          mockRepository.findOneByWalletId.mock.invocationCallOrder[0];

        expect(userCall).toBeLessThan(transactionCall);
      });

      it('should not call findOneByWalletId when user not found', async () => {
        const userId = 'non-existent';
        const transactionId = 'transaction-123';

        mockRepository.findUserWithWallet.mockRejectedValue(
          new NotFoundException('Wallet not found for this user'),
        );

        await expect(service.findOne(transactionId, userId)).rejects.toThrow();
        expect(mockRepository.findUserWithWallet).toHaveBeenCalled();
        expect(mockRepository.findOneByWalletId).not.toHaveBeenCalled();
      });
    });
  });
});

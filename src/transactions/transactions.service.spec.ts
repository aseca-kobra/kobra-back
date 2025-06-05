import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionType, User, Wallet, Transaction } from '@prisma/client';

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

  let mockSender: User & { wallet: Wallet };
  let mockRecipient: User & { wallet: Wallet };
  let now: Date;

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

    now = new Date();

    mockSender = {
      id: '1',
      email: 'sender@example.com',
      password: 'hashedPassword',
      createdAt: now,
      updatedAt: now,
      wallet: {
        id: 'wallet1',
        balance: 200,
        userId: '1',
        createdAt: now,
        updatedAt: now,
      },
    };

    mockRecipient = {
      id: '2',
      email: 'recipient@example.com',
      password: 'hashedPassword',
      createdAt: now,
      updatedAt: now,
      wallet: {
        id: 'wallet2',
        balance: 0,
        userId: '2',
        createdAt: now,
        updatedAt: now,
      },
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should have a create method', () => {
      expect(typeof service.create).toBe('function');
    });
    it('should create a transfer transaction', async () => {
      const senderId = '1';
      const recipientEmail = 'recipient@example.com';
      const amount = 100;

      const mockTransaction: Transaction = {
        id: 'transaction1',
        amount,
        type: TransactionType.TRANSFER_OUT,
        walletId: mockSender.wallet.id,
        relatedUserId: mockRecipient.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);
      mockRepository.createTransfer.mockResolvedValue(mockTransaction);

      const result = await service.create({ amount, recipientEmail }, senderId);

      expect(result).toEqual(mockTransaction);
      expect(mockRepository.createTransfer).toHaveBeenCalledWith(
        mockSender.wallet.id,
        mockRecipient.wallet.id,
        amount,
        mockSender.id,
        mockRecipient.id,
      );
    });

    it('should throw NotFoundException if sender wallet not found', async () => {
      const senderId = '1';
      const recipientEmail = 'recipient@example.com';
      const amount = 100;

      mockRepository.findUserWithWallet.mockRejectedValue(
        new NotFoundException('Wallet not found for this user'),
      );

      await expect(
        service.create({ amount, recipientEmail }, senderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if recipient not found', async () => {
      const senderId = '1';
      const recipientEmail = 'nonexistent@example.com';
      const amount = 100;
      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findRecipientWithWallet.mockRejectedValue(
        new NotFoundException('Recipient not found'),
      );

      await expect(
        service.create({ amount, recipientEmail }, senderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      const senderId = '1';
      const recipientEmail = 'recipient@example.com';
      const amount = 300;

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findRecipientWithWallet.mockResolvedValue(mockRecipient);

      await expect(
        service.create({ amount, recipientEmail }, senderId),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if sender tries to transfer to self', async () => {
      const senderId = '1';
      const email = 'sender@example.com';
      const amount = 50;

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findRecipientWithWallet.mockResolvedValue(mockSender);

      await expect(
        service.create({ amount, recipientEmail: email }, senderId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should have a findAll method', () => {
      expect(typeof service.findAll).toBe('function');
    });
    it('should return an empty array if there are no transactions', async () => {
      const userId = '1';

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findAllByWalletId.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });

    it('should return all TRANSFER_OUT transactions for a user', async () => {
      const userId = '1';

      const mockTransactions: Transaction[] = [
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

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findAllByWalletId.mockResolvedValue(mockTransactions);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findAllByWalletId).toHaveBeenCalledWith(
        mockSender.wallet.id,
      );
    });
    it('should return all TRANSFER_IN transactions for a user', async () => {
      const userId = '1';

      const mockTransactions: Transaction[] = [
        {
          id: 'transaction2',
          amount: 50,
          type: TransactionType.TRANSFER_IN,
          walletId: 'wallet1',
          relatedUserId: '3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findAllByWalletId.mockResolvedValue(mockTransactions);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findAllByWalletId).toHaveBeenCalledWith(
        mockSender.wallet.id,
      );
    });
    it('should return all WITHDRAWAL transactions for a user', async () => {
      const userId = '1';

      const mockTransactions: Transaction[] = [
        {
          id: 'transaction1',
          amount: 100,
          type: TransactionType.WITHDRAWAL,
          walletId: 'wallet1',
          relatedUserId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findAllByWalletId.mockResolvedValue(mockTransactions);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findAllByWalletId).toHaveBeenCalledWith(
        mockSender.wallet.id,
      );
    });
    it('should return all DEPOSIT transactions for a user', async () => {
      const userId = '1';

      const mockTransactions: Transaction[] = [
        {
          id: 'transaction1',
          amount: 100,
          type: TransactionType.DEPOSIT,
          walletId: 'wallet1',
          relatedUserId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findAllByWalletId.mockResolvedValue(mockTransactions);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findAllByWalletId).toHaveBeenCalledWith(
        mockSender.wallet.id,
      );
    });

    it('should return all transaction types for a user', async () => {
      const userId = '1';

      const mockTransactions: Transaction[] = [
        {
          id: 'transaction1',
          amount: 100,
          type: TransactionType.TRANSFER_OUT,
          walletId: 'wallet1',
          relatedUserId: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction2',
          amount: 75,
          type: TransactionType.TRANSFER_IN,
          walletId: 'wallet1',
          relatedUserId: '3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction2',
          amount: 75,
          type: TransactionType.WITHDRAWAL,
          walletId: 'wallet1',
          relatedUserId: '3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction2',
          amount: 75,
          type: TransactionType.DEPOSIT,
          walletId: 'wallet1',
          relatedUserId: '3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findUserWithWallet.mockResolvedValue(mockSender);
      mockRepository.findAllByWalletId.mockResolvedValue(mockTransactions);

      const result = await service.findAll(userId);

      expect(result).toHaveLength(4);
      expect(result.map((tx) => tx.type)).toEqual([
        TransactionType.TRANSFER_OUT,
        TransactionType.TRANSFER_IN,
        TransactionType.WITHDRAWAL,
        TransactionType.DEPOSIT,
      ]);
    });
    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      mockRepository.findUserWithWallet.mockRejectedValue(
        new NotFoundException('Wallet not found for this user'),
      );

      await expect(service.findAll(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should have a findOne method', () => {
      expect(typeof service.findOne).toBe('function');
    });
    it('should return a specific transaction', async () => {
      const userId = '1';
      const transactionId = 'transaction1';
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

      const mockTransaction: Transaction = {
        id: transactionId,
        amount: 100,
        type: TransactionType.TRANSFER_OUT,
        walletId: 'wallet1',
        relatedUserId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findUserWithWallet.mockResolvedValue(mockUser);
      mockRepository.findOneByWalletId.mockResolvedValue(mockTransaction);

      const result = await service.findOne(transactionId, userId);

      expect(result).toEqual(mockTransaction);
      expect(mockRepository.findOneByWalletId).toHaveBeenCalledWith(
        transactionId,
        mockUser.wallet.id,
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = '1';
      const transactionId = 'transaction1';
      mockRepository.findUserWithWallet.mockRejectedValue(
        new NotFoundException('Wallet not found for this user'),
      );

      await expect(service.findOne(transactionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const userId = '1';
      const transactionId = 'nonexistent';
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

      mockRepository.findUserWithWallet.mockResolvedValue(mockUser);
      mockRepository.findOneByWalletId.mockResolvedValue(null);

      await expect(service.findOne(transactionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

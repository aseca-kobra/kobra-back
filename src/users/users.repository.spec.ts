import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User, Wallet } from '@prisma/client';

type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  wallet: {
    create: jest.Mock;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(prisma: MockPrismaService) => Promise<unknown>]
  >;
};

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let _prismaService: PrismaService;

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wallet: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const email = 'test@example.com';
      const expectedUser: User = {
        id: '1',
        email,
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(expectedUser);

      const result = await repository.findByEmail(email);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email, isActive: true },
        select: {
          id: true,
          email: true,
          password: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
          wallet: {
            select: {
              id: true,
              balance: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user and wallet', async () => {
      const email = 'test@example.com';
      const hashedPassword = 'hashed_password';
      const expectedUser: User = {
        id: '1',
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const expectedWallet: Wallet = {
        id: '1',
        balance: 0,
        userId: expectedUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);
      mockPrismaService.wallet.create.mockResolvedValue(expectedWallet);

      const result = await repository.create(email, hashedPassword);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          password: hashedPassword,
        },
      });
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: {
          balance: 0,
          userId: expectedUser.id,
        },
      });
    });

    it('should handle transaction errors', async () => {
      const email = 'test@example.com';
      const hashedPassword = 'hashed_password';
      const error = new Error('Transaction failed');

      mockPrismaService.user.create.mockRejectedValue(error);

      await expect(repository.create(email, hashedPassword)).rejects.toThrow(
        'Transaction failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const expectedUsers: User[] = [
        {
          id: '1',
          email: 'test@example.com',
          password: 'hashed_password',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(expectedUsers);

      const result = await repository.findAll();

      expect(result).toEqual(expectedUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const userId = '1';
      const expectedUser: User = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(expectedUser);

      const result = await repository.findOne(userId);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: userId, isActive: true },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return null if user not found', async () => {
      const userId = '999';
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findOne(userId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = '1';
      const updateData: Prisma.UserUpdateInput = {
        email: 'updated@example.com',
      };
      const expectedUser: User = {
        id: userId,
        email: 'updated@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const result = await repository.update(userId, updateData);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should handle update errors', async () => {
      const userId = '1';
      const updateData: Prisma.UserUpdateInput = {
        email: 'existing@example.com',
      };
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        },
      );

      mockPrismaService.user.update.mockRejectedValue(error);

      await expect(repository.update(userId, updateData)).rejects.toThrow(
        error,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a user and their wallet in a transaction', async () => {
      const userId = '1';
      const expectedUser: User = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false, // after soft delete
      };

      // Mock tx object with user.update and wallet.update
      const txMock = {
        user: {
          update: jest.fn().mockResolvedValue(expectedUser),
        },
        wallet: {
          update: jest.fn().mockResolvedValue({
            id: 'wallet1',
            balance: 0,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: false,
          }),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(txMock as any);
      });

      const result = await repository.delete(userId);

      expect(result).toEqual(expectedUser);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: false },
      });
      expect(txMock.wallet.update).toHaveBeenCalledWith({
        where: { userId },
        data: { isActive: false },
      });
    });

    it('should handle transaction errors', async () => {
      const userId = '999';
      const error = new Error('Transaction failed');

      mockPrismaService.$transaction.mockRejectedValue(error);

      await expect(repository.delete(userId)).rejects.toThrow(
        'Transaction failed',
      );
    });
  });
});

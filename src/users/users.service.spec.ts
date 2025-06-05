import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Mock the bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation(() => 'hashed_password'),
  compare: jest
    .fn()
    .mockImplementation((pass, _hash) => pass === 'correct_password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let _repository: UsersRepository;

  const mockRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    _repository = module.get<UsersRepository>(UsersRepository);
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

    it('should create a new user with the correct email and password ', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepository.create.mockResolvedValue(expectedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(mockRepository.create).toHaveBeenCalledWith(
        'test@example.com',
        'hashed_password',
      );
    });
    it('should have a hashed password', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(expectedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockRepository.create).toHaveBeenCalledWith(
        'test@example.com',
        'hashed_password',
      );
    });
    it('should not expose the original password', async () => {
      const createUserDto = {
        email: 'secure@example.com',
        password: 'mySecret123',
      };

      const expectedUser = {
        id: '1',
        email: 'secure@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(expectedUser);

      const result = await service.create(createUserDto);

      expect(result.password).not.toEqual(createUserDto.password);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
      };

      const error = new ConflictException();

      mockRepository.create.mockRejectedValue(error);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
    it('should call repository.create with correct arguments', async () => {
      const createUserDto = {
        email: 'input@example.com',
        password: 'test123',
      };

      mockRepository.create.mockResolvedValue({
        id: '1',
        email: createUserDto.email,
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(createUserDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        createUserDto.email,
        'hashed_password',
      );
    });
  });

  describe('findAll', () => {
    it('should have a findAll method', () => {
      expect(typeof service.findAll).toBe('function');
    });

    it('should return empty array when no users exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });
    it('should return a single user when one exists', async () => {
      const singleUser = [
        {
          id: '1',
          email: 'single@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAll.mockResolvedValue(singleUser);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('single@example.com');
      expect(result).toEqual(singleUser);
    });

    it('should return an array of users', async () => {
      const expectedUsers = [
        {
          id: '1',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAll.mockResolvedValue(expectedUsers);

      const result = await service.findAll();

      expect(result).toEqual(expectedUsers);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should have a findOne method', () => {
      expect(typeof service.findOne).toBe('function');
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = '999';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
    it('should return a user by id', async () => {
      const userId = '1';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(expectedUser);

      const result = await service.findOne(userId);

      expect(result).toEqual(expectedUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('findByEmail', () => {
    it('should have a findByEmail method', () => {
      expect(typeof service.findByEmail).toBe('function');
    });

    it('should return null if user not found by email', async () => {
      const email = 'nonexistent@example.com';
      mockRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
    it('should return a user by email', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: '1',
        email,
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByEmail.mockResolvedValue(expectedUser);

      const result = await service.findByEmail(email);

      expect(result).toEqual(expectedUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('update', () => {
    it('should have an update method', () => {
      expect(typeof service.update).toBe('function');
    });
    it('should update a user', async () => {
      const userId = '1';
      const updateUserDto = {
        email: 'updated@example.com',
      };

      const expectedUser = {
        id: userId,
        email: 'updated@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue({ id: userId });
      mockRepository.update.mockResolvedValue(expectedUser);

      const result = await service.update(userId, updateUserDto);

      expect(result).toEqual(expectedUser);
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        email: 'updated@example.com',
      });
    });
    it('should throw ConflictException if email already exists', async () => {
      const userId = '1';
      const updateUserDto = {
        email: 'existing@example.com',
      };

      const error = new ConflictException();

      mockRepository.findOne.mockResolvedValue({ id: userId });
      mockRepository.update.mockRejectedValue(error);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should have a remove method', () => {
      expect(typeof service.remove).toBe('function');
    });
    it('should remove a user', async () => {
      const userId = '1';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(expectedUser);
      mockRepository.delete.mockResolvedValue(expectedUser);

      const result = await service.remove(userId);

      expect(result).toEqual(expectedUser);
      expect(mockRepository.delete).toHaveBeenCalledWith(userId);
    });
    it('should not call delete if findOne throws an error', async () => {
      const userId = '3';

      mockRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.remove(userId)).rejects.toThrow('DB error');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});

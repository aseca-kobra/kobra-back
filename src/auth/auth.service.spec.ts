import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

interface TestCreateUserDto {
  email: string | null | undefined;
  password: string | null | undefined;
}

describe('AuthService', () => {
  let service: AuthService;
  let _usersService: UsersService;
  let _jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _usersService = module.get<UsersService>(UsersService);
    _jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    describe('successful validation', () => {
      it('should return user object without password when credentials are valid', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await service.validateUser(email, password);

        expect(result).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        });
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
        expect(bcrypt.compare).toHaveBeenCalledWith(
          password,
          mockUser.password,
        );
      });

      it('should return user with wallet when present', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';
        const userWithWallet = {
          ...mockUser,
          wallet: {
            id: 'wallet-123',
            balance: 1000,
            userId: 'user-123',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
        };

        mockUsersService.findByEmail.mockResolvedValue(userWithWallet);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await service.validateUser(email, password);

        expect(result).toEqual({
          id: userWithWallet.id,
          email: userWithWallet.email,
          createdAt: userWithWallet.createdAt,
          updatedAt: userWithWallet.updatedAt,
          wallet: userWithWallet.wallet,
        });
      });

      it('should handle email with different cases', async () => {
        const email = 'Test@Example.Com';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await service.validateUser(email, password);

        expect(result).toBeDefined();
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      });
    });

    describe('failed validation scenarios', () => {
      it('should return null when user is not found', async () => {
        const email = 'nonexistent@example.com';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(null);

        const result = await service.validateUser(email, password);

        expect(result).toBeNull();
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
        expect(bcrypt.compare).not.toHaveBeenCalled();
      });

      it('should return null when password is incorrect', async () => {
        const email = 'test@example.com';
        const password = 'WrongPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await service.validateUser(email, password);

        expect(result).toBeNull();
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
        expect(bcrypt.compare).toHaveBeenCalledWith(
          password,
          mockUser.password,
        );
      });

      it('should return null when user exists but password is undefined', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';
        const userWithoutPassword = { ...mockUser, password: undefined };

        mockUsersService.findByEmail.mockResolvedValue(userWithoutPassword);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await service.validateUser(email, password);

        expect(result).toBeNull();
      });
    });

    describe('edge cases for credentials', () => {
      it('should handle empty email', async () => {
        const email = '';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(null);

        const result = await service.validateUser(email, password);

        expect(result).toBeNull();
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith('');
      });

      it('should handle empty password', async () => {
        const email = 'test@example.com';
        const password = '';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await service.validateUser(email, password);

        expect(result).toBeNull();
        expect(bcrypt.compare).toHaveBeenCalledWith('', mockUser.password);
      });

      it('should handle very long email', async () => {
        const email = 'a'.repeat(100) + '@example.com';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(null);

        const result = await service.validateUser(email, password);

        expect(result).toBeNull();
        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      });
    });
  });

  describe('login', () => {
    describe('successful login', () => {
      it('should return access token and user data when credentials are valid', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';
        const token = 'jwt_token_12345';
        const userWithoutPassword = {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        };

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.sign.mockReturnValue(token);

        const result = await service.login(email, password);

        expect(result).toEqual({
          access_token: token,
          user: {
            ...userWithoutPassword,
            wallet: undefined,
          },
        });
        expect(mockJwtService.sign).toHaveBeenCalledWith({
          email: userWithoutPassword.email,
          sub: userWithoutPassword.id,
        });
      });

      it('should return user with wallet when present', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';
        const token = 'jwt_token_12345';
        const userWithWallet = {
          ...mockUser,
          wallet: {
            id: 'wallet-123',
            balance: 1000,
            userId: 'user-123',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
        };

        mockUsersService.findByEmail.mockResolvedValue(userWithWallet);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.sign.mockReturnValue(token);

        const result = await service.login(email, password);

        expect(result.user.wallet).toEqual(userWithWallet.wallet);
        expect(result.access_token).toBe(token);
      });

      it('should call JWT service with correct payload', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';
        const token = 'jwt_token_12345';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.sign.mockReturnValue(token);

        await service.login(email, password);

        expect(mockJwtService.sign).toHaveBeenCalledWith({
          email: mockUser.email,
          sub: mockUser.id,
        });
        expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
      });
    });

    describe('failed login scenarios', () => {
      it('should throw UnauthorizedException when user not found', async () => {
        const email = 'nonexistent@example.com';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(null);

        await expect(service.login(email, password)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.login(email, password)).rejects.toThrow(
          'Invalid credentials',
        );
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when password is incorrect', async () => {
        const email = 'test@example.com';
        const password = 'WrongPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.login(email, password)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.login(email, password)).rejects.toThrow(
          'Invalid credentials',
        );
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when validateUser returns null', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(null);

        await expect(service.login(email, password)).rejects.toThrow(
          UnauthorizedException,
        );
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });
    });

    describe('method call order verification', () => {
      it('should validate user before generating JWT token', async () => {
        const email = 'test@example.com';
        const password = 'ValidPassword123!';
        const token = 'jwt_token_12345';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.sign.mockReturnValue(token);

        await service.login(email, password);

        const findUserCall =
          mockUsersService.findByEmail.mock.invocationCallOrder[0];
        const jwtSignCall = mockJwtService.sign.mock.invocationCallOrder[0];

        expect(findUserCall).toBeLessThan(jwtSignCall);
      });

      it('should not call JWT service when validation fails', async () => {
        const email = 'test@example.com';
        const password = 'WrongPassword123!';

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.login(email, password)).rejects.toThrow();
        expect(mockUsersService.findByEmail).toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      });
    });
  });

  describe('signup', () => {
    describe('successful signup', () => {
      it('should create user with valid email and password', async () => {
        const createUserDto = {
          email: 'new@example.com',
          password: 'ValidPassword123!',
        };
        const createdUser = {
          ...mockUser,
          email: createUserDto.email,
        };

        mockUsersService.create.mockResolvedValue(createdUser);

        const result = await service.signup(createUserDto);

        expect(result).toEqual({
          id: createdUser.id,
          email: createdUser.email,
          createdAt: createdUser.createdAt,
          updatedAt: createdUser.updatedAt,
        });
        expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      });

      it('should create user with minimum valid password', async () => {
        const createUserDto = {
          email: 'new@example.com',
          password: 'Valid123!',
        };
        const createdUser = { ...mockUser, email: createUserDto.email };

        mockUsersService.create.mockResolvedValue(createdUser);

        const result = await service.signup(createUserDto);

        expect(result).toBeDefined();
        expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      });

      it('should handle special characters in email', async () => {
        const createUserDto = {
          email: 'test+tag@sub.example.com',
          password: 'ValidPassword123!',
        };
        const createdUser = { ...mockUser, email: createUserDto.email };

        mockUsersService.create.mockResolvedValue(createdUser);

        const result = await service.signup(createUserDto);

        expect(result).toBeDefined();
        expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      });
    });

    describe('email validation failures', () => {
      it('should throw BadRequestException when email is missing', async () => {
        const createUserDto = {
          email: '',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Email is required',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email is null', async () => {
        const createUserDto: TestCreateUserDto = {
          email: null,
          password: 'ValidPassword123!',
        };

        await expect(
          service.signup(createUserDto as CreateUserDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.signup(createUserDto as CreateUserDto),
        ).rejects.toThrow('Email is required');
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email is undefined', async () => {
        const createUserDto: TestCreateUserDto = {
          email: undefined,
          password: 'ValidPassword123!',
        };

        await expect(
          service.signup(createUserDto as CreateUserDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.signup(createUserDto as CreateUserDto),
        ).rejects.toThrow('Email is required');
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email format is invalid', async () => {
        const createUserDto = {
          email: 'invalid-email',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Invalid email format',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email is missing @ symbol', async () => {
        const createUserDto = {
          email: 'testexample.com',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Invalid email format',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email is missing domain', async () => {
        const createUserDto = {
          email: 'test@',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Invalid email format',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email is too long', async () => {
        const createUserDto = {
          email: 'a'.repeat(250) + '@example.com',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Email is too long',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when email has spaces', async () => {
        const createUserDto = {
          email: 'test @example.com',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Invalid email format',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });
    });

    describe('password validation failures', () => {
      it('should throw BadRequestException when password is missing', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: '',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Password is required',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password is null', async () => {
        const createUserDto: TestCreateUserDto = {
          email: 'test@example.com',
          password: null,
        };

        await expect(
          service.signup(createUserDto as CreateUserDto),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.signup(createUserDto as CreateUserDto),
        ).rejects.toThrow('Password is required');
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password is too short', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'Short1!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Password must be at least 8 characters long',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password is too long', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'A'.repeat(130) + '1!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Password is too long',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password lacks uppercase letter', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'validpassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Password must contain at least one uppercase letter',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password lacks number', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'ValidPassword!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Password must contain at least one number',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password lacks special character', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'ValidPassword123',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.signup(createUserDto)).rejects.toThrow(
          'Password must contain at least one special character',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should accept various special characters', async () => {
        const specialChars = ['!', '@', '#', '$', '%'];

        for (const char of specialChars.slice(0, 5)) {
          // Test some so test is reasonable
          const createUserDto = {
            email: 'test@example.com',
            password: `ValidPassword123${char}`,
          };
          const createdUser = { ...mockUser, email: createUserDto.email };

          mockUsersService.create.mockResolvedValue(createdUser);

          const result = await service.signup(createUserDto);

          expect(result).toBeDefined();
          jest.clearAllMocks();
        }
      });
    });

    describe('method call order verification', () => {
      it('should validate email and password before creating user', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        };
        const createdUser = { ...mockUser, email: createUserDto.email };

        mockUsersService.create.mockResolvedValue(createdUser);

        await service.signup(createUserDto);

        expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      });

      it('should not call UsersService.create when email validation fails', async () => {
        const createUserDto = {
          email: 'invalid-email',
          password: 'ValidPassword123!',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow();
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should not call UsersService.create when password validation fails', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'weak',
        };

        await expect(service.signup(createUserDto)).rejects.toThrow();
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should return user without password after successful creation', async () => {
        const createUserDto = {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        };
        const createdUser = { ...mockUser, email: createUserDto.email };

        mockUsersService.create.mockResolvedValue(createdUser);

        const result = await service.signup(createUserDto);

        expect(result).not.toHaveProperty('password');
        expect(result.email).toBe(createUserDto.email);
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        password: 'password123',
      };
      const expectedUser = {
        id: '1',
        email: createUserDto.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.signup.mockResolvedValue(expectedUser);

      const result = await controller.signup(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(mockAuthService.signup).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle validation errors from the service', async () => {
      const createUserDto: CreateUserDto = {
        email: 'invalid-email',
        password: 'short',
      };

      mockAuthService.signup.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.signup(createUserDto)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'correct_password',
      };
      const expectedResponse = {
        access_token: 'jwt_token',
        user: {
          id: '1',
          email: loginDto.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle validation errors from the service', async () => {
      const loginDto: LoginDto = {
        email: 'invalid-email',
        password: 'short',
      };

      mockAuthService.login.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Validation failed',
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('ExternalApiService', () => {
  let service: ExternalApiService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAxiosResponse = (data: any): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalApiService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ExternalApiService>(ExternalApiService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestDebin', () => {
    describe('configuration validation', () => {
      it('should throw NotFoundException when EXTERNAL_API_URL is not configured', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue(undefined);

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException
        );
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'External API URL not configured'
        );
        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when EXTERNAL_API_URL is null', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue(null);

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException
        );
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when EXTERNAL_API_URL is empty string', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue('');

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException
        );
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should proceed when EXTERNAL_API_URL is properly configured', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com';
        const responseData = { success: true };
        
        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
      });
    });

    describe('successful HTTP requests', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should make POST request to correct endpoint with valid data', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        expect(mockHttpService.post).toHaveBeenCalledTimes(1);
      });

      it('should handle successful response with success true', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual({ success: true });
      });

      it('should handle successful response with success false and message', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { 
          success: false, 
          message: 'Insufficient funds' 
        };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual({ 
          success: false, 
          message: 'Insufficient funds' 
        });
      });

      it('should handle response with additional fields', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { 
          success: true,
          transactionId: 'txn-123',
          timestamp: '2024-01-01T00:00:00Z'
        };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
      });
    });

    describe('edge cases for input parameters', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should handle email with special characters', async () => {
        // Arrange
        const email = 'test+tag@sub.example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          expect.any(Object)
        );
      });

      it('should handle very long email', async () => {
        // Arrange
        const email = 'a'.repeat(100) + '@example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          expect.any(Object)
        );
      });

      it('should handle empty email string', async () => {
        // Arrange
        const email = '';
        const amount = 100;
        const responseData = { success: false, message: 'Invalid email' };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email: '', amount },
          expect.any(Object)
        );
      });

      it('should handle minimum positive amount', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 0.01;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 0.01 },
          expect.any(Object)
        );
      });

      it('should handle large amount', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 1000000;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 1000000 },
          expect.any(Object)
        );
      });

      it('should handle decimal amounts', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 123.45;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 123.45 },
          expect.any(Object)
        );
      });

      it('should handle zero amount', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 0;
        const responseData = { success: false, message: 'Amount must be positive' };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 0 },
          expect.any(Object)
        );
      });

      it('should handle negative amount', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = -100;
        const responseData = { success: false, message: 'Amount must be positive' };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: -100 },
          expect.any(Object)
        );
      });
    });

    describe('different API URL formats', () => {
      it('should handle API URL without trailing slash', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com';
        const responseData = { success: true };
        
        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          expect.any(Object)
        );
      });

      it('should handle API URL with trailing slash', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com/';
        const responseData = { success: true };
        
        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `https://api.example.com//debin`,
          { email, amount },
          expect.any(Object)
        );
      });

      it('should handle API URL with path', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com/v1/payments';
        const responseData = { success: true };
        
        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          expect.any(Object)
        );
      });

      it('should handle localhost URL', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'http://localhost:3001';
        const responseData = { success: true };
        
        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          expect.any(Object)
        );
      });
    });

    describe('HTTP request errors', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should propagate network timeout error', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const networkError = new Error('Network timeout');
        
        mockHttpService.post.mockReturnValue(throwError(() => networkError));

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow('Network timeout');
      });

      it('should propagate connection refused error', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const connectionError = new Error('ECONNREFUSED');
        
        mockHttpService.post.mockReturnValue(throwError(() => connectionError));

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow('ECONNREFUSED');
      });

      it('should propagate DNS resolution error', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const dnsError = new Error('ENOTFOUND');
        
        mockHttpService.post.mockReturnValue(throwError(() => dnsError));

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow('ENOTFOUND');
      });
    });

    describe('request headers validation', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should always include Content-Type header', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        await service.requestDebin(email, amount);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      });

      it('should include exactly the required headers', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        await service.requestDebin(email, amount);

        // Assert
        const [, , config] = mockHttpService.post.mock.calls[0];
        expect(Object.keys(config.headers)).toEqual(['Content-Type']);
        expect(config.headers['Content-Type']).toBe('application/json');
      });
    });

    describe('request body validation', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should include email and amount in request body', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        await service.requestDebin(email, amount);

        // Assert
        const [, requestBody] = mockHttpService.post.mock.calls[0];
        expect(requestBody).toEqual({ email, amount });
        expect(Object.keys(requestBody)).toEqual(['email', 'amount']);
      });

      it('should preserve exact email format in request body', async () => {
        // Arrange
        const email = 'Test.User+Tag@Sub.Example.COM';
        const amount = 100;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        await service.requestDebin(email, amount);

        // Assert
        const [, requestBody] = mockHttpService.post.mock.calls[0];
        expect(requestBody.email).toBe('Test.User+Tag@Sub.Example.COM');
      });

      it('should preserve exact amount precision in request body', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 123.456789;
        const responseData = { success: true };
        
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        await service.requestDebin(email, amount);

        // Assert
        const [, requestBody] = mockHttpService.post.mock.calls[0];
        expect(requestBody.amount).toBe(123.456789);
      });
    });

    describe('configuration service edge cases', () => {
      it('should call ConfigService.get exactly once per request', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com';
        const responseData = { success: true };
        
        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        await service.requestDebin(email, amount);

        // Assert
        expect(mockConfigService.get).toHaveBeenCalledTimes(1);
        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
      });

      it('should check configuration before making HTTP request', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue(undefined);

        // Act & Assert
        await expect(service.requestDebin(email, amount)).rejects.toThrow();
        
        // Verify that HTTP request was never made
        expect(mockHttpService.post).not.toHaveBeenCalled();
        
        // But config was checked
        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
      });

      it('should handle whitespace-only API URL as valid (current implementation behavior)', async () => {
        // Arrange
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };
        mockConfigService.get.mockReturnValue('   ');
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData))
        );

        // Act
        const result = await service.requestDebin(email, amount);

        // Assert - Current implementation only checks truthy, not actual validity
        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          '   /debin',
          { email, amount },
          expect.any(Object)
        );
      });
    });
  });
}); 
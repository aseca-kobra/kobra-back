import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ExternalApiService } from './external-api.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('ExternalApiService', () => {
  let service: ExternalApiService;
  let _httpService: HttpService;
  let _configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAxiosResponse = <T = unknown>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse<T>['config'],
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
    _httpService = module.get<HttpService>(HttpService);
    _configService = module.get<ConfigService>(ConfigService);
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
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue(undefined);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          'External API URL not configured',
        );
        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when EXTERNAL_API_URL is null', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue(null);

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException when EXTERNAL_API_URL is empty string', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue('');

        await expect(service.requestDebin(email, amount)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockHttpService.post).not.toHaveBeenCalled();
      });

      it('should proceed when EXTERNAL_API_URL is properly configured', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com';
        const responseData = { success: true };

        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

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
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
        expect(mockHttpService.post).toHaveBeenCalledTimes(1);
      });

      it('should handle successful response with success true', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual({ success: true });
      });

      it('should handle successful response with success false and message', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const responseData = {
          success: false,
          message: 'Insufficient funds',
        };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual({
          success: false,
          message: 'Insufficient funds',
        });
      });
    });

    describe('edge cases for input parameters', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should handle very long email', async () => {
        const email = 'a'.repeat(100) + '@example.com';
        const amount = 100;
        const responseData = { success: true };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount },
          expect.any(Object),
        );
      });

      it('should handle empty email string', async () => {
        const email = '';
        const amount = 100;
        const responseData = { success: false, message: 'Invalid email' };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email: '', amount },
          expect.any(Object),
        );
      });

      it('should handle minimum positive amount', async () => {
        const email = 'test@example.com';
        const amount = 0.01;
        const responseData = { success: true };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 0.01 },
          expect.any(Object),
        );
      });

      it('should handle large amount', async () => {
        const email = 'test@example.com';
        const amount = 1000000;
        const responseData = { success: true };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 1000000 },
          expect.any(Object),
        );
      });

      it('should handle zero amount', async () => {
        const email = 'test@example.com';
        const amount = 0;
        const responseData = {
          success: false,
          message: 'Amount must be positive',
        };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: 0 },
          expect.any(Object),
        );
      });

      it('should handle negative amount', async () => {
        const email = 'test@example.com';
        const amount = -100;
        const responseData = {
          success: false,
          message: 'Amount must be positive',
        };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        const result = await service.requestDebin(email, amount);

        expect(result).toEqual(responseData);
        expect(mockHttpService.post).toHaveBeenCalledWith(
          `${apiUrl}/debin`,
          { email, amount: -100 },
          expect.any(Object),
        );
      });
    });

    describe('request body validation', () => {
      const apiUrl = 'https://api.example.com';

      beforeEach(() => {
        mockConfigService.get.mockReturnValue(apiUrl);
      });

      it('should include email and amount in request body', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const responseData = { success: true };

        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        await service.requestDebin(email, amount);

        const call = mockHttpService.post.mock.calls[0] as [
          string,
          { email: string; amount: number },
          object,
        ];
        const [, requestBody] = call;
        expect(requestBody).toEqual({ email, amount });
        expect(Object.keys(requestBody)).toEqual(['email', 'amount']);
      });
    });

    describe('configuration service edge cases', () => {
      it('should call ConfigService.get exactly once per request', async () => {
        const email = 'test@example.com';
        const amount = 100;
        const apiUrl = 'https://api.example.com';
        const responseData = { success: true };

        mockConfigService.get.mockReturnValue(apiUrl);
        mockHttpService.post.mockReturnValue(
          of(mockAxiosResponse(responseData)),
        );

        await service.requestDebin(email, amount);

        expect(mockConfigService.get).toHaveBeenCalledTimes(1);
        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
      });

      it('should check configuration before making HTTP request', async () => {
        const email = 'test@example.com';
        const amount = 100;
        mockConfigService.get.mockReturnValue(undefined);

        await expect(service.requestDebin(email, amount)).rejects.toThrow();

        expect(mockHttpService.post).not.toHaveBeenCalled();

        expect(mockConfigService.get).toHaveBeenCalledWith('EXTERNAL_API_URL');
      });
    });
  });
});

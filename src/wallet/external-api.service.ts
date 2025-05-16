import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface ExternalApiResponse {
  success: boolean;
  message?: string;
}

@Injectable()
export class ExternalApiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async requestDebin(amount: number): Promise<ExternalApiResponse> {
    const externalApiUrl = this.configService.get<string>('EXTERNAL_API_URL');
    if (!externalApiUrl) {
      throw new NotFoundException('External API URL not configured');
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${externalApiUrl}/debin`,
        { amount },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return response.data as ExternalApiResponse;
  }
}

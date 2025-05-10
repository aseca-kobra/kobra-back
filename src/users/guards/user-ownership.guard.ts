import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class UserOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.params.id;
    const userFromToken = request.user as { userId: string };

    if (userId !== userFromToken.userId) {
      throw new ForbiddenException('You can only modify your own data');
    }

    return true;
  }
}

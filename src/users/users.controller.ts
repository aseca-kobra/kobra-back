import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserOwnershipGuard } from './guards/user-ownership.guard';
import { User } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<Partial<User>[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Partial<User>> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserOwnershipGuard)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Partial<User>> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(UserOwnershipGuard)
  remove(@Param('id') id: string): Promise<User> {
    return this.usersService.remove(id);
  }
}

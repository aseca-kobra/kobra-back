import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return await this.usersRepository.create(
      createUserDto.email,
      hashedPassword,
    );
  }

  findAll(): Promise<Partial<User>[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Partial<User>> {
    await this.findOne(id);

    if (updateUserDto.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    const data: Prisma.UserUpdateInput = {
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(updateUserDto.password && {
        password: await bcrypt.hash(updateUserDto.password, 10),
      }),
    };

    return this.usersRepository.update(id, data);
  }

  async remove(id: string): Promise<User> {
    await this.findOne(id);
    return this.usersRepository.delete(id);
  }
}

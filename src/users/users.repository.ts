import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(email: string, hashedPassword: string): Promise<User> {
    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      });

      await prisma.wallet.create({
        data: {
          balance: 0,
          userId: user.id,
        },
      });

      return user;
    });
  }

  findAll(): Promise<Partial<User>[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string): Promise<Partial<User> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<Partial<User>> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, password: string, roles: { name: string }[]) {
    const hash = await argon2.hash(password);
    return this.prisma.user.create({
      data: { email, password: hash, roles: { create: roles } },
      include: { roles: true },
    });
  }

  async validatePassword(hash: string, plain: string) {
    return argon2.verify(hash, plain);
  }
}

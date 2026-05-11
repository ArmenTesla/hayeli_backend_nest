import { Injectable } from '@nestjs/common';

// Это временная имитация базы данных (потом заменим на TypeORM/Prisma)
export type User = any;

@Injectable()
export class UsersService {
  private readonly users = [
    {
      userId: 1,
      username: 'amitesla',
      email: 'test@mail.ru',
      password: 'password123', // В реале тут будет хэш!
    },
  ];

  async findOneByEmailOrUsername(loginValue: string): Promise<User | undefined> {
    return this.users.find(user => 
      user.username === loginValue || user.email === loginValue
    );
  }
}
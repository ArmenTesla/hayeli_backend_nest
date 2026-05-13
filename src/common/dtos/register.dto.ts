import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'amitesla', description: 'Уникальное имя пользователя' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'test@mail.ru', description: 'Электронная почта' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Пароль (минимум 6 символов)' })
  @IsNotEmpty()
  @MinLength(6, { message: 'Пароль слишком короткий' })
  password: string;
}
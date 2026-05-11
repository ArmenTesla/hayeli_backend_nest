import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: 'amitesla или test@mail.ru', 
    description: 'Логин пользователя или его Email адрес' 
  })
  @IsNotEmpty({ message: 'Поле логина не может быть пустым' })
  @IsString()
  // ПЕРЕИМЕНОВЫВАЕМ ЗДЕСЬ:
  loginValue: string; 

  @ApiProperty({ 
    example: 'password123', 
    description: 'Пароль пользователя' 
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  @IsString()
  password: string;
}
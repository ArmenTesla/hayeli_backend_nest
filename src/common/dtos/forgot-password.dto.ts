import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'test@mail.ru' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
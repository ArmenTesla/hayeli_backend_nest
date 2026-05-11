import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '123456', description: 'Код из письма' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
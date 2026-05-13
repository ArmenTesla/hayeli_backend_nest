import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../../common/dtos/login.dto';
import { RegisterDto } from '../../common/dtos/register.dto';
import { ForgotPasswordDto } from '../../common/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../../common/dtos/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.signUp(registerDto);
  }

  @Post('jwt/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Логин по email/паролю' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // --- GOOGLE AUTH ДЛЯ FLUTTER ---
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход через Google (для мобильных устройств)' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        token: { type: 'string', description: 'idToken полученный из Flutter' } 
      } 
    } 
  })
  async googleAuth(@Body('token') token: string) {
    // Мы просто передаем строку-токен в сервис, который я тебе дал выше
    return this.authService.googleLogin(token);
  }

  // --- RESET PASSWORD ---
  @Post('forgot-password')
  @ApiOperation({ summary: 'Шаг 1: Отправка кода на email' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Шаг 2: Проверка кода' })
  async verifyCode(@Body() body: { email: string; token: string }) {
    return this.authService.verifyResetCode(body.email, body.token);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Шаг 3: Установка нового пароля' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { OAuth2Client } from 'google-auth-library';

import { UserEntity } from '../../common/entities/users.entity';
import { PlayerStatsEntity } from '../../common/entities/player-stats.entity';
import { LoginDto } from '../../common/dtos/login.dto';
import { RegisterDto } from '../../common/dtos/register.dto';
import { ResetPasswordDto } from '../../common/dtos/reset-password.dto';
import { ForgotPasswordDto } from '../../common/dtos/forgot-password.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PlayerStatsEntity)
    private readonly statsRepository: Repository<PlayerStatsEntity>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // --- ВНУТРЕННИЙ МЕТОД: ГЕНЕРАЦИЯ ТОКЕНОВ ---
  private generateTokens(user: UserEntity) {
    const payload = { sub: user.id, username: user.username };
    return {
      access: this.jwtService.sign(payload),
      refresh: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        stats: user.stats || null, // Предотвращаем null error
      },
    };
  }

  // --- РЕГИСТРАЦИЯ (ИСПРАВЛЕНА) ---
  async signUp(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;
    const existingUser = await this.userRepository.findOne({ where: [{ username }, { email }] });
    if (existingUser) throw new ConflictException('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({ username, email, password: hashedPassword });
    const savedUser = await this.userRepository.save(user);

    // Создаем статистику
    const stats = this.statsRepository.create({ user: savedUser });
    const savedStats = await this.statsRepository.save(stats);
    savedUser.stats = savedStats;

    // Пытаемся отправить приветственное письмо (не блокируем регистрацию)
    try {
      await this.mailerService.sendMail({
        to: savedUser.email,
        subject: 'Welcome to Hayeli!',
        html: `<h3>Welcome, ${username}!</h3><p>Success registration.</p>`,
      });
    } catch (error: any) {
      console.error('Welcome email failed:', error.message);
    }

    // Возвращаем токены, чтобы Flutter мог сделать автоматический вход
    return this.generateTokens(savedUser);
  }

  // --- ВХОД (ОБЫЧНЫЙ) ---
  async login(loginDto: LoginDto) {
    const { loginValue, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: [{ username: loginValue }, { email: loginValue }],
      relations: ['stats'],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    if (!user.password) {
        throw new UnauthorizedException('Please login with Google');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  // --- GOOGLE LOGIN ---
  async googleLogin(idToken: string) {
    if (!idToken) throw new BadRequestException('No token provided');

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedException('Invalid Google token');

      const { email, sub: googleId } = payload;

      let user = await this.userRepository.findOne({ 
        where: { email }, 
        relations: ['stats'] 
      });

      if (!user) {
        const username = `${email.split('@')[0]}_${Math.floor(Math.random() * 1000)}`;
        user = this.userRepository.create({
          email,
          username,
          googleId,
          password: '', 
          isActive: true,
        });
        user = await this.userRepository.save(user);

        const stats = this.statsRepository.create({ user });
        user.stats = await this.statsRepository.save(stats);
      } else if (!user.googleId) {
        user.googleId = googleId;
        await this.userRepository.save(user);
      }

      return this.generateTokens(user);

    } catch (error) {
      console.error('Google Auth Error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  // --- ЗАБЫЛИ ПАРОЛЬ ---
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({ where: { email: forgotPasswordDto.email } });
    if (!user) return { success: true, message: 'Code sent if email exists' };

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); 
    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Reset Code | Hayeli',
        html: `<h3>Your code: ${token}</h3>`,
      });
    } catch (error: any) {
      console.error('Reset email failed:', error.message);
      throw new BadRequestException('Failed to send email. Please try later.');
    }

    return { success: true, message: 'Код отправлен' };
  }

  async verifyResetCode(email: string, token: string) {
    const user = await this.userRepository.findOne({ where: { email, resetPasswordToken: token } });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Неверный код или срок действия истек');
    }
    return { success: true, message: 'Код подтвержден' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    const user = await this.userRepository.findOne({ where: { resetPasswordToken: token } });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException('Invalid token');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);
    return { success: true, message: 'Пароль изменен' };
  }
}
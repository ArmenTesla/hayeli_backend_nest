import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule,JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from '../../common/entities/users.entity';
import { JwtStrategy ,} from './jwt.strategy';
import { MailerModule } from '@nestjs-modules/mailer';
import { GoogleStrategy } from '../strategies/google.strategy';
import { UsersService } from '../../common/services/users.service';
import { PlayerStatsEntity } from '../../common/entities/player-stats.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity,PlayerStatsEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Настраиваем JWT асинхронно, подтягивая секрет из ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET_KEY'),
        signOptions: { 
          // Приводим к any, чтобы TS не ругался на несовместимость string и StringValue
          expiresIn: configService.get<string>('JWT_EXPIRATION') as any || '3600s',
        },
      }),
    }),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 587, // Альтернативный порт
        secure: false,// true для порта 465
        auth: {
          user: 'narimanyanarmen0@gmail.com',
          pass: 'gfdn usdu xadk dzqn',
        },
        tls: {
          rejectUnauthorized: false // Помогает обойти проблемы с сертификатами на Windows
        }
      },
      defaults: {
        from: '"Hayeli Support" <narimanyanarmen0@gmail.com>',
      },
    }),

],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy,AuthService, GoogleStrategy,UsersService], // Добавляем стратегию в провайдеры
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
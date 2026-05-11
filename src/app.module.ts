import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth/auth.module'; // Путь согласно твоему скрину

@Module({
  imports: [
    // 1. Загрузка конфигов из .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `src/environments/.env.${process.env.NODE_ENV || 'development'}`,
        'src/environments/.env',
      ],
    }),

    // 2. Подключение к MySQL (XAMPP)
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT) || 3306,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true, // Самое важное: само подтянет UserEntity
      synchronize: true,     // Авто-создание таблиц
      logging: true,
      logger: 'advanced-console',
    }),

    // 3. Твой модуль авторизации
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
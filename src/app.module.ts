import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth/auth.module'; // Путь согласно твоему скрину
import { CategoriesModule } from './modules/categories/categories.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { GameModule } from './modules/game/game.module';
import { SeedModule } from './seed/seed.module';
import { UserProfileEntity } from './modules/stats/entities/user-profile.entity';
import { UserProgressEntity } from './modules/stats/entities/user-progress.entity';
import { LevelConfigEntity } from './modules/game/entities/level-config.entity';
import { UserEntity } from './common/entities/users.entity';
import { PlayerStatsEntity } from './common/entities/player-stats.entity';

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
      entities: [
        UserEntity,
        PlayerStatsEntity,
        UserProfileEntity,
        UserProgressEntity,
        LevelConfigEntity,
      ],
      autoLoadEntities: true,
      synchronize: true,
      logging: true,
      logger: 'advanced-console',
    }),

    // 3. Твой модуль авторизации
    AuthModule,
    CategoriesModule,
    QuestionsModule,
    GameModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
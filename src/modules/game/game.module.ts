import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { UserProfileEntity } from '../stats/entities/user-profile.entity';
import { UserProgressEntity } from '../stats/entities/user-progress.entity';
import { LevelConfigEntity } from './entities/level-config.entity';
import { QuestionEntity } from '../questions/entities/question.entity';
import { UserEntity } from '../../common/entities/users.entity';
import { CategoryEntity } from '../categories/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProfileEntity,
      UserProgressEntity,
      LevelConfigEntity,
      QuestionEntity,
      UserEntity,
      CategoryEntity,
    ]),
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}

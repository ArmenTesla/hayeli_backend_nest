import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { QuestionEntity } from '../modules/game/entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, QuestionEntity])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}

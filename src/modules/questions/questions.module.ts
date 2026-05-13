import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { QuestionEntity } from './entities/question.entity';
import { CategoryEntity } from '../categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionEntity, CategoryEntity])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

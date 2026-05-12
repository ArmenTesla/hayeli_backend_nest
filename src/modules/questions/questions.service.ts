import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionEntity } from './entities/question.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async create(dto: CreateQuestionDto): Promise<QuestionEntity> {
    const category = await this.categoryRepository.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException(`Category with id ${dto.categoryId} not found`);
    }

    const existingCount = await this.questionRepository.count({
      where: { mainGame: { id: category.id } },
    });

    const question = this.questionRepository.create({
      questionIndex: existingCount + 1,
      question: dto.question,
      answer1: dto.answer1,
      answer2: dto.answer2,
      answer3: dto.answer3,
      answer4: dto.answer4,
      status: dto.status ?? 'easy',
      correctAnswer: dto.correctAnswer,
      explanation: dto.explanation,
      attachment: dto.attachment,
      mainGame: category,
    });

    return this.questionRepository.save(question);
  }

  async findByCategoryName(categoryName: string): Promise<QuestionEntity[]> {
    const category = await this.categoryRepository.findOne({ where: { gameName: categoryName } });
    if (!category) {
      throw new NotFoundException(`Category ${categoryName} not found`);
    }

    return this.questionRepository.find({
      where: { mainGame: { id: category.id } },
      order: { questionIndex: 'ASC' },
    });
  }
}

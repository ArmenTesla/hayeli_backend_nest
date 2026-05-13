import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionEntity } from './entities/question.entity';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
  ) {}

  async findByCategoryAndLang(categoryName: string, lang: string, limit?: number): Promise<QuestionEntity[]> {
    const query = this.questionRepository.createQueryBuilder('question')
      .leftJoin('question.mainGame', 'category')
      .where('category.game_name = :categoryName', { categoryName })
      .andWhere('question.language = :lang', { lang })
      .andWhere('category.language = :lang', { lang });

    if (limit) {
      // ORDER BY RAND() работает для MySQL и SQLite. Если у тебя PostgreSQL, используй RANDOM()
      query.orderBy('RAND()').limit(limit);
    } else {
      query.orderBy('question.question_index', 'ASC');
    }

    const questions = await query.getMany();

    if (!questions || questions.length === 0) {
      throw new NotFoundException(`Questions for category "${categoryName}" in language "${lang}" not found`);
    }

    return questions;
  }

  async create(dto: any) {
    const newQuestion = this.questionRepository.create(dto);
    return await this.questionRepository.save(newQuestion);
  }
}
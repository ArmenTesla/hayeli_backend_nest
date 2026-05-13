import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { QuestionEntity } from '../modules/game/entities/question.entity';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type SeedQuestion = {
  question: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  status?: 'easy' | 'medium' | 'hard';
  correctAnswer: string | number;
  attachment?: string;
};

type SeedCategory = {
  gameName?: string;
  game_name?: string;
  gameImage?: string;
  game_image?: string;
  questions: SeedQuestion[];
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Проверяем, есть ли уже данные, чтобы не дублировать при каждом перезапуске
    const count = await this.categoryRepository.count();
    if (count > 0) {
      this.logger.log('Database already seeded, skipping import.');
      return;
    }

    await this.importFromJson();
  }

 private async importFromJson() {
    const filePath = join(process.cwd(), 'data.json');
    if (!existsSync(filePath)) {
      this.logger.warn(`Seed file not found at ${filePath}.`);
      return;
    }

    const raw = readFileSync(filePath, 'utf8');
    let payload: any;

    try {
      payload = JSON.parse(raw);
    } catch (error) {
      this.logger.error('Failed to parse data.json', error as Error);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Итерируемся по массиву объектов (у тебя там [{ "hay_es": {...} }])
      for (const item of payload) {
        const keys = Object.keys(item);
        const categoryKey = keys[0]; // Это будет "hay_es"
        const categoryData = item[categoryKey];

        if (!categoryData || !categoryData.category_name) {
          this.logger.warn(`Skipping invalid item: ${JSON.stringify(item).substring(0, 50)}`);
          continue;
        }

        this.logger.log(`Processing category: ${categoryData.category_name}`);

        // СОЗДАЕМ КАТЕГОРИЮ ЯВНО
        const category = new CategoryEntity();
        (category as any).game_name = categoryData.category_name;
        (category as any).game_image = 'assets/images/categories/hay_es.png';

        // Сохраняем категорию через менеджер транзакции
        const savedCategory = await queryRunner.manager.save(CategoryEntity, category);

        // СОЗДАЕМ ВОПРОСЫ
        const questionsEntities: QuestionEntity[] = [];
        
        for (let i = 0; i < categoryData.questions.length; i++) {
          const q = categoryData.questions[i];
          const correctIndex = q.answers.findIndex((a: any) => a.isCorrect === true);

          const question = new QuestionEntity();
          question.questionIndex = i + 1;
          question.question = q.question;
          question.answer1 = q.answers[0]?.text || '';
          question.answer2 = q.answers[1]?.text || '';
          question.answer3 = q.answers[2]?.text || '';
          question.answer4 = q.answers[3]?.text || '';
          question.status = 'easy';
          question.correctAnswer = (correctIndex + 1).toString();
          question.attachment = q.info || '';
          question.mainGame = savedCategory;

          questionsEntities.push(question);
        }

        // Сохраняем пачку вопросов
        await queryRunner.manager.save(QuestionEntity, questionsEntities);
        
        this.logger.log(`Successfully imported "${categoryData.category_name}"`);
      }

      await queryRunner.commitTransaction();
      this.logger.log('Seed import completed successfully!');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Seed import failed. Rolling back.', error);
    } finally {
      await queryRunner.release();
    }
  }
}
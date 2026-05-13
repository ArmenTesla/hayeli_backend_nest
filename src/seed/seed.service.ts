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
  let payload: any[];

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
    for (const item of payload) {
      // Так как у тебя ключ динамический (например, "hay_es"), берем первый ключ объекта
      const categoryKey = Object.keys(item)[0];
      const categoryData = item[categoryKey];

      if (!categoryData || !categoryData.category_name) {
        this.logger.error(`Invalid category data for key: ${categoryKey}`);
        continue;
      }

      // 1. Создаем категорию
      const category = queryRunner.manager.create(CategoryEntity, {
        game_name: categoryData.category_name,
        game_image: 'assets/images/categories/hay_es.png', // Пока хардкодим, раз в JSON нет
      } as any);

      const savedCategory = await queryRunner.manager.save(category);

      // 2. Создаем вопросы
      for (let i = 0; i < categoryData.questions.length; i++) {
        const q = categoryData.questions[i];

        // Находим правильный ответ (индекс или текст)
        const correctIndex = q.answers.findIndex(a => a.isCorrect === true);

        const question = queryRunner.manager.create(QuestionEntity, {
          questionIndex: i + 1,
          question: q.question,
          // Распределяем ответы из массива по полям базы
          answer1: q.answers[0]?.text || '',
          answer2: q.answers[1]?.text || '',
          answer3: q.answers[2]?.text || '',
          answer4: q.answers[3]?.text || '',
          status: 'easy',
          correctAnswer: (correctIndex + 1).toString(), // Сохраняем номер правильного ответа (1-4)
          attachment: q.info || '', // Используем инфо как доп. данные
          mainGame: savedCategory,
        });

        await queryRunner.manager.save(question);
      }

      this.logger.log(`Category "${categoryData.category_name}" imported with ${categoryData.questions.length} questions.`);
    }

    await queryRunner.commitTransaction();
    this.logger.log('Seed import completed successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error('Seed import failed. Rolling back.', error as Error);
  } finally {
    await queryRunner.release();
  }
}
}
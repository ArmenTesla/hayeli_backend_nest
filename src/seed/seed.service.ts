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
      this.logger.warn(
        `Seed file not found at ${filePath}. ` +
        `Skipping seed. Ensure data.json is in the root folder.`,
      );
      return;
    }

    const raw = readFileSync(filePath, 'utf8');
    let payload: SeedCategory[];

    try {
      payload = JSON.parse(raw) as SeedCategory[];
    } catch (error) {
      this.logger.error('Failed to parse data.json', error as Error);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const categoryItem of payload) {
        // Определяем имя и картинку, пробуя оба варианта написания (Camel и Snake)
        const name = categoryItem.gameName || categoryItem.game_name;
        const image = categoryItem.gameImage || categoryItem.game_image;

        if (!name) {
          this.logger.error('Category name is missing in JSON, skipping this category.');
          continue;
        }

        // Создаем категорию. В явном виде указываем поля для БД (game_name, game_image)
        const category = queryRunner.manager.create(CategoryEntity, {
          game_name: name,
          game_image: image || '',
        } as any);

        const savedCategory = await queryRunner.manager.save(category);

        // Создаем вопросы для этой категории
        const questionsToSave = categoryItem.questions.map((questionItem, index) => {
          return queryRunner.manager.create(QuestionEntity, {
            questionIndex: index + 1,
            question: questionItem.question,
            answer1: questionItem.answer1,
            answer2: questionItem.answer2,
            answer3: questionItem.answer3,
            answer4: questionItem.answer4,
            status: questionItem.status ?? 'easy',
            correctAnswer: String(questionItem.correctAnswer),
            attachment: questionItem.attachment,
            mainGame: savedCategory,
          });
        });

        // Сохраняем все вопросы пачкой для скорости
        await queryRunner.manager.save(questionsToSave);

        this.logger.log(
          `Imported category "${name}" with ${categoryItem.questions.length} questions.`,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Seed import completed. Total categories: ${payload.length}`);
    } catch (error) {
      // Если хоть один инсерт упадет — откатываем всё, чтобы не было мусора
      await queryRunner.rollbackTransaction();
      this.logger.error('Seed import failed. Database rolled back.', error as Error);
    } finally {
      // Обязательно освобождаем соединение
      await queryRunner.release();
    }
  }
}
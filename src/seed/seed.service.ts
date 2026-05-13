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
    if (!existsSync(filePath)) return;

    const raw = readFileSync(filePath, 'utf8');
    const payload = JSON.parse(raw);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of payload) {
        // Вставляем категорию напрямую через QueryBuilder, чтобы обойти капризы Entity
        const categoryResult = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(CategoryEntity)
          .values({
            gameName: item.game_name,   // Если в Entity поле gameName
            gameImage: item.game_image, // Если в Entity поле gameImage
          } as any)
          .execute();

        const categoryId = categoryResult.identifiers[0].id;

        for (const [index, q] of item.questions.entries()) {
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(QuestionEntity)
            .values({
              questionIndex: index + 1,
              question: q.question,
              answer1: q.answers[0] || '',
              answer2: q.answers[1] || '',
              answer3: q.answers[2] || '',
              answer4: q.answers[3] || '',
              status: 'easy',
              correctAnswer: (q.correctIndex + 1).toString(),
              attachment: q.info || '',
              mainGame: { id: categoryId }, // Привязка к созданной категории
            } as any)
            .execute();
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log('Seed SUCCESS! База наполнена.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Seed FAILED. Error details:', error);
    } finally {
      await queryRunner.release();
    }
  }
}
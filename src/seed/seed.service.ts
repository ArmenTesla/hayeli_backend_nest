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
  gameName: string;
  gameImage: string;
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
      this.logger.warn(`Seed file not found at ${filePath}. Skipping seed.`);
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
        // Create category entity using the same connection/transaction
        const category = queryRunner.manager.create(CategoryEntity, {
          gameName: categoryItem.gameName,
          gameImage: categoryItem.gameImage,
        });

        const savedCategory = await queryRunner.manager.save(category);

        // Create questions with auto-incrementing index
        for (let index = 0; index < categoryItem.questions.length; index++) {
          const questionItem = categoryItem.questions[index];

          const question = queryRunner.manager.create(QuestionEntity, {
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

          await queryRunner.manager.save(question);
        }

        this.logger.log(
          `Imported category "${categoryItem.gameName}" with ${categoryItem.questions.length} questions.`,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Seed import completed. Imported ${payload.length} categories.`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Seed import failed. Rolling back.', error as Error);
    } finally {
      await queryRunner.release();
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { QuestionEntity } from '../modules/game/entities/question.entity';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
    // Проверяем наличие данных, чтобы не дублировать их при каждом перезапуске
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
      for (const item of payload) {
        // У тебя структура: { "hay_es": { "category_name": "...", "questions": [...] } }
        const keys = Object.keys(item);
        const categoryKey = keys[0];
        const categoryData = item[categoryKey];

        if (!categoryData || !categoryData.category_name) {
          this.logger.warn(`Skipping invalid category item.`);
          continue;
        }

        this.logger.log(`Importing category: ${categoryData.category_name}`);

        // 1. Вставляем категорию через QueryBuilder
        // Используем 'as any' для гибкости названий полей (gameName/game_name)
        const categoryResult = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(CategoryEntity)
          .values({
            gameName: categoryData.category_name,
            gameImage: categoryData.game_image || 'assets/images/categories/hay_es.png',
          } as any)
          .execute();

        const categoryId = categoryResult.identifiers[0].id;

        // 2. Вставляем вопросы
        for (const [index, q] of categoryData.questions.entries()) {
          // Вытаскиваем только текст из массива объектов ответов
          const answerTexts = q.answers.map((a: any) => a.text || '');
          
          // Находим индекс правильного ответа (isCorrect: true)
          const correctIdx = q.answers.findIndex((a: any) => a.isCorrect === true);
          // Если не нашли, ставим по умолчанию "1" (MySQL не примет NaN или пустую строку)
          const finalCorrectAnswer = correctIdx !== -1 ? (correctIdx + 1).toString() : "1";

          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(QuestionEntity)
            .values({
              questionIndex: index + 1,
              question: q.question,
              answer1: answerTexts[0] || '',
              answer2: answerTexts[1] || '',
              answer3: answerTexts[2] || '',
              answer4: answerTexts[3] || '',
              status: 'easy',
              correctAnswer: finalCorrectAnswer,
              attachment: q.info || '', // Пояснение к вопросу
              mainGame: { id: categoryId },
            } as any)
            .execute();
        }
        
        this.logger.log(`Successfully imported "${categoryData.category_name}" with ${categoryData.questions.length} questions.`);
      }

      await queryRunner.commitTransaction();
      this.logger.log('SEED PROCESS COMPLETED SUCCESSFULLY!');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Seed FAILED. Rolling back transaction.', error);
    } finally {
      await queryRunner.release();
    }
  }
}
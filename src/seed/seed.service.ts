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
  const languages = ['am', 'ru', 'en'];
  
  for (const lang of languages) {
    const filePath = join(process.cwd(), `data_${lang}.json`);
    if (!existsSync(filePath)) {
      this.logger.warn(`Файл не найден: ${filePath}`);
      continue;
    }

    const raw = readFileSync(filePath, 'utf8');
    let payload: any[];

    try {
      payload = JSON.parse(raw);
    } catch (e) {
      this.logger.error(`Ошибка парсинга файла ${lang}:`, e);
      continue;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const categoryData of payload) {
        // Теперь мы берем данные напрямую из объекта, так как структуры hay_es: {} больше нет
        this.logger.log(`Импорт категории: ${categoryData.game_name} [${lang}]`);

        // 1. Вставляем категорию
        const categoryResult = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(CategoryEntity)
          .values({
            gameName: categoryData.game_name,
            gameImage: categoryData.game_image || 'assets/images/categories/default.png',
            language: lang,
          } as any)
          .execute();

        const categoryId = categoryResult.identifiers[0].id;

        // 2. Вставляем вопросы этой категории
        if (categoryData.questions && Array.isArray(categoryData.questions)) {
          for (const [index, q] of categoryData.questions.entries()) {
            const answerTexts = q.answers.map((a: any) => a.text || '');
            const correctIdx = q.answers.findIndex((a: any) => a.isCorrect === true);
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
                attachment: q.info || '', 
                language: lang,
                mainGame: { id: categoryId },
              } as any)
              .execute();
          }
        }
      }
      await queryRunner.commitTransaction();
      this.logger.log(`✅ Язык ${lang} успешно импортирован!`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Ошибка импорта языка ${lang}:`, err);
    } finally {
      await queryRunner.release();
    }
  }
}
}
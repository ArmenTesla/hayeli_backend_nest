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
    const languages = ['am', 'ru', 'en'];
    
    for (const lang of languages) {
      // Проверяем наличие категорий именно для текущего языка
      const count = await this.categoryRepository.count({
        where: { language: lang }
      });

      if (count > 0) {
        this.logger.log(`[${lang.toUpperCase()}] Данные уже есть в базе, пропускаю импорт.`);
        continue;
      }

      this.logger.log(`[${lang.toUpperCase()}] Данные не найдены, начинаю импорт...`);
      await this.importForLanguage(lang);
    }
  }

  private async importForLanguage(lang: string) {
    const filePath = join(process.cwd(), `data_${lang}.json`);
    
    if (!existsSync(filePath)) {
      this.logger.warn(`Файл не найден: ${filePath}`);
      return;
    }

    const raw = readFileSync(filePath, 'utf8');
    let payload: any[];

    try {
      payload = JSON.parse(raw);
    } catch (e) {
      this.logger.error(`Ошибка парсинга файла ${lang}:`, e);
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const categoryData of payload) {
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
          const questionsToInsert = categoryData.questions.map((q: any, index: number) => {
            const answerTexts = q.answers.map((a: any) => a.text || '');
            const correctIdx = q.answers.findIndex((a: any) => a.isCorrect === true);
            const finalCorrectAnswer = correctIdx !== -1 ? (correctIdx + 1).toString() : "1";

            return {
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
            };
          });

          // Пакетная вставка вопросов для ускорения процесса
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(QuestionEntity)
            .values(questionsToInsert as any)
            .execute();
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`✅ Язык [${lang}] успешно импортирован!`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Ошибка во время импорта языка [${lang}]:`, err);
    } finally {
      await queryRunner.release();
    }
  }
}
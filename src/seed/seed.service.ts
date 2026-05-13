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
    if (!existsSync(filePath)) continue;

    const raw = readFileSync(filePath, 'utf8');
    const payload = JSON.parse(raw);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of payload) {
        const categoryData = Object.values(item)[0] as any;

        // Вставляем категорию с указанием языка
        const categoryResult = await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(CategoryEntity)
          .values({
            gameName: categoryData.category_name,
            gameImage: categoryData.game_image,
            language: lang, // <--- ВАЖНО: сохраняем язык
          } as any)
          .execute();

        const categoryId = categoryResult.identifiers[0].id;

        for (const q of categoryData.questions) {
          await queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(QuestionEntity)
            .values({
              question: q.question,
              language: lang, // <--- ВАЖНО: сохраняем язык
              mainGame: { id: categoryId },
              // ... остальные поля как у тебя были
            } as any)
            .execute();
        }
      }
      await queryRunner.commitTransaction();
      this.logger.log(`Imported ${lang} language successfully`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to import ${lang}`, err);
    } finally {
      await queryRunner.release();
    }
  }
}
}
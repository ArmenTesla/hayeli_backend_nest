import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async findAllByLang(lang: string): Promise<CategoryEntity[]> {
    // Ищем категории в базе, соответствующие выбранному языку
    return await this.categoryRepository.find({
      where: { language: lang },
    });
  }

  async findByNameAndLang(gameName: string, lang: string): Promise<CategoryEntity | null> {
    return await this.categoryRepository.findOne({
      where: { gameName, language: lang },
    });
  }
}
import { Injectable } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface JsonCategory {
  [key: string]: {
    category_name: string;
    questions: any[];
  };
}

@Injectable()
export class CategoriesService {
  private categories: { id: number; gameName: string; gameImage: string }[] = [];

  constructor() {
    this.loadCategoriesFromJson();
  }

  private loadCategoriesFromJson() {
    const filePath = join(process.cwd(), 'data.json');
    if (!existsSync(filePath)) {
      console.warn('data.json not found, categories will be empty');
      return;
    }

    const raw = readFileSync(filePath, 'utf8');
    const data: JsonCategory[] = JSON.parse(raw);

    this.categories = data.map((item, index) => {
      const key = Object.keys(item)[0];
      return {
        id: index + 1,
        gameName: key,
        gameImage: '', // Default empty, can be updated if needed
      };
    });
  }

  async findAll() {
    return this.categories;
  }

  async findByName(gameName: string) {
    return this.categories.find(cat => cat.gameName === gameName) || null;
  }
}

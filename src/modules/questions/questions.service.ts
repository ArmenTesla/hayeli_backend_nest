import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface JsonQuestion {
  id: number;
  question: string;
  answers: { text: string; isCorrect: boolean }[];
  info: string;
}

interface JsonCategory {
  [key: string]: {
    category_name: string;
    questions: JsonQuestion[];
  };
}

@Injectable()
export class QuestionsService {
  private data: JsonCategory[] = [];

  constructor() {
    this.loadDataFromJson();
  }

  private loadDataFromJson() {
    const filePath = join(process.cwd(), 'data.json');
    if (!existsSync(filePath)) {
      console.warn('data.json not found, questions will be empty');
      return;
    }

    const raw = readFileSync(filePath, 'utf8');
    this.data = JSON.parse(raw);
  }

  async findByCategoryName(categoryName: string) {
    const categoryData = this.data.find(item => Object.keys(item)[0] === categoryName);
    if (!categoryData) {
      throw new NotFoundException(`Category ${categoryName} not found`);
    }

    const questions = categoryData[categoryName].questions;

    return questions.map((q, index) => ({
      id: q.id,
      questionIndex: index + 1,
      question: q.question,
      answer1: q.answers[0]?.text || '',
      answer2: q.answers[1]?.text || '',
      answer3: q.answers[2]?.text || '',
      answer4: q.answers[3]?.text || '',
      status: 'easy' as 'easy' | 'medium' | 'hard',
      correctAnswer: q.answers.findIndex(a => a.isCorrect) + 1 + '',
      explanation: q.info,
      attachment: null,
    }));
  }

  async create(dto: any) {
    // Not implemented for JSON-based approach
    throw new Error('Create not supported with JSON data source');
  }
}

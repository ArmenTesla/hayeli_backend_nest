import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '../stats/entities/user-profile.entity';
import { UserProgressEntity } from '../stats/entities/user-progress.entity';
import { LevelConfigEntity } from './entities/level-config.entity';
import { UserEntity } from '../../common/entities/users.entity';
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
export class GameService {
  private data: JsonCategory[] = [];

  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(UserProgressEntity)
    private readonly userProgressRepository: Repository<UserProgressEntity>,
    @InjectRepository(LevelConfigEntity)
    private readonly levelConfigRepository: Repository<LevelConfigEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    this.loadDataFromJson();
  }

  private loadDataFromJson() {
    const filePath = join(process.cwd(), 'data.json');
    if (!existsSync(filePath)) {
      console.warn('data.json not found');
      return;
    }

    const raw = readFileSync(filePath, 'utf8');
    this.data = JSON.parse(raw);
  }

  private findQuestionById(questionId: number) {
    for (const categoryData of this.data) {
      const categoryName = Object.keys(categoryData)[0];
      const questions = categoryData[categoryName].questions;
      const question = questions.find(q => q.id === questionId);
      if (question) {
        return { question, categoryName };
      }
    }
    return null;
  }

  async answerQuestion(user: UserEntity, questionId: number, answerId: number) {
    const questionData = this.findQuestionById(questionId);
    if (!questionData) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    const { question, categoryName } = questionData;
    const correctAnswerIndex = question.answers.findIndex(a => a.isCorrect) + 1;
    const isCorrect = answerId === correctAnswerIndex;

    if (!isCorrect) {
      return {
        info: 'Պատասխանը սխալ է',
        true: correctAnswerIndex.toString(),
        status: 'easy',
      };
    }

    let profile = await this.userProfileRepository.findOne({
      where: { user: { id: user.id }, game_id: questionId },
    });

    if (!profile) {
      profile = this.userProfileRepository.create({
        user,
        game_id: questionId,
        score: 0,
        step: 1,
        skipped: [],
      });
    }

    profile.score += this.getScoreIncrement('easy'); // Default to easy for now
    profile.step += 1;
    await this.userProfileRepository.save(profile);

    let progress = await this.userProgressRepository.findOne({
      where: { user: { id: user.id }, mainGameName: categoryName },
    });

    if (!progress) {
      progress = this.userProgressRepository.create({
        user,
        mainGameName: categoryName,
        lastQuestion: question.id,
      });
    } else {
      progress.lastQuestion = question.id;
    }

    await this.userProgressRepository.save(progress);

    const levelResult = await this.calculateUserLevel(user);

    return {
      info: 'Պատասխանը ճիշտ է',
      status: 'easy',
      score: profile.score,
      level: levelResult.level,
      totalScore: levelResult.totalScore,
    };
  }

  async resetScore(user: UserEntity) {
    await this.userProfileRepository
      .createQueryBuilder()
      .update(UserProfileEntity)
      .set({ score: 0, step: 1 })
      .where('user_id = :userId', { userId: user.id })
      .execute();

    return {
      message: 'Game fully reset. User can start again from the beginning.',
    };
  }

  async skipQuestion(user: UserEntity, questionId: number) {
    const questionData = this.findQuestionById(questionId);
    if (!questionData) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    const { question, categoryName } = questionData;

    let profile = await this.userProfileRepository.findOne({
      where: { user: { id: user.id }, game_id: questionId },
    });

    if (!profile) {
      profile = this.userProfileRepository.create({
        user,
        game_id: questionId,
        score: 0,
        step: 1,
        skipped: [],
      });
    }

    if (!profile.skipped.includes(questionId)) {
      profile.skipped = [...profile.skipped, questionId];
    }

    await this.userProfileRepository.save(profile);

    let progress = await this.userProgressRepository.findOne({
      where: { user: { id: user.id }, mainGameName: categoryName },
    });

    if (!progress) {
      progress = this.userProgressRepository.create({
        user,
        mainGameName: categoryName,
        lastQuestion: question.id,
      });
    } else {
      progress.lastQuestion = question.id;
    }

    await this.userProgressRepository.save(progress);

    return {
      info: 'Question skipped successfully',
      skipped: profile.skipped,
      category: categoryName,
      questionId: question.id,
    };
  }

  async finishGame(user: UserEntity) {
    const levelResult = await this.calculateUserLevel(user);

    return {
      message: 'Game finished successfully',
      level: levelResult.level,
      totalScore: levelResult.totalScore,
    };
  }

  async getCategoryTopScores(categoryName: string) {
    // Since we switched to JSON, we need to get all question IDs for this category
    const categoryData = this.data.find(item => Object.keys(item)[0] === categoryName);
    if (!categoryData) {
      throw new NotFoundException(`Category ${categoryName} not found`);
    }

    const questionIds = categoryData[categoryName].questions.map(q => q.id);

    const rows = await this.userProfileRepository
      .createQueryBuilder('profile')
      .select('user.username', 'username')
      .addSelect('SUM(profile.score)', 'totalScore')
      .innerJoin('profile.user', 'user')
      .where('profile.game_id IN (:...questionIds)', { questionIds })
      .groupBy('user.username')
      .orderBy('totalScore', 'DESC')
      .limit(50)
      .getRawMany();

    return rows.map((row) => ({
      username: row.username,
      totalScore: Number(row.totalScore),
    }));
  }

  async deleteUser(user: UserEntity) {
    await this.userRepository.delete(user.id);
    return { message: 'User deleted successfully' };
  }

  async calculateUserLevel(user: UserEntity) {
    const result = await this.userProfileRepository
      .createQueryBuilder('profile')
      .select('SUM(profile.score)', 'total')
      .where('profile.user_id = :userId', { userId: user.id })
      .getRawOne();

    const totalScore = Number(result?.total ?? 0);

    const levelConfig = await this.levelConfigRepository.findOne({
      order: { id: 'DESC' },
    });

    const percent = levelConfig?.levelPercent ?? 100;
    const adjustedScore = totalScore * (percent / 100);
    const level = Math.floor(adjustedScore / 50);

    return { level, totalScore };
  }

  async getTopScores() {
    const rows = await this.userProfileRepository
      .createQueryBuilder('profile')
      .select('user.username', 'username')
      .addSelect('SUM(profile.score)', 'totalScore')
      .innerJoin('profile.user', 'user')
      .groupBy('user.username')
      .orderBy('totalScore', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      username: row.username,
      totalScore: Number(row.totalScore),
    }));
  }

  private getScoreIncrement(status: string) {
    switch (status) {
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 1;
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '../stats/entities/user-profile.entity';
import { UserProgressEntity } from '../stats/entities/user-progress.entity';
import { LevelConfigEntity } from './entities/level-config.entity';
import { QuestionEntity } from '../questions/entities/question.entity';
import { UserEntity } from '../../common/entities/users.entity';
import { CategoryEntity } from '../categories/entities/category.entity';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(UserProgressEntity)
    private readonly userProgressRepository: Repository<UserProgressEntity>,
    @InjectRepository(LevelConfigEntity)
    private readonly levelConfigRepository: Repository<LevelConfigEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async answerQuestion(user: UserEntity, questionId: number, answerId: number) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['mainGame'],
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    const isCorrect = String(answerId) === question.correctAnswer;

    if (!isCorrect) {
      return {
        info: 'Պատասխանը սխալ է',
        true: question.correctAnswer,
        status: question.status,
      };
    }

    let profile = await this.userProfileRepository.findOne({
      where: { user: { id: user.id }, game: { id: question.id } },
    });

    if (!profile) {
      profile = this.userProfileRepository.create({
        user,
        game: question,
        score: 0,
        step: 1,
        skipped: [],
      });
    }

    profile.score += this.getScoreIncrement(question.status);
    profile.step += 1;
    await this.userProfileRepository.save(profile);

    let progress = await this.userProgressRepository.findOne({
      where: { user: { id: user.id }, mainGame: { id: question.mainGame.id } },
    });

    if (!progress) {
      progress = this.userProgressRepository.create({
        user,
        mainGame: question.mainGame,
        lastQuestion: question.questionIndex,
      });
    } else {
      progress.lastQuestion = question.questionIndex;
    }

    await this.userProgressRepository.save(progress);

    const levelResult = await this.calculateUserLevel(user);

    return {
      info: 'Պատասխանը ճիշտ է',
      status: question.status,
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
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['mainGame'],
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${questionId} not found`);
    }

    let profile = await this.userProfileRepository.findOne({
      where: { user: { id: user.id }, game: { id: question.id } },
    });

    if (!profile) {
      profile = this.userProfileRepository.create({
        user,
        game: question,
        score: 0,
        step: 1,
        skipped: [],
      });
    }

    if (!profile.skipped.includes(question.id)) {
      profile.skipped = [...profile.skipped, question.id];
    }

    await this.userProfileRepository.save(profile);

    let progress = await this.userProgressRepository.findOne({
      where: { user: { id: user.id }, mainGame: { id: question.mainGame.id } },
    });

    if (!progress) {
      progress = this.userProgressRepository.create({
        user,
        mainGame: question.mainGame,
        lastQuestion: question.questionIndex,
      });
    } else {
      progress.lastQuestion = question.questionIndex;
    }

    await this.userProgressRepository.save(progress);

    return {
      info: 'Question skipped successfully',
      skipped: profile.skipped,
      category: question.mainGame.gameName,
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
    const category = await this.categoryRepository.findOne({
      where: { gameName: categoryName },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryName} not found`);
    }

    const rows = await this.userProfileRepository
      .createQueryBuilder('profile')
      .select('user.username', 'username')
      .addSelect('SUM(profile.score)', 'totalScore')
      .innerJoin('profile.user', 'user')
      .innerJoin('profile.game', 'question')
      .innerJoin('question.mainGame', 'category')
      .where('category.id = :categoryId', { categoryId: category.id })
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

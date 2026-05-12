import { Controller, Get, Param, Req, UseGuards, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { GameService } from './game.service';
import { JwtAuthGuard } from '../../auth/auth/jwt.guard';
import { UserEntity } from '../../common/entities/users.entity';

@ApiTags('Game')
@ApiBearerAuth()
@Controller('api')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('answer/:questionId/:answerId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit answer and update user profile score' })
  async answerQuestion(
    @Req() req: Request,
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
  ) {
    const user = req.user as UserEntity;
    return this.gameService.answerQuestion(user, Number(questionId), Number(answerId));
  }

  @Post('skip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Skip a question and record it in the user profile' })
  async skipQuestion(@Req() req: Request, @Body('questionId') questionId: number) {
    const user = req.user as UserEntity;
    return this.gameService.skipQuestion(user, Number(questionId));
  }

  @Post('finish')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Finish the current game and calculate final level' })
  async finishGame(@Req() req: Request) {
    const user = req.user as UserEntity;
    return this.gameService.finishGame(user);
  }

  @Get('resetscore')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset authenticated user score state' })
  async resetScore(@Req() req: Request) {
    const user = req.user as UserEntity;
    return this.gameService.resetScore(user);
  }

  @Get('top-scores')
  @ApiOperation({ summary: 'List top aggregated user scores' })
  async getTopScores() {
    return this.gameService.getTopScores();
  }

  @Get('top-scores/:categoryName')
  @ApiOperation({ summary: 'List top scores for a specific category' })
  async getCategoryTopScores(@Param('categoryName') categoryName: string) {
    return this.gameService.getCategoryTopScores(categoryName);
  }

  @Delete('user/delete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete authenticated user and cascade related game data' })
  async deleteUser(@Req() req: Request) {
    const user = req.user as UserEntity;
    return this.gameService.deleteUser(user);
  }
}

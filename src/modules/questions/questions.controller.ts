import { Controller, Get, Param, Post, Body, UseGuards, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../../auth/auth/jwt.guard';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('questions/:categoryName')
  @ApiOperation({ summary: 'Get all questions for a category by language' })
  async getQuestionsByCategory(
    @Param('categoryName') categoryName: string,
    @Headers('accept-language') lang: string,
    @Query('limit') limit?: string,
  ) {
    const currentLang = lang ? lang.split(',')[0].substring(0, 2).toLowerCase() : 'en';
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : undefined;

    const questions = await this.questionsService.findByCategoryAndLang(categoryName, currentLang, limitNum);

    const mapped = questions.map((question) => ({
      id: question.id,
      question: question.question,
      answers: [
        { text: question.answer1, isCorrect: question.correctAnswer === '1' },
        { text: question.answer2, isCorrect: question.correctAnswer === '2' },
        { text: question.answer3, isCorrect: question.correctAnswer === '3' },
        { text: question.answer4, isCorrect: question.correctAnswer === '4' },
      ],
      status: question.status,
      explanation: question.explanation ?? null,
      attachment: question.attachment ?? null,
      questionIndex: question.questionIndex,
    }));

    return mapped.length === 1 ? { question: mapped[0] } : { questions: mapped };
  }

  @Post('questions')
  @ApiOperation({ summary: 'Create a new question' })
  async createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }
}
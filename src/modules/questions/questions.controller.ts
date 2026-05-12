import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get all questions for a category' })
  async getQuestionsByCategory(@Param('categoryName') categoryName: string) {
    const questions = await this.questionsService.findByCategoryName(categoryName);

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

    if (mapped.length === 1) {
      return { question: mapped[0] };
    }

    return { questions: mapped };
  }

  @Post('questions')
  @ApiOperation({ summary: 'Create a new question with sequential question_index' })
  async createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }
}

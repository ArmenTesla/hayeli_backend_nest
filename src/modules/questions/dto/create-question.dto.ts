import { IsNotEmpty, IsString, IsOptional, IsIn, IsNumber } from 'class-validator';

export class CreateQuestionDto {
  @IsNumber()
  categoryId!: number;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer1!: string;

  @IsString()
  @IsNotEmpty()
  answer2!: string;

  @IsString()
  @IsNotEmpty()
  answer3!: string;

  @IsString()
  @IsNotEmpty()
  answer4!: string;

  @IsString()
  @IsIn(['easy', 'medium', 'hard'])
  @IsOptional()
  status?: 'easy' | 'medium' | 'hard';

  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsString()
  @IsOptional()
  attachment?: string;
}

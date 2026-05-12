import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CategoryEntity } from '../../categories/entities/category.entity';

@Entity('main_question')
export class QuestionEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'question_index', type: 'int', default: 1 })
  questionIndex!: number;

  @Column({ type: 'varchar', length: 255 })
  question!: string;

  @Column({ name: 'answer_1', type: 'varchar', length: 255 })
  answer1!: string;

  @Column({ name: 'answer_2', type: 'varchar', length: 255 })
  answer2!: string;

  @Column({ name: 'answer_3', type: 'varchar', length: 255 })
  answer3!: string;

  @Column({ name: 'answer_4', type: 'varchar', length: 255 })
  answer4!: string;

  @Column({ type: 'varchar', length: 10, default: 'easy' })
  status!: 'easy' | 'medium' | 'hard';

  @Column({ name: 'correct_answer', type: 'char', length: 1 })
  correctAnswer!: string;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachment?: string;

  @ManyToOne(() => CategoryEntity, (category) => category.questions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'main_game_id' })
  mainGame!: CategoryEntity;
}

import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { QuestionEntity } from '../../game/entities/question.entity';

@Entity('main_getcategory')
export class CategoryEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'game_name', type: 'varchar', length: 255 })
  gameName!: string;

  @Column({ name: 'game_image', type: 'varchar', length: 255 })
  gameImage!: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language!: string;

  @OneToMany(() => QuestionEntity, (question) => question.mainGame)
  questions!: QuestionEntity[];
}

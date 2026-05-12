import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../../common/entities/users.entity';
import { QuestionEntity } from '../../game/entities/question.entity';

@Entity('main_userprofile')
export class UserProfileEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => QuestionEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'game_id' })
  game!: QuestionEntity;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 1 })
  step!: number;

  @Column({ type: 'simple-json', default: '[]' })
  skipped!: number[];
}

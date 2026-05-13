import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../../common/entities/users.entity';

@Entity('main_userprofile')
export class UserProfileEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'int', nullable: false })
  game_id!: number; // Changed from relation to QuestionEntity to simple ID

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 1 })
  step!: number;

  @Column({ type: 'simple-json', nullable: true })
  skipped: number[] = [];
}

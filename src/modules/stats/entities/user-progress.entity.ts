import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../../../common/entities/users.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';

@Entity('main_userprogress')
@Index(['user', 'mainGame'], { unique: true })
export class UserProgressEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => CategoryEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'main_game_id' })
  mainGame!: CategoryEntity;

  @Column({ name: 'last_question', type: 'int', default: 0 })
  lastQuestion!: number;
}

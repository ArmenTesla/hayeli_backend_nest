import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../../../common/entities/users.entity';

@Entity('main_userprogress')
@Index(['user', 'mainGameName'], { unique: true })
export class UserProgressEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'main_game_name', type: 'varchar', length: 255, nullable: false })
  mainGameName!: string; // Changed from relation to CategoryEntity to category name

  @Column({ name: 'last_question', type: 'int', default: 0 })
  lastQuestion!: number;
}

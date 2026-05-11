import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './users.entity';

@Entity('player_stats')
export class PlayerStatsEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  score!: number;

  @Column({ default: 1 })
  level!: number;

  @Column({ default: 0 })
  experience!: number;

  @Column({ default: 0 })
  gamesPlayed!: number;

  @OneToOne(() => UserEntity, (user) => user.stats, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: UserEntity;
}
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToOne } from 'typeorm';
import { PlayerStatsEntity } from './player-stats.entity';

@Entity('users')
export class UserEntity {
     @OneToOne(() => PlayerStatsEntity, (stats) => stats.user)
  stats!: PlayerStatsEntity;
  @PrimaryGeneratedColumn()
  id!: number; // Добавляем !
  
  @Column({ unique: true, length: 150 })
  username!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  @Column({ nullable: true })
  googleId: string;
}
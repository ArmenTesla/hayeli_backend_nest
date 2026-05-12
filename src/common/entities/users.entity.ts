import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToOne, OneToMany } from 'typeorm';
import { PlayerStatsEntity } from './player-stats.entity';
import { UserProfileEntity } from '../../modules/stats/entities/user-profile.entity';
import { UserProgressEntity } from '../../modules/stats/entities/user-progress.entity';

@Entity('users')
export class UserEntity {
  @OneToOne(() => PlayerStatsEntity, (stats) => stats.user)
  stats!: PlayerStatsEntity;

  @OneToMany(() => UserProfileEntity, (profile) => profile.user, {
    cascade: ['insert', 'update'],
  })
  profiles!: UserProfileEntity[];

  @OneToMany(() => UserProgressEntity, (progress) => progress.user, {
    cascade: ['insert', 'update'],
  })
  progress!: UserProgressEntity[];

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
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('main_levelconfig')
export class LevelConfigEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'level_percent', type: 'double', default: 100 })
  levelPercent!: number;
}

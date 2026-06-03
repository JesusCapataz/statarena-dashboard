import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('standings')
@Index(['leagueExternalId', 'season', 'teamExternalId'], { unique: true })
export class Standing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  leagueExternalId: number;

  @Column({ type: 'int' })
  season: number;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'int' })
  teamExternalId: number;

  @Column()
  teamName: string;

  @Column({ nullable: true })
  teamLogo: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  played: number;

  @Column({ type: 'int', default: 0 })
  win: number;

  @Column({ type: 'int', default: 0 })
  draw: number;

  @Column({ type: 'int', default: 0 })
  lose: number;

  @Column({ type: 'int', default: 0 })
  goalsFor: number;

  @Column({ type: 'int', default: 0 })
  goalsAgainst: number;

  @Column({ nullable: true })
  form: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

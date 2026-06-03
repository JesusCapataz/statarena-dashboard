import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fixtures')
export class Fixture {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'int' })
  externalId: number;

  @Index()
  @Column({ type: 'int' })
  leagueExternalId: number;

  @Column({ type: 'int' })
  season: number;

  @Column({ type: 'timestamptz' })
  utcDate: Date;

  @Column({ default: 'NS' })
  status: string;

  @Column({ type: 'int', nullable: true })
  elapsed: number;

  @Column({ nullable: true })
  round: string;

  @Column({ type: 'int' })
  homeTeamExternalId: number;

  @Column({ type: 'int' })
  awayTeamExternalId: number;

  @Column()
  homeName: string;

  @Column()
  awayName: string;

  @Column({ nullable: true })
  homeLogo: string;

  @Column({ nullable: true })
  awayLogo: string;

  @Column({ type: 'int', nullable: true })
  homeGoals: number;

  @Column({ type: 'int', nullable: true })
  awayGoals: number;

  /** Estadísticas/eventos variables del partido (híbrido relacional + documento). */
  @Column({ type: 'jsonb', nullable: true })
  analysis: Record<string, unknown> | null;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('players')
@Index(['externalId', 'leagueExternalId', 'season'], { unique: true })
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  externalId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  position: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'int', nullable: true })
  teamExternalId: number;

  @Column({ type: 'int' })
  leagueExternalId: number;

  @Column({ type: 'int' })
  season: number;

  @Column({ type: 'int', default: 0 })
  goals: number;

  @Column({ type: 'int', default: 0 })
  assists: number;

  @Column({ type: 'int', default: 0 })
  appearances: number;

  @Column({ type: 'float', nullable: true })
  rating: number;

  @UpdateDateColumn()
  updatedAt: Date;
}

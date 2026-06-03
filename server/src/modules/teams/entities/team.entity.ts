import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'int' })
  externalId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  country: string;

  @Column({ type: 'int', nullable: true })
  founded: number;

  @Column({ nullable: true })
  venue: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('leagues')
@Index(['externalId', 'season'], { unique: true })
export class League {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  externalId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  type: string;

  @Column({ type: 'int' })
  season: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

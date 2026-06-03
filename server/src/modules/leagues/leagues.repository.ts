import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Standing } from './entities/standing.entity';
import { League } from './entities/league.entity';

/**
 * Repositorio: única capa que conoce la persistencia (SRP).
 * Encapsula upserts idempotentes para el proceso de sincronización.
 */
@Injectable()
export class LeaguesRepository {
  constructor(
    @InjectRepository(Standing) private readonly standings: Repository<Standing>,
    @InjectRepository(League) private readonly leagues: Repository<League>,
  ) {}

  findStandings(leagueExternalId: number, season: number): Promise<Standing[]> {
    return this.standings.find({
      where: { leagueExternalId, season },
      order: { rank: 'ASC' },
    });
  }

  async upsertStandings(rows: Partial<Standing>[]): Promise<void> {
    if (!rows.length) return;
    await this.standings.upsert(rows, ['leagueExternalId', 'season', 'teamExternalId']);
  }

  findLeagues(season: number): Promise<League[]> {
    return this.leagues.find({ where: { season }, order: { name: 'ASC' } });
  }

  async upsertLeagues(rows: Partial<League>[]): Promise<void> {
    if (!rows.length) return;
    await this.leagues.upsert(rows, ['externalId', 'season']);
  }
}

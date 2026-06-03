import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import {
  FOOTBALL_PROVIDER,
  IFootballProvider,
} from '../../providers/football-provider.interface';
import { Player } from './entities/player.entity';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);
  private readonly defaultSeason: number;

  constructor(
    @InjectRepository(Player) private readonly repo: Repository<Player>,
    private readonly config: ConfigService,
    @Inject(FOOTBALL_PROVIDER) private readonly provider: IFootballProvider,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.defaultSeason = this.config.get<number>('provider.defaultSeason')!;
  }

  async getTopScorers(leagueId: number, season?: number, limit = 20): Promise<Player[]> {
    const s = season ?? this.defaultSeason;
    const key = `topscorers:${leagueId}:${s}`;

    const cached = await this.cache.get<Player[]>(key);
    if (cached) return cached.slice(0, limit);

    let rows = await this.repo.find({
      where: { leagueExternalId: leagueId, season: s },
      order: { goals: 'DESC', assists: 'DESC' },
      take: 50,
    });

    if (!rows.length) rows = await this.refreshTopScorers(leagueId, s);

    await this.cache.set(key, rows);
    return rows.slice(0, limit);
  }

  async refreshTopScorers(leagueId: number, season: number): Promise<Player[]> {
    try {
      const provided = await this.provider.getTopScorers(leagueId, season);
      const rows: Partial<Player>[] = provided.map((p) => ({
        externalId: p.externalId,
        name: p.name,
        firstName: p.firstName ?? undefined,
        lastName: p.lastName ?? undefined,
        photo: p.photo ?? undefined,
        nationality: p.nationality ?? undefined,
        position: p.position ?? undefined,
        age: p.age ?? undefined,
        teamExternalId: p.teamExternalId ?? undefined,
        leagueExternalId: leagueId,
        season,
        goals: p.goals,
        assists: p.assists,
        appearances: p.appearances,
        rating: p.rating ?? undefined,
      }));
      if (rows.length) {
        await this.repo.upsert(rows, ['externalId', 'leagueExternalId', 'season']);
      }
      return this.repo.find({
        where: { leagueExternalId: leagueId, season },
        order: { goals: 'DESC', assists: 'DESC' },
        take: 50,
      });
    } catch (err: any) {
      this.logger.warn(`refreshTopScorers(${leagueId}) failed: ${err?.message}`);
      return this.repo.find({ where: { leagueExternalId: leagueId, season }, order: { goals: 'DESC' } });
    }
  }
}

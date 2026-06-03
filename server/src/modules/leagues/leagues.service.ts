import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import {
  FOOTBALL_PROVIDER,
  IFootballProvider,
} from '../../providers/football-provider.interface';
import { Standing } from './entities/standing.entity';
import { LeaguesRepository } from './leagues.repository';

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);
  private readonly defaultSeason: number;
  private readonly leagueIds: number[];

  constructor(
    private readonly repo: LeaguesRepository,
    private readonly config: ConfigService,
    @Inject(FOOTBALL_PROVIDER) private readonly provider: IFootballProvider,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.defaultSeason = this.config.get<number>('provider.defaultSeason')!;
    this.leagueIds = this.config.get<number[]>('provider.leagueIds')!;
  }

  /** Clasificación con estrategia cache-aside: cache → DB → proveedor (+persistencia). */
  async getStandings(leagueId: number, season?: number): Promise<Standing[]> {
    const s = season ?? this.defaultSeason;
    const key = `standings:${leagueId}:${s}`;

    const cached = await this.cache.get<Standing[]>(key);
    if (cached) return cached;

    let rows = await this.repo.findStandings(leagueId, s);

    if (!rows.length) {
      rows = await this.refreshStandings(leagueId, s);
    }

    await this.cache.set(key, rows);
    return rows;
  }

  /** Trae del proveedor y persiste (lo usa también el job de sync). */
  async refreshStandings(leagueId: number, season: number): Promise<Standing[]> {
    try {
      const provided = await this.provider.getStandings(leagueId, season);
      const rows: Partial<Standing>[] = provided.map((r) => ({
        leagueExternalId: leagueId,
        season,
        rank: r.rank,
        teamExternalId: r.team.externalId,
        teamName: r.team.name,
        teamLogo: r.team.logo ?? undefined,
        points: r.points,
        played: r.played,
        win: r.win,
        draw: r.draw,
        lose: r.lose,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        form: r.form ?? undefined,
      }));
      await this.repo.upsertStandings(rows);
      await this.cache.del(`standings:${leagueId}:${season}`);
      return this.repo.findStandings(leagueId, season);
    } catch (err: any) {
      this.logger.warn(`refreshStandings(${leagueId}, ${season}) failed: ${err?.message}`);
      return this.repo.findStandings(leagueId, season);
    }
  }

  getConfiguredLeagueIds(): number[] {
    return this.leagueIds;
  }

  getDefaultSeason(): number {
    return this.defaultSeason;
  }
}

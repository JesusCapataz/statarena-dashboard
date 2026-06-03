import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  IFootballProvider,
  ProviderFixture,
  ProviderFixtureAnalysis,
  ProviderPlayer,
  ProviderStandingRow,
  ProviderTeam,
} from '../football-provider.interface';
import { ApiFootballMapper } from './api-football.mapper';

/**
 * Adapter concreto para API-Football (api-sports.io).
 * Implementa el puerto IFootballProvider. Maneja autenticación, errores y
 * la forma de respuesta { response: [...] } del proveedor.
 */
@Injectable()
export class ApiFootballProvider implements IFootballProvider {
  private readonly logger = new Logger(ApiFootballProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('provider.baseUrl')!;
    this.apiKey = config.get<string>('provider.apiKey')!;
  }

  private async get<T = any>(path: string, params: Record<string, any>): Promise<T[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}${path}`, {
          params,
          headers: { 'x-apisports-key': this.apiKey },
          timeout: 10_000,
        }),
      );
      if (data?.errors && Object.keys(data.errors).length) {
        this.logger.warn(`Provider errors on ${path}: ${JSON.stringify(data.errors)}`);
      }
      return (data?.response ?? []) as T[];
    } catch (err: any) {
      this.logger.error(`Provider request failed: ${path} — ${err?.message}`);
      throw err;
    }
  }

  async getStandings(leagueId: number, season: number): Promise<ProviderStandingRow[]> {
    const res = await this.get('/standings', { league: leagueId, season });
    const groups = res?.[0]?.league?.standings ?? [];
    return (groups[0] ?? []).map(ApiFootballMapper.standingRow);
  }

  async getTeams(leagueId: number, season: number): Promise<ProviderTeam[]> {
    const res = await this.get('/teams', { league: leagueId, season });
    return res.map((r: any) => ApiFootballMapper.team(r?.team));
  }

  async getTopScorers(leagueId: number, season: number): Promise<ProviderPlayer[]> {
    const res = await this.get('/players/topscorers', { league: leagueId, season });
    return res.map(ApiFootballMapper.player);
  }

  async getFixtures(
    leagueId: number,
    season: number,
    opts: { from?: string; to?: string } = {},
  ): Promise<ProviderFixture[]> {
    const res = await this.get('/fixtures', {
      league: leagueId,
      season,
      ...(opts.from ? { from: opts.from } : {}),
      ...(opts.to ? { to: opts.to } : {}),
    });
    return res.map(ApiFootballMapper.fixture);
  }

  async getLiveFixtures(leagueIds?: number[]): Promise<ProviderFixture[]> {
    const res = await this.get('/fixtures', { live: 'all' });
    const mapped = res.map(ApiFootballMapper.fixture);
    return leagueIds?.length
      ? mapped.filter((f) => leagueIds.includes(f.leagueExternalId))
      : mapped;
  }

  async getFixtureAnalysis(fixtureId: number): Promise<ProviderFixtureAnalysis> {
    const [fixtureRes, eventsRes, lineupsRes, statsRes] = await Promise.all([
      this.get('/fixtures', { id: fixtureId }),
      this.get('/fixtures/events', { fixture: fixtureId }),
      this.get('/fixtures/lineups', { fixture: fixtureId }),
      this.get('/fixtures/statistics', { fixture: fixtureId }),
    ]);
    return {
      fixture: ApiFootballMapper.fixture(fixtureRes?.[0]),
      events: eventsRes.map(ApiFootballMapper.event),
      lineups: lineupsRes.map(ApiFootballMapper.lineup),
      statistics: statsRes.map(ApiFootballMapper.statistics),
    };
  }
}

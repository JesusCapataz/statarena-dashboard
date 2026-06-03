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
import { FootballDataMapper } from './football-data.mapper';

/** Mapa id interno (estilo API-Football) -> código de competición football-data.org. */
const ID_TO_CODE: Record<number, string> = {
  140: 'PD', // LaLiga
  39: 'PL', // Premier League
  135: 'SA', // Serie A
  78: 'BL1', // Bundesliga
  61: 'FL1', // Ligue 1
  88: 'DED', // Eredivisie
  94: 'PPL', // Primeira Liga
  40: 'ELC', // Championship
  2: 'CL', // Champions League
};
const CODE_TO_ID: Record<string, number> = Object.keys(ID_TO_CODE).reduce(
  (acc, id) => {
    acc[ID_TO_CODE[Number(id)]] = Number(id);
    return acc;
  },
  {} as Record<string, number>,
);

/**
 * Adapter para football-data.org (v4). Da datos de la TEMPORADA ACTUAL en el
 * plan gratuito (clasificación, partidos, goleadores). Implementa IFootballProvider.
 */
@Injectable()
export class FootballDataProvider implements IFootballProvider {
  private readonly logger = new Logger(FootballDataProvider.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('provider.fdBaseUrl')!;
    this.token = config.get<string>('provider.fdToken')!;
  }

  private code(leagueId: number): string {
    return ID_TO_CODE[leagueId] ?? 'PD';
  }

  private async get(path: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}${path}`, {
          params,
          headers: { 'X-Auth-Token': this.token },
          timeout: 10_000,
        }),
      );
      return data;
    } catch (err: any) {
      this.logger.error(`Provider request failed: ${path} — ${err?.message}`);
      throw err;
    }
  }

  async getStandings(leagueId: number): Promise<ProviderStandingRow[]> {
    const data = await this.get(`/competitions/${this.code(leagueId)}/standings`);
    const groups = data?.standings ?? [];
    const total = groups.find((g: any) => g?.type === 'TOTAL') ?? groups[0];
    return (total?.table ?? []).map(FootballDataMapper.standingRow);
  }

  async getTeams(leagueId: number): Promise<ProviderTeam[]> {
    const data = await this.get(`/competitions/${this.code(leagueId)}/teams`);
    return (data?.teams ?? []).map(FootballDataMapper.team);
  }

  async getTopScorers(leagueId: number): Promise<ProviderPlayer[]> {
    const data = await this.get(`/competitions/${this.code(leagueId)}/scorers`, { limit: 25 });
    return (data?.scorers ?? []).map(FootballDataMapper.player);
  }

  async getFixtures(leagueId: number): Promise<ProviderFixture[]> {
    const data = await this.get(`/competitions/${this.code(leagueId)}/matches`);
    return (data?.matches ?? []).map((m: any) => FootballDataMapper.fixture(m, leagueId));
  }

  async getLiveFixtures(leagueIds?: number[]): Promise<ProviderFixture[]> {
    const data = await this.get(`/matches`, { status: 'IN_PLAY' });
    const mapped: ProviderFixture[] = (data?.matches ?? []).map((m: any) =>
      FootballDataMapper.fixture(m, CODE_TO_ID[m?.competition?.code] ?? m?.competition?.id),
    );
    return leagueIds && leagueIds.length
      ? mapped.filter((f) => leagueIds.includes(f.leagueExternalId))
      : mapped;
  }

  async getFixtureAnalysis(fixtureId: number): Promise<ProviderFixtureAnalysis> {
    const m = await this.get(`/matches/${fixtureId}`);
    const events = [
      ...(m?.goals ?? []).map(FootballDataMapper.goalEvent),
      ...(m?.bookings ?? []).map(FootballDataMapper.cardEvent),
      ...(m?.substitutions ?? []).map(FootballDataMapper.subEvent),
    ].sort((a, b) => a.minute - b.minute);
    return {
      fixture: FootballDataMapper.fixture(m, CODE_TO_ID[m?.competition?.code]),
      events,
      lineups: [], // no disponible en el plan free
      statistics: [], // no disponible en el plan free
    };
  }
}

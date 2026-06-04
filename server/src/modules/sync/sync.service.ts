import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  FOOTBALL_PROVIDER,
  IFootballProvider,
} from '../../providers/football-provider.interface';
import { FixturesService } from '../fixtures/fixtures.service';
import { LeaguesService } from '../leagues/leagues.service';
import { PlayersService } from '../players/players.service';

/**
 * ETL programado: mantiene PostgreSQL como sistema de registro sincronizado con
 * el proveedor, desacoplando la app del rate-limit del plan gratuito.
 * Frecuencias conservadoras para no agotar la cuota (ajustables por entorno).
 */
@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private readonly leagueIds: number[];
  private readonly season: number;
  private readonly enabled: boolean;

  constructor(
    private readonly leagues: LeaguesService,
    private readonly players: PlayersService,
    private readonly fixtures: FixturesService,
    @Inject(FOOTBALL_PROVIDER) private readonly provider: IFootballProvider,
    config: ConfigService,
  ) {
    this.leagueIds = config.get<number[]>('provider.leagueIds') ?? [];
    this.season = config.get<number>('provider.defaultSeason')!;
    // Activa la sincronización según el proveedor configurado y su credencial.
    const providerName = config.get<string>('provider.name');
    this.enabled =
      providerName === 'footballdata'
        ? !!config.get<string>('provider.fdToken')
        : !!config.get<string>('provider.apiKey');
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Sin APIFOOTBALL_KEY: la sincronización queda inactiva (modo demo).');
      return;
    }
    this.logger.log('Sincronización inicial de competiciones…');
    await this.syncStandings();
    await this.syncScorers();
    await this.syncFixtures();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncStandings(): Promise<void> {
    if (!this.enabled) return;
    for (const id of this.leagueIds) {
      await this.leagues.refreshStandings(id, this.season);
    }
    this.logger.log(`Standings sincronizadas (${this.leagueIds.length} ligas).`);
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncScorers(): Promise<void> {
    if (!this.enabled) return;
    for (const id of this.leagueIds) {
      await this.players.refreshTopScorers(id, this.season);
    }
    this.logger.log('Goleadores sincronizados.');
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async syncFixtures(): Promise<void> {
    if (!this.enabled) return;
    for (const id of this.leagueIds) {
      try {
        const fx = await this.provider.getFixtures(id, this.season);
        await this.fixtures.upsertFromProvider(this.season, fx);
      } catch (err: any) {
        this.logger.warn(`syncFixtures(${id}) failed: ${err?.message}`);
      }
    }
    this.logger.log('Calendario sincronizado.');
  }
}

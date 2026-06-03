import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ProviderFixture,
} from '../../providers/football-provider.interface';
import { Fixture } from './entities/fixture.entity';

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);
  private readonly defaultSeason: number;

  constructor(
    @InjectRepository(Fixture) private readonly repo: Repository<Fixture>,
    config: ConfigService,
  ) {
    this.defaultSeason = config.get<number>('provider.defaultSeason')!;
  }

  findByLeague(leagueId: number, season?: number): Promise<Fixture[]> {
    return this.repo.find({
      where: { leagueExternalId: leagueId, season: season ?? this.defaultSeason },
      order: { utcDate: 'ASC' },
    });
  }

  findOne(externalId: number): Promise<Fixture | null> {
    return this.repo.findOne({ where: { externalId } });
  }

  findLiveStored(): Promise<Fixture[]> {
    return this.repo.find({
      where: { status: In(['1H', 'HT', '2H', 'ET', 'P', 'LIVE']) },
      order: { utcDate: 'ASC' },
    });
  }

  /** Upsert idempotente desde el proveedor (usado por sync y por el poller en vivo). */
  async upsertFromProvider(season: number, fixtures: ProviderFixture[]): Promise<void> {
    if (!fixtures.length) return;
    const rows: Partial<Fixture>[] = fixtures.map((f) => ({
      externalId: f.externalId,
      leagueExternalId: f.leagueExternalId,
      season,
      utcDate: new Date(f.utcDate),
      status: f.status,
      elapsed: f.elapsed ?? undefined,
      round: f.round ?? undefined,
      homeTeamExternalId: f.home.externalId,
      awayTeamExternalId: f.away.externalId,
      homeName: f.home.name,
      awayName: f.away.name,
      homeLogo: f.home.logo ?? undefined,
      awayLogo: f.away.logo ?? undefined,
      homeGoals: f.homeGoals ?? undefined,
      awayGoals: f.awayGoals ?? undefined,
    }));
    await this.repo.upsert(rows, ['externalId']);
  }
}

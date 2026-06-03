import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BehaviorSubject, map, Observable } from 'rxjs';
import {
  FOOTBALL_PROVIDER,
  IFootballProvider,
  ProviderFixture,
} from '../../providers/football-provider.interface';
import { FixturesService } from '../fixtures/fixtures.service';

export interface LivePayload {
  at: string;
  count: number;
  fixtures: ProviderFixture[];
}

/**
 * Empuje en tiempo real: hace polling al proveedor cada N segundos, persiste y
 * difunde el snapshot a todos los clientes SSE. Un único poller alimenta a N
 * suscriptores (no se multiplica el consumo del rate-limit del proveedor).
 */
@Injectable()
export class LiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveService.name);
  private readonly subject = new BehaviorSubject<LivePayload>({
    at: new Date().toISOString(),
    count: 0,
    fixtures: [],
  });
  private timer?: NodeJS.Timeout;
  private readonly intervalMs: number;
  private readonly leagueIds: number[];
  private readonly season: number;

  constructor(
    @Inject(FOOTBALL_PROVIDER) private readonly provider: IFootballProvider,
    private readonly fixtures: FixturesService,
    config: ConfigService,
  ) {
    this.intervalMs = (config.get<number>('provider.livePollSeconds') ?? 20) * 1000;
    this.leagueIds = config.get<number[]>('provider.leagueIds') ?? [];
    this.season = config.get<number>('provider.defaultSeason')!;
  }

  onModuleInit(): void {
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    try {
      const fixtures = await this.provider.getLiveFixtures(this.leagueIds);
      await this.fixtures.upsertFromProvider(this.season, fixtures);
      this.subject.next({
        at: new Date().toISOString(),
        count: fixtures.length,
        fixtures,
      });
    } catch (err: any) {
      this.logger.warn(`Live poll failed: ${err?.message}`);
    }
  }

  snapshot(): LivePayload {
    return this.subject.value;
  }

  /** Flujo SSE: cada cliente recibe el último snapshot y las siguientes actualizaciones. */
  stream(): Observable<{ data: LivePayload }> {
    return this.subject.asObservable().pipe(map((payload) => ({ data: payload })));
  }
}

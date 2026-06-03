import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  FOOTBALL_PROVIDER,
  IFootballProvider,
  ProviderEvent,
  ProviderFixtureAnalysis,
} from '../../providers/football-provider.interface';

export interface MatchAnalysis {
  fixture: ProviderFixtureAnalysis['fixture'];
  events: ProviderEvent[];
  lineups: ProviderFixtureAnalysis['lineups'];
  statistics: ProviderFixtureAnalysis['statistics'];
  derived: {
    goalsTimeline: { minute: number; home: number; away: number }[];
    momentum: { minute: number; value: number }[]; // + favorece local, - visitante
    shots: { home: number; away: number };
    possession: { home: number | null; away: number | null };
    xg: { home: number | null; away: number | null };
    cards: { home: number; away: number };
  };
}

/**
 * Servicio de análisis de partido: orquesta los datos del proveedor y deriva
 * métricas (timeline de goles, momentum, posesión, tiros, xG, tarjetas).
 */
@Injectable()
export class AnalysisService {
  constructor(
    @Inject(FOOTBALL_PROVIDER) private readonly provider: IFootballProvider,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getMatchAnalysis(fixtureId: number): Promise<MatchAnalysis> {
    const key = `analysis:${fixtureId}`;
    const cached = await this.cache.get<MatchAnalysis>(key);
    if (cached) return cached;

    const raw = await this.provider.getFixtureAnalysis(fixtureId);
    const analysis = this.derive(raw);

    // Live: TTL corto; finalizado: TTL largo.
    const ttl = ['FT', 'AET', 'PEN'].includes(raw.fixture?.status) ? 3600 : 30;
    await this.cache.set(key, analysis, ttl * 1000);
    return analysis;
  }

  private statNumber(stats: Record<string, any>, keys: string[]): number | null {
    for (const k of keys) {
      const v = stats?.[k];
      if (v == null) continue;
      const n = typeof v === 'string' ? parseFloat(v.replace('%', '')) : Number(v);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }

  private derive(raw: ProviderFixtureAnalysis): MatchAnalysis {
    const homeId = raw.fixture?.home?.externalId;
    const awayId = raw.fixture?.away?.externalId;
    const statOf = (teamId?: number) =>
      raw.statistics.find((s) => s.teamExternalId === teamId)?.stats ?? {};
    const hs = statOf(homeId);
    const as = statOf(awayId);

    // Timeline de goles a partir de eventos
    const goalsTimeline: { minute: number; home: number; away: number }[] = [];
    let h = 0;
    let a = 0;
    for (const e of [...raw.events].sort((x, y) => x.minute - y.minute)) {
      if (e.type?.toLowerCase() === 'goal') {
        if (e.teamExternalId === homeId) h++;
        else if (e.teamExternalId === awayId) a++;
        goalsTimeline.push({ minute: e.minute, home: h, away: a });
      }
    }

    // Momentum simple: peso por tipo de evento, acumulado por minuto
    const weight = (e: ProviderEvent) =>
      e.type?.toLowerCase() === 'goal' ? 3 : e.detail?.toLowerCase().includes('shot') ? 1 : 0.4;
    const momentum: { minute: number; value: number }[] = [];
    let m = 0;
    for (const e of [...raw.events].sort((x, y) => x.minute - y.minute)) {
      const sign = e.teamExternalId === homeId ? 1 : -1;
      m += sign * weight(e);
      momentum.push({ minute: e.minute, value: +m.toFixed(2) });
    }

    const countCards = (teamId?: number) =>
      raw.events.filter(
        (e) => e.teamExternalId === teamId && e.type?.toLowerCase() === 'card',
      ).length;

    return {
      fixture: raw.fixture,
      events: raw.events,
      lineups: raw.lineups,
      statistics: raw.statistics,
      derived: {
        goalsTimeline,
        momentum,
        shots: {
          home: this.statNumber(hs, ['Total Shots', 'Shots total']) ?? 0,
          away: this.statNumber(as, ['Total Shots', 'Shots total']) ?? 0,
        },
        possession: {
          home: this.statNumber(hs, ['Ball Possession']),
          away: this.statNumber(as, ['Ball Possession']),
        },
        xg: {
          home: this.statNumber(hs, ['expected_goals', 'Expected Goals']),
          away: this.statNumber(as, ['expected_goals', 'Expected Goals']),
        },
        cards: { home: countCards(homeId), away: countCards(awayId) },
      },
    };
  }
}

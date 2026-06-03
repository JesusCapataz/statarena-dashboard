import {
  ProviderEvent,
  ProviderFixture,
  ProviderLineup,
  ProviderPlayer,
  ProviderStandingRow,
  ProviderTeam,
  ProviderTeamMatchStats,
} from '../football-provider.interface';

/**
 * Traduce el JSON crudo de API-Football al shape interno (anticorruption layer).
 * Aísla al resto del sistema de los cambios del proveedor.
 */
export class ApiFootballMapper {
  static team(raw: any): ProviderTeam {
    return {
      externalId: raw?.id,
      name: raw?.name,
      code: raw?.code ?? null,
      logo: raw?.logo ?? null,
      country: raw?.country ?? null,
      founded: raw?.founded ?? null,
      venue: raw?.venue?.name ?? null,
    };
  }

  static standingRow(raw: any): ProviderStandingRow {
    return {
      rank: raw?.rank,
      team: ApiFootballMapper.team(raw?.team),
      points: raw?.points ?? 0,
      played: raw?.all?.played ?? 0,
      win: raw?.all?.win ?? 0,
      draw: raw?.all?.draw ?? 0,
      lose: raw?.all?.lose ?? 0,
      goalsFor: raw?.all?.goals?.for ?? 0,
      goalsAgainst: raw?.all?.goals?.against ?? 0,
      form: raw?.form ?? null,
    };
  }

  static player(raw: any): ProviderPlayer {
    const p = raw?.player ?? {};
    const s = (raw?.statistics && raw.statistics[0]) || {};
    return {
      externalId: p?.id,
      name: p?.name,
      firstName: p?.firstname ?? null,
      lastName: p?.lastname ?? null,
      age: p?.age ?? null,
      nationality: p?.nationality ?? null,
      photo: p?.photo ?? null,
      position: s?.games?.position ?? null,
      teamExternalId: s?.team?.id ?? null,
      goals: s?.goals?.total ?? 0,
      assists: s?.goals?.assists ?? 0,
      appearances: s?.games?.appearences ?? 0,
      rating: s?.games?.rating ? Number(s.games.rating) : null,
    };
  }

  static fixture(raw: any): ProviderFixture {
    const f = raw?.fixture ?? {};
    const t = raw?.teams ?? {};
    const g = raw?.goals ?? {};
    return {
      externalId: f?.id,
      utcDate: f?.date,
      status: f?.status?.short ?? 'NS',
      elapsed: f?.status?.elapsed ?? null,
      leagueExternalId: raw?.league?.id,
      round: raw?.league?.round ?? null,
      home: ApiFootballMapper.team(t?.home),
      away: ApiFootballMapper.team(t?.away),
      homeGoals: g?.home ?? null,
      awayGoals: g?.away ?? null,
    };
  }

  static event(raw: any): ProviderEvent {
    return {
      minute: raw?.time?.elapsed ?? 0,
      type: raw?.type ?? 'event',
      detail: raw?.detail ?? null,
      teamExternalId: raw?.team?.id,
      player: raw?.player?.name ?? null,
      assist: raw?.assist?.name ?? null,
    };
  }

  static lineup(raw: any): ProviderLineup {
    const map = (x: any) => ({
      name: x?.player?.name,
      number: x?.player?.number ?? null,
      pos: x?.player?.pos ?? null,
      grid: x?.player?.grid ?? null,
    });
    return {
      teamExternalId: raw?.team?.id,
      formation: raw?.formation ?? null,
      startXI: (raw?.startXI ?? []).map(map),
      substitutes: (raw?.substitutes ?? []).map(map),
    };
  }

  static statistics(raw: any): ProviderTeamMatchStats {
    const stats: Record<string, number | string | null> = {};
    for (const item of raw?.statistics ?? []) {
      stats[item?.type] = item?.value ?? null;
    }
    return { teamExternalId: raw?.team?.id, stats };
  }
}

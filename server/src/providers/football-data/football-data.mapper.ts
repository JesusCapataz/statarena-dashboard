import {
  ProviderEvent,
  ProviderFixture,
  ProviderPlayer,
  ProviderStandingRow,
  ProviderTeam,
} from '../football-provider.interface';

/**
 * Traduce el JSON de football-data.org (v4) al shape interno.
 * Capa anticorrupción: aísla al sistema de la forma del proveedor.
 */
export class FootballDataMapper {
  static team(raw: any): ProviderTeam {
    return {
      externalId: raw?.id,
      name: raw?.name ?? raw?.shortName ?? 'Unknown',
      code: raw?.tla ?? null,
      logo: raw?.crest ?? null,
      country: raw?.area?.name ?? null,
      founded: raw?.founded ?? null,
      venue: raw?.venue ?? null,
    };
  }

  static standingRow(raw: any): ProviderStandingRow {
    return {
      rank: raw?.position,
      team: FootballDataMapper.team(raw?.team),
      points: raw?.points ?? 0,
      played: raw?.playedGames ?? 0,
      win: raw?.won ?? 0,
      draw: raw?.draw ?? 0,
      lose: raw?.lost ?? 0,
      goalsFor: raw?.goalsFor ?? 0,
      goalsAgainst: raw?.goalsAgainst ?? 0,
      form: raw?.form ?? null,
    };
  }

  static player(raw: any): ProviderPlayer {
    const p = raw?.player ?? {};
    return {
      externalId: p?.id,
      name: p?.name,
      firstName: p?.firstName ?? null,
      lastName: p?.lastName ?? null,
      age: null,
      nationality: p?.nationality ?? null,
      photo: null, // football-data no expone foto del jugador en el plan free
      position: p?.position ?? p?.section ?? null,
      teamExternalId: raw?.team?.id ?? null,
      goals: raw?.goals ?? 0,
      assists: raw?.assists ?? 0,
      appearances: raw?.playedMatches ?? 0,
      rating: null,
    };
  }

  static fixture(raw: any, leagueExternalId?: number): ProviderFixture {
    const t = raw ?? {};
    return {
      externalId: t?.id,
      utcDate: t?.utcDate,
      status: t?.status ?? 'SCHEDULED',
      elapsed: t?.minute ?? null,
      leagueExternalId: leagueExternalId ?? t?.competition?.id ?? 0,
      round: t?.matchday != null ? `Jornada ${t.matchday}` : null,
      home: FootballDataMapper.team(t?.homeTeam),
      away: FootballDataMapper.team(t?.awayTeam),
      homeGoals: t?.score?.fullTime?.home ?? null,
      awayGoals: t?.score?.fullTime?.away ?? null,
    };
  }

  static goalEvent(raw: any): ProviderEvent {
    return {
      minute: raw?.minute ?? 0,
      type: 'Goal',
      detail: raw?.type ?? null,
      teamExternalId: raw?.team?.id,
      player: raw?.scorer?.name ?? null,
      assist: raw?.assist?.name ?? null,
    };
  }

  static cardEvent(raw: any): ProviderEvent {
    return {
      minute: raw?.minute ?? 0,
      type: 'Card',
      detail: raw?.card ?? null,
      teamExternalId: raw?.team?.id,
      player: raw?.player?.name ?? null,
      assist: null,
    };
  }

  static subEvent(raw: any): ProviderEvent {
    return {
      minute: raw?.minute ?? 0,
      type: 'subst',
      detail: null,
      teamExternalId: raw?.team?.id,
      player: raw?.playerIn?.name ?? null,
      assist: raw?.playerOut?.name ?? null,
    };
  }
}

/**
 * Contrato del proveedor de datos de fútbol (puerto, patrón Adapter + DIP).
 * La app depende de esta abstracción, no de un proveedor concreto, de modo que
 * cambiar API-Football por Sportmonks/Opta no afecta a services ni controllers.
 */
export const FOOTBALL_PROVIDER = Symbol('FOOTBALL_PROVIDER');

export interface ProviderTeam {
  externalId: number;
  name: string;
  code: string | null;
  logo: string | null;
  country: string | null;
  founded: number | null;
  venue: string | null;
}

export interface ProviderStandingRow {
  rank: number;
  team: ProviderTeam;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string | null;
}

export interface ProviderPlayer {
  externalId: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  nationality: string | null;
  photo: string | null;
  position: string | null;
  teamExternalId: number | null;
  goals: number;
  assists: number;
  appearances: number;
  rating: number | null;
}

export interface ProviderFixture {
  externalId: number;
  utcDate: string;
  status: string; // NS, 1H, HT, 2H, FT, LIVE...
  elapsed: number | null;
  leagueExternalId: number;
  round: string | null;
  home: ProviderTeam;
  away: ProviderTeam;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface ProviderEvent {
  minute: number;
  type: string; // Goal, Card, subst
  detail: string | null;
  teamExternalId: number;
  player: string | null;
  assist: string | null;
}

export interface ProviderLineupPlayer {
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null; // "row:col"
}

export interface ProviderLineup {
  teamExternalId: number;
  formation: string | null;
  startXI: ProviderLineupPlayer[];
  substitutes: ProviderLineupPlayer[];
}

export interface ProviderTeamMatchStats {
  teamExternalId: number;
  stats: Record<string, number | string | null>; // posesión, tiros, xG...
}

export interface ProviderFixtureAnalysis {
  fixture: ProviderFixture;
  events: ProviderEvent[];
  lineups: ProviderLineup[];
  statistics: ProviderTeamMatchStats[];
}

export interface IFootballProvider {
  getStandings(leagueId: number, season: number): Promise<ProviderStandingRow[]>;
  getTeams(leagueId: number, season: number): Promise<ProviderTeam[]>;
  getTopScorers(leagueId: number, season: number): Promise<ProviderPlayer[]>;
  getFixtures(leagueId: number, season: number, opts?: { from?: string; to?: string }): Promise<ProviderFixture[]>;
  getLiveFixtures(leagueIds?: number[]): Promise<ProviderFixture[]>;
  getFixtureAnalysis(fixtureId: number): Promise<ProviderFixtureAnalysis>;
}

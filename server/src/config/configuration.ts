/**
 * Configuración tipada de la aplicación.
 * Los valores provienen de variables de entorno (validadas en env.validation.ts).
 */
export interface AppConfig {
  env: string;
  port: number;
  corsOrigins: string[];
  db: {
    host: string; port: number; user: string; password: string;
    name: string; synchronize: boolean;
  };
  redis: { host: string; port: number; ttl: number };
  jwt: { secret: string; expiresIn: string };
  provider: {
    name: string;
    baseUrl: string;
    apiKey: string;
    defaultSeason: number;
    leagueIds: number[];
    livePollSeconds: number;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8080')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'statarena',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'statarena',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    ttl: parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'insecure-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  provider: {
    name: process.env.PROVIDER ?? 'apifootball',
    baseUrl: process.env.APIFOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io',
    apiKey: process.env.APIFOOTBALL_KEY ?? '',
    defaultSeason: parseInt(process.env.DEFAULT_SEASON ?? '2024', 10),
    leagueIds: (process.env.SYNC_LEAGUE_IDS ?? '140,39,135,78')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n)),
    livePollSeconds: parseInt(process.env.LIVE_POLL_SECONDS ?? '20', 10),
  },
});

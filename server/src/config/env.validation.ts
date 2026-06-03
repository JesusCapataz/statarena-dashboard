import * as Joi from 'joi';

/**
 * Esquema de validación de variables de entorno.
 * La app no arranca si la configuración es inválida (fail-fast).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  CORS_ORIGINS: Joi.string().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  CACHE_TTL_SECONDS: Joi.number().default(60),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  PROVIDER: Joi.string().default('apifootball'),
  APIFOOTBALL_BASE_URL: Joi.string().uri().default('https://v3.football.api-sports.io'),
  APIFOOTBALL_KEY: Joi.string().allow('').default(''),
  DEFAULT_SEASON: Joi.number().default(2024),
  SYNC_LEAGUE_IDS: Joi.string().default('140,39,135,78'),
  LIVE_POLL_SECONDS: Joi.number().min(10).default(20),
});

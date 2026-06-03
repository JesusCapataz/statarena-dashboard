import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FOOTBALL_PROVIDER } from './football-provider.interface';
import { ApiFootballProvider } from './api-football/api-football.provider';

/**
 * Enlaza el puerto FOOTBALL_PROVIDER con el adapter concreto.
 * Para cambiar de proveedor, basta sustituir `useClass` aquí.
 */
@Module({
  imports: [HttpModule.register({ timeout: 10_000, maxRedirects: 2 })],
  providers: [{ provide: FOOTBALL_PROVIDER, useClass: ApiFootballProvider }],
  exports: [FOOTBALL_PROVIDER],
})
export class ProvidersModule {}

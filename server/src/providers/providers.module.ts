import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FOOTBALL_PROVIDER } from './football-provider.interface';
import { ApiFootballProvider } from './api-football/api-football.provider';
import { FootballDataProvider } from './football-data/football-data.provider';

/**
 * Enlaza el puerto FOOTBALL_PROVIDER con el adapter elegido por configuración:
 *   PROVIDER=apifootball  -> API-Football (fotos reales, temporadas 2021-2023 en free)
 *   PROVIDER=footballdata -> football-data.org (temporada ACTUAL en free)
 * Cambiar de proveedor no afecta a services ni controllers (DIP).
 */
@Module({
  imports: [HttpModule.register({ timeout: 10_000, maxRedirects: 2 }), ConfigModule],
  providers: [
    {
      provide: FOOTBALL_PROVIDER,
      inject: [HttpService, ConfigService],
      useFactory: (http: HttpService, config: ConfigService) => {
        const name = config.get<string>('provider.name');
        return name === 'footballdata'
          ? new FootballDataProvider(http, config)
          : new ApiFootballProvider(http, config);
      },
    },
  ],
  exports: [FOOTBALL_PROVIDER],
})
export class ProvidersModule {}

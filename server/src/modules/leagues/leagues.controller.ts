import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LeaguesService } from './leagues.service';

@ApiTags('leagues')
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Get()
  @ApiOperation({ summary: 'Competiciones configuradas y temporada por defecto' })
  list() {
    return {
      defaultSeason: this.leagues.getDefaultSeason(),
      leagueIds: this.leagues.getConfiguredLeagueIds(),
    };
  }

  @Get(':id/standings')
  @ApiOperation({ summary: 'Clasificación de una liga (cache → DB → proveedor)' })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  standings(
    @Param('id', ParseIntPipe) id: number,
    @Query('season') season?: string,
  ) {
    return this.leagues.getStandings(id, season ? parseInt(season, 10) : undefined);
  }
}

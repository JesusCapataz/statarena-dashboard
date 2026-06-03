import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FixturesService } from './fixtures.service';

@ApiTags('fixtures')
@Controller()
export class FixturesController {
  constructor(private readonly fixtures: FixturesService) {}

  @Get('leagues/:id/fixtures')
  @ApiOperation({ summary: 'Partidos de una liga/temporada' })
  byLeague(
    @Param('id', ParseIntPipe) id: number,
    @Query('season') season?: string,
  ) {
    return this.fixtures.findByLeague(id, season ? parseInt(season, 10) : undefined);
  }

  @Get('fixtures/:externalId')
  @ApiOperation({ summary: 'Detalle de un partido' })
  one(@Param('externalId', ParseIntPipe) externalId: number) {
    return this.fixtures.findOne(externalId);
  }
}

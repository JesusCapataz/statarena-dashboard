import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service';

@ApiTags('players')
@Controller()
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('leagues/:id/top-scorers')
  @ApiOperation({ summary: 'Máximos goleadores de una liga (incluye foto real)' })
  topScorers(
    @Param('id', ParseIntPipe) id: number,
    @Query('season') season?: string,
    @Query('limit') limit?: string,
  ) {
    return this.players.getTopScorers(
      id,
      season ? parseInt(season, 10) : undefined,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}

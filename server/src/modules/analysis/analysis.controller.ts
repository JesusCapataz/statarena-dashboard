import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Get('fixtures/:id')
  @ApiOperation({
    summary: 'Análisis completo de un partido: eventos, alineaciones, stats, xG y momentum',
  })
  match(@Param('id', ParseIntPipe) id: number) {
    return this.analysis.getMatchAnalysis(id);
  }
}

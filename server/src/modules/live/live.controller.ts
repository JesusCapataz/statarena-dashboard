import { Controller, Get, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { LiveService } from './live.service';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get('now')
  @ApiOperation({ summary: 'Snapshot actual de partidos en vivo' })
  now() {
    return this.live.snapshot();
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream SSE de marcadores en vivo (text/event-stream)' })
  stream(): Observable<{ data: unknown }> {
    return this.live.stream();
  }
}

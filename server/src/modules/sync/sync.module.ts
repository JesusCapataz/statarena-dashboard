import { Module } from '@nestjs/common';
import { ProvidersModule } from '../../providers/providers.module';
import { FixturesModule } from '../fixtures/fixtures.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { PlayersModule } from '../players/players.module';
import { SyncService } from './sync.service';

@Module({
  imports: [LeaguesModule, PlayersModule, FixturesModule, ProvidersModule],
  providers: [SyncService],
})
export class SyncModule {}

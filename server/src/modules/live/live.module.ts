import { Module } from '@nestjs/common';
import { ProvidersModule } from '../../providers/providers.module';
import { FixturesModule } from '../fixtures/fixtures.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [ProvidersModule, FixturesModule],
  controllers: [LiveController],
  providers: [LiveService],
})
export class LiveModule {}

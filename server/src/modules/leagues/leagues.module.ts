import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersModule } from '../../providers/providers.module';
import { League } from './entities/league.entity';
import { Standing } from './entities/standing.entity';
import { LeaguesController } from './leagues.controller';
import { LeaguesRepository } from './leagues.repository';
import { LeaguesService } from './leagues.service';

@Module({
  imports: [TypeOrmModule.forFeature([League, Standing]), ProvidersModule],
  controllers: [LeaguesController],
  providers: [LeaguesService, LeaguesRepository],
  exports: [LeaguesService],
})
export class LeaguesModule {}

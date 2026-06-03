import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';

@Module({
  imports: [TypeOrmModule.forFeature([Fixture])],
  controllers: [FixturesController],
  providers: [FixturesService],
  exports: [FixturesService],
})
export class FixturesModule {}

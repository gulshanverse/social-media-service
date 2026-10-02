import { Module } from '@nestjs/common';
import { GarbaController } from './garba.controller';
import { GarbaService } from './garba.service';

@Module({ controllers: [GarbaController], providers: [GarbaService] })
export class GarbaModule {}

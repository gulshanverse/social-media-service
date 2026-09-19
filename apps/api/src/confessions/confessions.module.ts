import { Module } from '@nestjs/common';
import { ConfessionsController } from './confessions.controller';
import { ConfessionsService } from './confessions.service';

@Module({ controllers: [ConfessionsController], providers: [ConfessionsService] })
export class ConfessionsModule {}

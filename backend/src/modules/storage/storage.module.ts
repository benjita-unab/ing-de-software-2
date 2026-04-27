import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, SupabaseConfigService],
})
export class StorageModule {}

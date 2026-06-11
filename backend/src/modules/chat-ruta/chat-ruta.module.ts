import { Module } from '@nestjs/common';
import { ChatRutaController } from './chat-ruta.controller';
import { ChatRutaService } from './chat-ruta.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [ChatRutaService, SupabaseConfigService],
  controllers: [ChatRutaController],
  exports: [ChatRutaService],
})
export class ChatRutaModule {}

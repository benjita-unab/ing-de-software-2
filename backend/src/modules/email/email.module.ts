import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ResendConfigService } from '../../config/resend.config';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [EmailService, ResendConfigService, SupabaseConfigService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}

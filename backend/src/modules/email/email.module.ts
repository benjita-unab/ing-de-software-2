import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ResendConfigService } from '../../config/resend.config';

@Module({
  providers: [EmailService, ResendConfigService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}

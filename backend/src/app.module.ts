import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SupabaseConfigService } from './config/supabase.config';
import { ResendConfigService } from './config/resend.config';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConductoresModule } from './modules/conductores/conductores.module';
import { RutasModule } from './modules/rutas/rutas.module';
import { EntregasModule } from './modules/entregas/entregas.module';
import { IncidenciasModule } from './modules/incidencias/incidencias.module';
import { EmailModule } from './modules/email/email.module';
import { StorageModule } from './modules/storage/storage.module';
import { TrazabilidadModule } from './modules/trazabilidad/trazabilidad.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.SUPABASE_PUBLIC_KEY,
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    ConductoresModule,
    RutasModule,
    EntregasModule,
    IncidenciasModule,
    EmailModule,
    StorageModule,
    TrazabilidadModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseConfigService, ResendConfigService, JwtStrategy],
  exports: [SupabaseConfigService, ResendConfigService],
})
export class AppModule {}

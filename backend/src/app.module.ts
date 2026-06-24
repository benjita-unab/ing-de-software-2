import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ClientesModule } from './modules/clientes/clientes.module';
import { CamionesModule } from './modules/camiones/camiones.module';
import { MensajesConductorModule } from './modules/mensajes-conductor/mensajes-conductor.module';
import { PortalModule } from './modules/portal/portal.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ConfiguracionPagosModule } from './modules/configuracion-pagos/configuracion-pagos.module';
import { ChatRutaModule } from './modules/chat-ruta/chat-ruta.module';
import { PagosClienteModule } from './modules/pagos-cliente/pagos-cliente.module';
import { RutasPlantillaModule } from './modules/rutas-plantilla/rutas-plantilla.module';
import { RecurrenciasModule } from './modules/recurrencias/recurrencias.module';
import { CostosOperativosModule } from './modules/costos-operativos/costos-operativos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    AuthModule,
    ConductoresModule,
    RutasModule,
    EntregasModule,
    IncidenciasModule,
    EmailModule,
    StorageModule,
    TrazabilidadModule,
    ClientesModule,
    CamionesModule,
    MensajesConductorModule,
    PortalModule,
    DashboardModule,
    ConfiguracionPagosModule,
    ChatRutaModule,
    PagosClienteModule,
    RutasPlantillaModule,
    RecurrenciasModule,
    CostosOperativosModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseConfigService, ResendConfigService, JwtStrategy],
  exports: [SupabaseConfigService, ResendConfigService],
})
export class AppModule {}

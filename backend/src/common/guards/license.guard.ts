import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConductoresService } from '../../modules/conductores/conductores.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private conductoresService: ConductoresService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si el usuario no es conductor, el guard permite el paso
    if (!user || user.role !== 'CONDUCTOR') {
      return true;
    }

    const conductorId = user.conductorId;
    if (!conductorId) {
      throw new ForbiddenException(
        'Tu usuario no está vinculado a un conductor.',
      );
    }

    const validation = await this.conductoresService.validateDriverLicense(
      conductorId,
    );

    // Permite pasar si es válida o si está próxima a vencer
    if (!validation.isValid && validation.status !== 'EXPIRING_SOON') {
      throw new ForbiddenException(
        `Acceso bloqueado: ${validation.message}. Debes regularizar tu licencia de conducir.`,
      );
    }

    return true;
  }
}

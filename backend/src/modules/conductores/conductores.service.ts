import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

@Injectable()
export class ConductoresService {
  private readonly ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(private supabaseConfig: SupabaseConfigService) {}

  /**
   * Valida si la licencia de un conductor es vigente
   * @param conductorId - ID del conductor
   * @returns Objeto con estado de validación
   */
  async validateDriverLicense(conductorId: string) {
    if (!conductorId) {
      throw new BadRequestException('ID del conductor es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    // Consultar datos del conductor
    const { data: conductor, error } = await supabase
      .from('conductores')
      .select('id, usuario_id, rut, licencia_numero, licencia_vencimiento, activo')
      .eq('id', conductorId)
      .single();

    if (error) {
      throw new NotFoundException(`Conductor no encontrado: ${error.message}`);
    }

    if (!conductor) {
      throw new NotFoundException('Conductor no encontrado');
    }

    // Validar que el conductor esté activo
    if (!conductor.activo) {
      return {
        isValid: false,
        status: 'INACTIVE',
        message: 'El conductor no está activo en el sistema',
      };
    }

    // Check latest license in driver_licenses
    const { data: licenses } = await supabase
      .from('driver_licenses')
      .select('status, expiry_date, id')
      .eq('user_id', conductor.usuario_id)
      .order('uploaded_at', { ascending: false })
      .limit(1);

    const latestLicense = licenses?.[0];

    if (!latestLicense) {
      return {
        isValid: false,
        status: 'NO_LICENSE',
        message: 'El conductor no tiene licencia registrada',
      };
    }

    if (latestLicense.status === 'pending_review') {
      return {
        isValid: false,
        status: 'PENDING',
        message: 'La licencia está en revisión por un operador',
      };
    }

    if (latestLicense.status === 'rejected') {
      return {
        isValid: false,
        status: 'REJECTED',
        message: 'La licencia fue rechazada, por favor sube una nueva',
      };
    }

    // Validar que tenga fecha de vencimiento (ya aprobada o migrada antigua)
    const fechaAVerificar = latestLicense.expiry_date || conductor.licencia_vencimiento;
    if (!fechaAVerificar) {
      return {
        isValid: false,
        status: 'NO_LICENSE',
        message: 'El conductor no tiene fecha de vencimiento registrada',
      };
    }

    // Comparar fecha de vencimiento con fecha actual
    const fechaVencimiento = new Date(fechaAVerificar);
    const hoy = new Date();

    fechaVencimiento.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    if (hoy > fechaVencimiento) {
      return {
        isValid: false,
        status: 'EXPIRED',
        message: 'La licencia del conductor se encuentra vencida',
        expiryDate: fechaAVerificar,
      };
    }

    // Verificar si está próxima a vencer (30 días)
    const diasParaVencer = Math.floor(
      (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diasParaVencer < 30) {
      return {
        isValid: true,
        status: 'EXPIRING_SOON',
        message: `Licencia vigente pero vence en ${diasParaVencer} días`,
        expiryDate: fechaAVerificar,
        daysUntilExpiry: diasParaVencer,
      };
    }

    return {
      isValid: true,
      status: 'VALID',
      message: 'Licencia vigente',
      expiryDate: fechaAVerificar,
      daysUntilExpiry: diasParaVencer,
    };
  }

  /**
   * Sube una licencia de conducir al storage y registra en la BD.
   * Tras guardar en driver_licenses, sincroniza conductores.licencia_vencimiento.
   * @param userId - ID del usuario autenticado (JWT)
   * @param file - Archivo subido
   * @param expiryDate - Fecha de vencimiento (YYYY-MM-DD)
   * @param conductorId - ID del conductor objetivo (RRHH); si no se envía, se infiere por usuario_id
   */
  async uploadDriverLicense(
    userId: string,
    file: Express.Multer.File,
    expiryDate: string,
    conductorId?: string,
  ) {
    if (!userId || !file || !expiryDate) {
      throw new BadRequestException('userId, file y expiryDate son requeridos');
    }

    this.validateFile(file);
    this.validateExpiryDate(expiryDate);

    const { targetUsuarioId, targetConductorId } = await this.resolveLicenseTarget(
      userId,
      conductorId,
    );

    const supabase = this.supabaseConfig.getClient();
    const bucket = process.env.SUPABASE_DRIVER_LICENSES_BUCKET || 'driver_licenses';

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = `licenses/${targetUsuarioId}/${fileName}`;

    if (!file.buffer) {
      throw new BadRequestException('El archivo no se cargó correctamente en memoria');
    }

    try {
      // 1. Subir archivo a Supabase Storage
      await this.supabaseConfig.uploadFile(
        bucket,
        filePath,
        file.buffer,
        file.mimetype,
      );

      // 2. Obtener URL pública
      const publicUrl = this.supabaseConfig.getPublicUrl(bucket, filePath);

      // 3. Guardar registro en driver_licenses
      const { data: licenseRecord, error: insertError } = await supabase
        .from('driver_licenses')
        .insert([
          {
            user_id: targetUsuarioId,
            file_url: publicUrl,
            file_name: file.originalname,
            expiry_date: expiryDate,
            uploaded_at: new Date().toISOString(),
            status: 'pending_review',
          },
        ])
        .select();

      if (insertError) {
        throw new BadRequestException(`Error al guardar registro: ${insertError.message}`);
      }

      await this.syncLicenciaVencimiento(targetConductorId, expiryDate);

      return {
        success: true,
        message: 'Licencia subida exitosamente',
        data: {
          licenseId: licenseRecord?.[0]?.id,
          conductorId: targetConductorId,
          fileUrl: publicUrl,
          status: 'pending_review',
          expiryDate,
          licenciaVencimiento: expiryDate,
        },
      };
    } catch (error) {
      try {
        await this.supabaseConfig.deleteFile(bucket, filePath);
      } catch {
        // Ignorar errores de limpieza para no enmascarar el error original
      }
      throw error;
    }
  }

  /**
   * Obtiene información del conductor y estado de su licencia
   */
  async getDriverInfo(conductorId: string) {
    if (!conductorId) {
      throw new BadRequestException('ID del conductor es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: conductor, error } = await supabase
      .from('conductores')
      .select(`
        id,
        usuario_id,
        rut,
        licencia_numero,
        licencia_vencimiento,
        telefono,
        activo
      `)
      .eq('id', conductorId)
      .single();

    if (error) {
      throw new NotFoundException(`Conductor no encontrado: ${error.message}`);
    }

    // Obtener licencias del conductor
    const { data: licenses } = await supabase
      .from('driver_licenses')
      .select('*')
      .eq('user_id', conductor.usuario_id)
      .order('uploaded_at', { ascending: false });

    return {
      conductor,
      licenses: licenses || [],
      licenseStatus: await this.validateDriverLicense(conductorId),
    };
  }

  /**
   * Lista conductores activos
   */
  async listActiveDrivers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    orden?: string;
  }) {
    const supabase = this.supabaseConfig.getClient();

    let query = supabase
      .from('conductores')
      .select(
        `
        id,
        rut,
        nombre,
        camion_id,
        licencia_numero,
        licencia_vencimiento,
        telefono,
        activo,
        usuarios(nombre)
      `,
        { count: 'exact' }
      )
      .eq('activo', true);

    if (params?.search) {
      const q = params.search.trim();
      const term = `%${q}%`;

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id')
        .ilike('nombre', term);
      const usuarioIds = usuarios?.map((u) => u.id) || [];

      const orParts = [
        `rut.ilike.${term}`,
        `nombre.ilike.${term}`,
        `telefono.ilike.${term}`,
        `licencia_numero.ilike.${term}`,
      ];
      if (usuarioIds.length > 0) {
        orParts.push(`usuario_id.in.(${usuarioIds.join(',')})`);
      }
      query = query.or(orParts.join(','));
    }

    if (params?.orden) {
      switch (params.orden) {
        case 'nombre-desc':
        case 'nombre-asc':
          // Supabase requiere un view o RPC para ordenar bien por relaciones. Fallback a created_at.
          query = query.order('created_at', { ascending: params.orden === 'nombre-asc' });
          break;
        case 'vencimiento-proximo':
          query = query.order('licencia_vencimiento', { ascending: true, nullsFirst: false });
          break;
        case 'vencimiento-lejano':
          query = query.order('licencia_vencimiento', { ascending: false, nullsFirst: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data: conductoresRaw, count, error } = await query;

    if (error) {
      throw new BadRequestException(`Error al obtener conductores: ${error.message}`);
    }

    // Enriquecer con estado de licencia
    const conductoresWithStatus = await Promise.all(
      (conductoresRaw || []).map(async (conductor: any) => {
        const nombre = Array.isArray(conductor.usuarios)
          ? conductor.usuarios[0]?.nombre
          : conductor.usuarios?.nombre;
        return {
          ...conductor,
          nombre,
          licenseStatus: await this.validateDriverLicense(conductor.id),
        };
      }),
    );

    if (params?.page && params?.limit) {
      return {
        data: conductoresWithStatus,
        meta: {
          total_items: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
          current_page: params.page,
          limit: params.limit,
        },
      };
    }

    return conductoresWithStatus;
  }


  async updateLicenseStatus(conductorId: string, licenseId: string, status: 'approved' | 'rejected') {
    const supabase = this.supabaseConfig.getClient();
    
    const { data: license, error } = await supabase
      .from('driver_licenses')
      .update({ status })
      .eq('id', licenseId)
      .select()
      .single();

    if (error || !license) {
      throw new BadRequestException(`Error al actualizar estado de la licencia: ${error?.message || ''}`);
    }

    if (status === 'approved' && license.expiry_date) {
      await this.syncLicenciaVencimiento(conductorId, license.expiry_date);
    }

    return {
      success: true,
      message: 'Licencia actualizada exitosamente',
      data: license,
    };
  }

  // ========== HELPERS PRIVADOS ==========

  /**
   * Asigna un camión a un conductor de forma exclusiva (1 a 1).
   */
  async asignarCamion(conductorId: string, camionId: string) {
    if (!conductorId || !camionId) {
      throw new BadRequestException('ID del conductor y del camión son requeridos');
    }

    const supabase = this.supabaseConfig.getClient();

    // Validar preventivamente que el camión no esté asignado a otro conductor activo
    const { data: ocupante, error: checkError } = await supabase
      .from('conductores')
      .select('id, rut, nombre')
      .eq('camion_id', camionId)
      .neq('id', conductorId) // Excluir al conductor actual
      .eq('activo', true)
      .maybeSingle();

    if (ocupante) {
      throw new ConflictException(`El camión ya se encuentra asignado a otro conductor activo (${ocupante.nombre || ocupante.rut})`);
    }

    // Hacer el update
    const { data, error } = await supabase
      .from('conductores')
      .update({ camion_id: camionId })
      .eq('id', conductorId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error al asignar el camión: ${error.message}`);
    }

    return data;
  }

  /**
   * Libera el camión de un conductor (setea camion_id en NULL).
   */
  async liberarCamion(conductorId: string) {
    if (!conductorId) {
      throw new BadRequestException('ID del conductor es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('conductores')
      .update({ camion_id: null })
      .eq('id', conductorId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error al liberar el camión: ${error.message}`);
    }

    return data;
  }

  /**
   * Endpoint optimizado para la App Móvil: Obtiene la asignación actual del camión
   * usando el usuario_id del JWT.
   */
  async getMiFlotaAsignacion(usuarioId: string) {
    const supabase = this.supabaseConfig.getClient();

    // 1. Obtener conductor y camión asignado (JOIN)
    const { data: conductorData, error: conductorError } = await supabase
      .from('conductores')
      .select(`
        id,
        nombre,
        camion_id,
        camiones (
          id,
          patente,
          estado,
          rendimiento_km_l,
          slots,
          slots_utilizados,
          talla
        )
      `)
      .eq('usuario_id', usuarioId)
      .eq('activo', true)
      .single();

    if (conductorError || !conductorData) {
      throw new NotFoundException('Conductor no encontrado o no está activo');
    }

    // 2. Obtener las rutas pendientes/en camino asignadas a este conductor
    const { data: rutasData, error: rutasError } = await supabase
      .from('rutas')
      .select('id, origen, destino, estado, fecha_estimada_entrega, eta')
      .eq('conductor_id', conductorData.id)
      .in('estado', ['PENDIENTE', 'EN_CAMINO'])
      .order('fecha_estimada_entrega', { ascending: true, nullsFirst: false });

    if (rutasError) {
      throw new BadRequestException(`Error al obtener las rutas: ${rutasError.message}`);
    }

    return {
      conductor: {
        id: conductorData.id,
        nombre: conductorData.nombre,
      },
      camion: conductorData.camiones || null, // null si no tiene camión asignado
      rutas_activas: rutasData || [],
    };
  }

  /**
   * Crea un nuevo chofer (Usuario Auth + Perfil Conductor) y asigna un camión opcionalmente.
   */
  async createConductor(data: any) {
    const supabase = this.supabaseConfig.getClient();

    const { email, password, nombre, rut, telefono, camion_id } = data;

    if (!email || !password || !nombre || !rut) {
      throw new BadRequestException('Email, password, nombre y rut son requeridos');
    }

    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmación inmediata
    });

    if (authError || !authData?.user) {
      throw new BadRequestException(`Error al crear usuario auth: ${authError?.message}`);
    }

    const userId = authData.user.id;

    // 2. Crear el registro en public.usuarios
    const { error: userError } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        email,
        password,
        nombre,
        rol: 'CONDUCTOR'
      });

    if (userError) {
      // Intentar limpiar auth si falla la DB
      await supabase.auth.admin.deleteUser(userId);
      throw new BadRequestException(`Error al insertar en usuarios: ${userError.message}`);
    }

    // 3. Crear el registro en public.conductores
    const conductorPayload = {
      usuario_id: userId,
      rut,
      nombre,
      telefono: telefono || null,
      camion_id: camion_id || null,
      activo: true
    };

    const { data: conductor, error: condError } = await supabase
      .from('conductores')
      .insert(conductorPayload)
      .select()
      .single();

    if (condError) {
      throw new BadRequestException(`Error al crear conductor: ${condError.message}`);
    }

    return conductor;
  }

  // ========== HELPERS PRIVADOS ==========

  /**
   * Resuelve el conductor y usuario objetivo de la carga (RRHH o auto-servicio).
   */
  private async resolveLicenseTarget(
    authenticatedUserId: string,
    conductorId?: string,
  ): Promise<{ targetUsuarioId: string; targetConductorId: string }> {
    const supabase = this.supabaseConfig.getClient();

    if (conductorId) {
      const { data: conductor, error } = await supabase
        .from('conductores')
        .select('id, usuario_id, activo')
        .eq('id', conductorId)
        .single();

      if (error || !conductor) {
        throw new NotFoundException('Conductor no encontrado');
      }

      if (!conductor.activo) {
        throw new BadRequestException('El conductor seleccionado no está activo');
      }

      if (!conductor.usuario_id) {
        throw new BadRequestException(
          'El conductor no tiene usuario asociado; no se puede registrar la licencia',
        );
      }

      return {
        targetUsuarioId: conductor.usuario_id,
        targetConductorId: conductor.id,
      };
    }

    const { data: conductor, error } = await supabase
      .from('conductores')
      .select('id, usuario_id, activo')
      .eq('usuario_id', authenticatedUserId)
      .single();

    if (error || !conductor) {
      throw new NotFoundException(
        'No se encontró un conductor asociado al usuario autenticado',
      );
    }

    if (!conductor.activo) {
      throw new BadRequestException('El conductor no está activo en el sistema');
    }

    return {
      targetUsuarioId: authenticatedUserId,
      targetConductorId: conductor.id,
    };
  }

  /**
   * Fuente de verdad para asignación: actualiza conductores.licencia_vencimiento
   * tras registrar en driver_licenses.
   */
  private async syncLicenciaVencimiento(
    conductorId: string,
    expiryDate: string,
  ): Promise<void> {
    const supabase = this.supabaseConfig.getClient();

    const { error } = await supabase
      .from('conductores')
      .update({ licencia_vencimiento: expiryDate })
      .eq('id', conductorId);

    if (error) {
      throw new BadRequestException(
        `Licencia guardada pero no se pudo sincronizar vigencia en conductores: ${error.message}`,
      );
    }
  }

  /**
   * Valida el archivo subido
   */
  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes seleccionar un archivo');
    }

    if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Acepta: PDF, JPG, PNG',
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo excede 5MB');
    }
  }

  /**
   * Valida la fecha de vencimiento
   */
  private validateExpiryDate(dateStr: string) {
    if (!dateStr) {
      throw new BadRequestException('Debes seleccionar una fecha de vencimiento');
    }

    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException('La fecha debe ser posterior a hoy');
    }
  }
}

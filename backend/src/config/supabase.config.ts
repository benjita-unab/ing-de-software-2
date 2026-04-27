import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseConfigService {
  private supabaseClient: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables',
      );
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  // Métodos de utilidad
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string) {
    const { data, error } = await this.supabaseClient.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage error: ${error.message}`);
    }

    return data;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabaseClient.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string) {
    const { error } = await this.supabaseClient.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Delete error: ${error.message}`);
    }
  }
}

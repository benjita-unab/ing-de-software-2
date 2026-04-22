-- Sincronizacion entre auth.users y tabla publica usuarios
-- Objetivo: usar Supabase Auth para login y tabla usuarios como perfil extendido.
-- IMPORTANTE: no usar la columna password de usuarios para autenticacion.

-- 1) Asegurar estructura compatible
alter table if exists public.usuarios
  alter column id type uuid using id::uuid;

alter table if exists public.usuarios
  alter column id set not null;

-- Si no existe PK en id, crearla.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.usuarios'::regclass
      and contype = 'p'
  ) then
    alter table public.usuarios add primary key (id);
  end if;
end $$;

-- Relacion directa con auth.users.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuarios_id_fkey_auth_users'
  ) then
    alter table public.usuarios
      add constraint usuarios_id_fkey_auth_users
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 2) Usuario de prueba (solo despues de crear usuario en Auth)
-- Reemplaza UUID_DEL_AUTH_USER por el id real de auth.users
insert into public.usuarios (id, email, nombre, rol, activo)
values (
  'UUID_DEL_AUTH_USER',
  'pedro@logistica.com',
  'Pedro Chofer',
  'CONDUCTOR',
  true
)
on conflict (id) do update
set
  email = excluded.email,
  nombre = excluded.nombre,
  rol = excluded.rol,
  activo = excluded.activo;

-- 3) Trigger opcional: crear perfil automaticamente al crear auth user
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nombre, rol, activo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'CONDUCTOR'),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

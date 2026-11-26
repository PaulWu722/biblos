-- 信息島存檔（已套用在 PaulWu722's Project）。沿用 biblos_users 的手機登入與 token。
-- 每位使用者一份 GameState（jsonb）。表格開 RLS 不建 policy，只能透過下面的函式存取。
create table if not exists biblos_island (
  uid bigint primary key references biblos_users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table biblos_island enable row level security;

create or replace function biblos_island_load(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v bigint := biblos_uid(p_token);
begin
  if v is null then raise exception 'unauthorized'; end if;
  return (select state from biblos_island where uid = v);
end $$;

-- shortcut: 狀態由瀏覽器算好整份覆寫，最後存的裝置為準、也可被竄改；要防作弊須把規則搬進資料庫。
create or replace function biblos_island_save(p_token uuid, p_state jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := biblos_uid(p_token);
begin
  if v is null then raise exception 'unauthorized'; end if;
  if jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'animals') <> 'array'
     or jsonb_typeof(p_state->'reads') <> 'array' then raise exception 'bad state'; end if;
  if pg_column_size(p_state) > 1048576 then raise exception 'state too large'; end if;
  insert into biblos_island values (v, p_state, now())
    on conflict (uid) do update set state = excluded.state, updated_at = now();
end $$;

-- 賽程：每人一列摘要（不含手機）。
create or replace function biblos_island_board(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if biblos_uid(p_token) is null then raise exception 'unauthorized'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'nick', u.nick,
      'scene', coalesce(i.state->>'currentSceneId', 'eden'),
      'animals', coalesce(jsonb_array_length(i.state->'animals'), 0),
      'reads', coalesce(jsonb_array_length(i.state->'reads'), 0))), '[]')
    from biblos_users u left join biblos_island i on i.uid = u.id);
end $$;

-- 看別人的島：只給暱稱、目前場景與動物。
create or replace function biblos_island_view(p_token uuid, p_uid bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if biblos_uid(p_token) is null then raise exception 'unauthorized'; end if;
  return (select jsonb_build_object('nick', u.nick,
      'scene', coalesce(i.state->>'currentSceneId', 'eden'),
      'animals', coalesce(i.state->'animals', '[]'))
    from biblos_users u left join biblos_island i on i.uid = u.id where u.id = p_uid);
end $$;

create or replace function biblos_island_admin(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from biblos_config where k = 'admin_hash' and v = encode(digest(p_key, 'sha256'), 'hex')) then
    raise exception 'unauthorized';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'phone', u.phone, 'nick', u.nick, 'created', u.created,
      'scene', i.state->>'currentSceneId',
      'animals', coalesce(jsonb_array_length(i.state->'animals'), 0),
      'reads', coalesce(jsonb_array_length(i.state->'reads'), 0),
      'updated', i.updated_at)), '[]')
    from biblos_users u left join biblos_island i on i.uid = u.id);
end $$;

revoke all on function biblos_island_load(uuid), biblos_island_save(uuid,jsonb), biblos_island_board(uuid),
  biblos_island_view(uuid,bigint), biblos_island_admin(text) from public;
grant execute on function biblos_island_load(uuid), biblos_island_save(uuid,jsonb), biblos_island_board(uuid),
  biblos_island_view(uuid,bigint), biblos_island_admin(text) to anon;

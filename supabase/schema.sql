-- biblos 的 Supabase 結構（已套用在 PaulWu722's Project）。重建時整份在 SQL Editor 執行，再設定後台金鑰。
create extension if not exists pgcrypto;

create table biblos_users (
  id bigserial primary key,
  phone text unique not null,
  nick text not null,
  created date not null default (now() at time zone 'Asia/Taipei')::date,
  avatar text,
  bg text,
  token uuid not null default gen_random_uuid()
);
create table biblos_reads (uid bigint references biblos_users(id) on delete cascade, book text, idx int, ts date, primary key (uid, book, idx));
create table biblos_zoo (uid bigint references biblos_users(id) on delete cascade, day date, animal int, primary key (uid, day));
create table biblos_config (k text primary key, v text not null);
alter table biblos_users enable row level security;
alter table biblos_reads enable row level security;
alter table biblos_zoo enable row level security;
alter table biblos_config enable row level security;
-- 不建 policy：anon 不能直接讀寫，只能透過下面的 security definer 函式

create or replace function biblos_uid(p_token uuid) returns bigint
language sql stable security definer set search_path = public as
$$ select id from biblos_users where token = p_token $$;

create or replace function biblos_me_json(p_uid bigint) returns jsonb
language sql stable security definer set search_path = public as
$$ select jsonb_build_object('id', id, 'nick', nick, 'created', created, 'avatar', avatar, 'bg', bg) from biblos_users where id = p_uid $$;

create or replace function biblos_login(p_phone text, p_nick text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u biblos_users;
begin
  if p_phone !~ '^[0-9]{8,15}$' then raise exception 'bad phone'; end if;
  select * into u from biblos_users where phone = p_phone;
  if not found then
    if coalesce(trim(p_nick), '') = '' then return jsonb_build_object('need_nick', true); end if;
    insert into biblos_users(phone, nick) values (p_phone, left(trim(p_nick), 12)) returning * into u;
  end if;
  return jsonb_build_object('token', u.token, 'me', biblos_me_json(u.id));
end $$;

create or replace function biblos_me(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as
$$ select biblos_me_json(biblos_uid(p_token)) $$;

create or replace function biblos_set_nick(p_token uuid, p_nick text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_nick), '') = '' then raise exception 'empty'; end if;
  update biblos_users set nick = left(trim(p_nick), 12) where id = biblos_uid(p_token);
end $$;

create or replace function biblos_set_bg(p_token uuid, p_bg text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_bg !~ '^(p:[a-z]+|c:#[0-9a-fA-F]{6})$' then raise exception 'bad bg'; end if;
  update biblos_users set bg = p_bg where id = biblos_uid(p_token);
end $$;

create or replace function biblos_set_avatar(p_token uuid, p_animal int) returns void
language plpgsql security definer set search_path = public as $$
declare v bigint := biblos_uid(p_token);
begin
  if p_animal is null then
    update biblos_users set avatar = null where id = v;
  elsif exists (select 1 from biblos_zoo where uid = v and animal = p_animal) then
    update biblos_users set avatar = 'a:' || p_animal where id = v;
  end if;
end $$;

create or replace function biblos_my_reads(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('book', book, 'idx', idx, 'ts', ts)), '[]') from biblos_reads where uid = biblos_uid(p_token) $$;

create or replace function biblos_my_zoo(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'animal', animal) order by day), '[]') from biblos_zoo where uid = biblos_uid(p_token) $$;

create or replace function biblos_mark(p_token uuid, p_book text, p_idx int, p_undo boolean,
                                       p_goal int default 3, p_animals int default 100) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v bigint := biblos_uid(p_token);
        today date := (now() at time zone 'Asia/Taipei')::date;
        a int; n int;
begin
  if v is null or p_book not in ('lee','nee','nt','lsnt','lsot') or p_idx < 0 then raise exception 'bad request'; end if;
  if p_undo then
    delete from biblos_reads where uid = v and book = p_book and idx = p_idx;
    return jsonb_build_object('animal', null);
  end if;
  insert into biblos_reads values (v, p_book, p_idx, today) on conflict do nothing;
  select count(*) into n from biblos_reads where uid = v and ts = today;
  if n >= p_goal and not exists (select 1 from biblos_zoo where uid = v and day = today) then
    a := floor(random() * p_animals)::int;
    insert into biblos_zoo values (v, today, a) on conflict do nothing;
    return jsonb_build_object('animal', a);
  end if;
  return jsonb_build_object('animal', null);
end $$;

create or replace function biblos_progress(p_token uuid, p_today jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if biblos_uid(p_token) is null then raise exception 'unauthorized'; end if;
  return jsonb_build_object(
    'users', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nick', nick, 'avatar', avatar)), '[]') from biblos_users),
    'reads', (select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'book', book, 'idx', idx)), '[]') from biblos_reads),
    'zoo', (select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'animal', animal) order by day), '[]') from biblos_zoo));
end $$;

create or replace function biblos_user_zoo(p_token uuid, p_uid bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if biblos_uid(p_token) is null then raise exception 'unauthorized'; end if;
  return jsonb_build_object(
    'nick', (select nick from biblos_users where id = p_uid),
    'zoo', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'animal', animal) order by day), '[]') from biblos_zoo where uid = p_uid));
end $$;

create or replace function biblos_admin(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from biblos_config where k = 'admin_hash' and v = encode(digest(p_key, 'sha256'), 'hex')) then
    raise exception 'unauthorized';
  end if;
  return jsonb_build_object(
    'users', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'phone', phone, 'nick', nick, 'created', created)), '[]') from biblos_users),
    'reads', (select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'book', book, 'idx', idx, 'ts', ts)), '[]') from biblos_reads),
    'zoo', (select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'day', day, 'animal', animal)), '[]') from biblos_zoo));
end $$;

revoke all on function biblos_uid(uuid), biblos_me_json(bigint) from public, anon, authenticated;
grant execute on function biblos_login(text,text), biblos_me(uuid), biblos_set_nick(uuid,text), biblos_set_bg(uuid,text),
  biblos_set_avatar(uuid,int), biblos_my_reads(uuid), biblos_my_zoo(uuid), biblos_mark(uuid,text,int,boolean,int,int),
  biblos_progress(uuid,jsonb), biblos_user_zoo(uuid,bigint), biblos_admin(text) to anon;

-- 後台金鑰（換成自己的字串）
insert into biblos_config values ('admin_hash', encode(extensions.digest('換成你的金鑰', 'sha256'), 'hex'))
  on conflict (k) do update set v = excluded.v;

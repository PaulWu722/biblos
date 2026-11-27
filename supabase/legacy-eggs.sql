-- 舊版玩家發蛋（一次性）：舊網站每一隻動物 = 信息島一顆蛋。
-- 第 5、15、25… 顆是稀有蛋，第 10、20、30… 顆是珍貴蛋，其餘是普通蛋。
-- 蛋的 id 是 legacy-<uid>-<n>，已經發過的人會被跳過，所以重跑不會重複發。
-- 沒有信息島存檔的人，會建立一份新的存檔（格式同 island/src/core/engine.ts 的 createInitialState，版本 3）。
do $$
declare
  u record;
  eggs jsonb;
  st jsonb;
  ts text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  for u in select uid, count(*) n from biblos_zoo group by uid loop
    select state into st from biblos_island where uid = u.uid;
    if st is not null and exists (select 1 from jsonb_array_elements(st->'eggs') e where e->>'id' like 'legacy-%') then
      continue;
    end if;
    select jsonb_agg(jsonb_build_object(
        'id', 'legacy-' || u.uid || '-' || i, 'createdAt', ts, 'updatedAt', ts,
        'tier', case when i % 10 = 0 then 'precious' when i % 5 = 0 then 'rare' else 'normal' end,
        'sceneId', coalesce(st->>'currentSceneId', 'eden'), 'hatched', false) order by i)
      into eggs from generate_series(1, u.n) i;
    if st is null then
      st := jsonb_build_object('version', 3, 'userId', gen_random_uuid()::text, 'reads', '[]'::jsonb, 'pendingBatch', '[]'::jsonb,
        'eggs', '[]'::jsonb, 'animals', '[]'::jsonb, 'xp', 0, 'currentSceneId', 'eden', 'unlockedSceneIds', '["eden"]'::jsonb,
        'collection', '{}'::jsonb, 'goldenScenes', '[]'::jsonb, 'lastResetAt', ts, 'settings', '{}'::jsonb);
    end if;
    st := jsonb_set(st, '{eggs}', coalesce(st->'eggs', '[]'::jsonb) || eggs);
    insert into biblos_island values (u.uid, st, now())
      on conflict (uid) do update set state = excluded.state, updated_at = now();
  end loop;
end $$;

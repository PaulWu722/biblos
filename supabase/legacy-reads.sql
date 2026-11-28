-- 舊版閱讀紀錄併入信息島（一次性，可重跑）：
-- 1. biblos_reads 每一篇舊紀錄變成信息島的一筆已讀（id 是 legacy-read-<uid>-<book>-<idx>，答對 0 題，日期沿用舊紀錄）。
--    信息島裡已經讀過的同一篇不重複加，所以重跑不會重複。只加已讀，不發蛋、不給經驗值（舊動物已由 legacy-eggs.sql 換成蛋）。
-- 2. 依總已讀篇數重算進度：每 60 篇開一座島（同 island/config/rules.ts 的 readsPerScene），不夠 60 篇的島收回。
--    動物都留著，只是住回目前開放的最後一座島。
-- 有舊紀錄但沒有信息島存檔的人，建立一份新存檔（格式同 engine.ts 的 createInitialState，版本 3）。
-- 注意：存檔是瀏覽器整份覆寫，跑的時候若有人開著頁面，他下次存檔會蓋掉這次的結果；之後再跑一次即可補上。
do $$
declare
  u record;
  old jsonb;
  st jsonb;
  added jsonb;
  k int;
  scenes text[] := array['eden', 'ark', 'wilderness', 'bethlehem', 'galilee', 'jerusalem'];
  now_ts text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  for u in select coalesce(r.uid, i.uid) uid from (select distinct uid from biblos_reads) r full join biblos_island i on i.uid = r.uid loop
    select state into old from biblos_island where uid = u.uid;
    st := coalesce(old, jsonb_build_object('version', 3, 'userId', gen_random_uuid()::text, 'reads', '[]'::jsonb, 'pendingBatch', '[]'::jsonb,
      'eggs', '[]'::jsonb, 'animals', '[]'::jsonb, 'xp', 0, 'currentSceneId', 'eden', 'unlockedSceneIds', '["eden"]'::jsonb,
      'collection', '{}'::jsonb, 'goldenScenes', '[]'::jsonb, 'lastResetAt', now_ts, 'settings', '{}'::jsonb));
    -- 舊紀錄的日期是台灣時間的那一天，換成那天 00:00（台灣）的 UTC 時間
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', 'legacy-read-' || r.uid || '-' || r.book || '-' || r.idx,
        'createdAt', to_char(r.ts::timestamp at time zone 'Asia/Taipei' at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'updatedAt', now_ts, 'articleId', r.book || '/' || r.idx, 'correct', 0) order by r.ts, r.book, r.idx), '[]'::jsonb)
      into added
      from biblos_reads r
      where r.uid = u.uid
        and not exists (select 1 from jsonb_array_elements(coalesce(st->'reads', '[]'::jsonb)) x where x->>'articleId' = r.book || '/' || r.idx);
    st := jsonb_set(st, '{reads}', coalesce(st->'reads', '[]'::jsonb) || added);
    k := least(array_length(scenes, 1), jsonb_array_length(st->'reads') / 60 + 1);
    st := st || jsonb_build_object('currentSceneId', scenes[k], 'unlockedSceneIds', to_jsonb(scenes[1:k]));
    if old is distinct from st then
      insert into biblos_island values (u.uid, st, now())
        on conflict (uid) do update set state = excluded.state, updated_at = now();
    end if;
  end loop;
end $$;

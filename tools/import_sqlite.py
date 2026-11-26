# 把舊 Flask 版的 progress.db 轉成 SQL，貼到 Supabase SQL Editor 執行（或交給 Claude 執行）。
# 用法：python3 tools/import_sqlite.py progress.db > import.sql
# 保留原本的使用者編號；上傳的照片頭像（u:）無法搬，改回預設；動物頭像（a:）保留。
import sqlite3, sys

def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

con = sqlite3.connect(sys.argv[1])
con.row_factory = sqlite3.Row
cols = {r["name"] for r in con.execute("PRAGMA table_info(users)")}
out = ["begin;"]
for u in con.execute("SELECT * FROM users ORDER BY id"):
    av = u["avatar"] if "avatar" in cols else None
    av = av if av and av.startswith("a:") else None
    bg = u["bg"] if "bg" in cols else None
    out.append("insert into biblos_users (id, phone, nick, created, avatar, bg) values (%d, %s, %s, %s, %s, %s);"
               % (u["id"], q(u["phone"]), q(u["nick"]), q(u["created"] or "2026-10-22"), q(av), q(bg)))
for r in con.execute("SELECT * FROM reads"):
    out.append("insert into biblos_reads values (%d, %s, %d, %s) on conflict do nothing;" % (r["uid"], q(r["book"]), r["idx"], q(r["ts"])))
for z in con.execute("SELECT * FROM zoo"):
    out.append("insert into biblos_zoo values (%d, %s, %d) on conflict do nothing;" % (z["uid"], q(z["day"]), z["animal"]))
out.append("select setval('biblos_users_id_seq', (select coalesce(max(id), 1) from biblos_users));")
out.append("commit;")
print("\n".join(out))

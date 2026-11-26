import hmac
import json
import os
import random
import re
import sqlite3
from datetime import date, datetime, timedelta, timezone
from functools import wraps

from flask import Flask, abort, g, jsonify, redirect, render_template, request, session, url_for

BASE = os.path.dirname(os.path.abspath(__file__))

# 第一篇出現的日期；之後每天往下一篇，讀完後從頭循環
START_DATE = date(2026, 10, 22)
DAILY_GOAL = 3  # 一天讀完任意幾篇就得到一隻動物
ANIMAL_COUNT = 100  # static/animals/00.webp ~ 99.webp
ANIMAL_NAMES = ['綿羊', '黃金獵犬', '橘貓', '兔子', '小鴨', '小豬', '乳牛', '小馬', '驢子', '山羊', '熊貓', '小熊貓', '浣熊', '松鼠', '刺蝟', '花栗鼠', '水獺', '海狸', '海豹', '企鵝', '北極熊', '無尾熊', '袋鼠', '袋熊', '小鹿', '斑馬', '長頸鹿', '獅子', '老虎', '花豹', '狐狸', '哈士奇', '柴犬', '雪鴞', '穀倉貓頭鷹', '鸚鵡', '藍松鴉', '山雀', '金絲雀', '白鴿', '青蛙', '烏龜', '變色龍', '壁虎', '豹紋守宮', '火蠑螈', '綠蛇', '紅蛇', '鱷魚', '陸龜', '龍貓', '雪貂', '天竺鼠', '米格魯', '鬥牛犬', '貴賓犬', '柯基', '大麥町', '秋田犬', '法國鬥牛犬', '海星', '螃蟹', '寄居蟹', '龍蝦', '魷魚', '章魚', '蝦子', '珍珠貝', '扇貝', '珊瑚', '瓢蟲', '蝴蝶', '蜻蜓', '蜜蜂', '蚱蜢', '螳螂', '蚊子', '蒼蠅', '螢火蟲', '蝸牛', '鼴鼠', '鼴鼠', '獾', '臭鼬', '海獺', '土撥鼠', '河獺', '花栗鼠', '小熊貓', '黃鼠狼', '山羊', '綿羊', '羊駝', '小馬', '驢子', '乳牛', '小豬', '白鵝', '母雞', '火雞']  # 依圖片順序（左到右、上到下）

BOOKS = {
    "lee": {"name": "李常受文集", "short": "李常受", "file": "lee.json"},
    "nee": {"name": "倪柝聲文集", "short": "倪柝聲", "sub": "鼓嶺訓練記錄（卷一）", "file": "nee.json"},
    "nt": {"name": "新約總論", "short": "新約總論", "file": "nt.json"},
    "lsnt": {"name": "新約生命讀經", "short": "新約生命", "file": "lsnt.json"},
    "lsot": {"name": "舊約生命讀經", "short": "舊約生命", "file": "lsot.json"},
}

DB = os.path.join(BASE, "progress.db")
AVATAR_DIR = os.path.join(BASE, "static", "avatars")

# 閱讀背景預設：key -> (背景色, 文字色, 名稱)
BG_PRESETS = {
    "mist": ("#eef3ea", "#26332b", "晨霧"),
    "cream": ("#faf7f0", "#2b2620", "米白"),
    "green": ("#e4efd8", "#26331f", "護眼綠"),
    "blue": ("#e3eef8", "#1f2d3a", "淡藍"),
    "parchment": ("#f0e2c0", "#3b2c14", "羊皮紙"),
    "pink": ("#fbe9ee", "#3a2229", "淡粉"),
    "night": ("#17191d", "#d8d4c8", "夜間"),
}


def _secret():
    path = os.path.join(BASE, "secret.key")
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(os.urandom(32).hex())
    with open(path) as f:
        return f.read().strip()


def _admin_key():
    """後台金鑰：第一次執行時自動產生，存在 admin.key；也可自己改成想要的字串"""
    path = os.path.join(BASE, "admin.key")
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(os.urandom(12).hex())
    with open(path) as f:
        return f.read().strip()


app = Flask(__name__)
app.secret_key = _secret()
_admin_key()  # 啟動時就建立 admin.key
app.config.update(
    MAX_CONTENT_LENGTH=8 * 1024 * 1024,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(days=365),
)

_cache = {}


def load(key):
    if key not in _cache:
        with open(os.path.join(BASE, "data", BOOKS[key]["file"]), encoding="utf-8") as f:
            _cache[key] = json.load(f)
    return _cache[key]


def today_tw():
    return datetime.now(timezone(timedelta(hours=8))).date()


def parse_day(s):
    try:
        return date.fromisoformat(s)
    except (TypeError, ValueError):
        return today_tw()


def idx_for(key, day):
    return (day - START_DATE).days % len(load(key))


def bg_colors(spec):
    """users.bg -> (背景色, 文字色)"""
    if spec and spec.startswith("p:") and spec[2:] in BG_PRESETS:
        b, f, _ = BG_PRESETS[spec[2:]]
        return b, f
    if spec and re.fullmatch(r"c:#[0-9a-fA-F]{6}", spec):
        h = spec[2:]
        r, gg, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
        lum = 0.299 * r + 0.587 * gg + 0.114 * b
        return h, "#1d1b18" if lum > 140 else "#eeeae0"
    return BG_PRESETS["mist"][:2]


@app.context_processor
def inject():
    return {"avatar_src": avatar_src, "animal_name": lambda n: ANIMAL_NAMES[n]}


def avatar_src(spec):
    """users.avatar -> 圖片網址或 None"""
    if spec and spec.startswith("a:"):
        return "/static/animals/%02d.webp" % int(spec[2:])
    if spec and spec.startswith("u:"):
        return "/static/avatars/" + spec[2:]
    return None


# ---------- database ----------

def db():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            nick TEXT NOT NULL,
            created TEXT
        );
        CREATE TABLE IF NOT EXISTS reads (
            uid INTEGER, book TEXT, idx INTEGER, ts TEXT,
            PRIMARY KEY (uid, book, idx)
        );
        CREATE TABLE IF NOT EXISTS zoo (
            uid INTEGER, day TEXT, animal INTEGER,
            PRIMARY KEY (uid, day)
        );
        """
    )
    cols = {r["name"] for r in con.execute("PRAGMA table_info(users)")}
    for col in ("avatar", "bg"):
        if col not in cols:
            con.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT")
    return con


def query(sql, args=()):
    con = db()
    try:
        return con.execute(sql, args).fetchall()
    finally:
        con.close()


def execute(sql, args=()):
    con = db()
    try:
        with con:
            return con.execute(sql, args)
    finally:
        con.close()


def done_set(uid, key):
    return {r["idx"] for r in query("SELECT idx FROM reads WHERE uid=? AND book=?", (uid, key))}


# ---------- auth ----------

def normalize_phone(raw):
    p = re.sub(r"[\s\-().]", "", raw or "")
    if p.startswith("+886"):
        p = "0" + p[4:]
    elif p.startswith("886") and len(p) == 12:
        p = "0" + p[3:]
    return p if p.isdigit() and 8 <= len(p) <= 15 else None


def safe_next(n):
    return n if n and n.startswith("/") and not n.startswith("//") else None


@app.before_request
def load_user():
    g.user = None
    uid = session.get("uid")
    if uid:
        rows = query("SELECT * FROM users WHERE id=?", (uid,))
        g.user = rows[0] if rows else None


def login_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not g.user:
            return redirect(url_for("login", next=request.full_path.rstrip("?")))
        return f(*a, **kw)

    return wrapper


@app.route("/login", methods=["GET", "POST"])
def login():
    nxt = safe_next(request.values.get("next"))
    if request.method == "GET":
        return render_template("login.html", need_nick=False, phone="", nxt=nxt, error=None)
    phone = normalize_phone(request.form.get("phone"))
    if not phone:
        return render_template("login.html", need_nick=False, phone=request.form.get("phone", ""),
                               nxt=nxt, error="請輸入正確的手機號碼")
    rows = query("SELECT * FROM users WHERE phone=?", (phone,))
    if rows:
        uid = rows[0]["id"]
    else:
        nick = (request.form.get("nick") or "").strip()[:12]
        if not nick:
            return render_template("login.html", need_nick=True, phone=phone, nxt=nxt,
                                   error="第一次使用，請取一個暱稱")
        cur = execute("INSERT INTO users (phone, nick, created) VALUES (?,?,?)",
                      (phone, nick, today_tw().isoformat()))
        uid = cur.lastrowid
    session.permanent = True
    session["uid"] = uid
    return redirect(nxt or url_for("read_home"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    msg = None
    if request.method == "POST":
        nick = (request.form.get("nick") or "").strip()[:12]
        if nick:
            execute("UPDATE users SET nick=? WHERE id=?", (nick, g.user["id"]))
            return redirect(url_for("profile", ok=1))
        msg = "暱稱不能空白"
    mine = sorted({r["animal"] for r in query("SELECT animal FROM zoo WHERE uid=?", (g.user["id"],))})
    return render_template("profile.html", msg=msg, ok=request.args.get("ok"), active="me",
                           mine=mine, aerr=request.args.get("aerr"))


@app.route("/profile/avatar", methods=["POST"])
@login_required
def set_avatar():
    uid = g.user["id"]
    old = g.user["avatar"]

    def drop_old():
        if old and old.startswith("u:"):
            try:
                os.remove(os.path.join(AVATAR_DIR, old[2:]))
            except OSError:
                pass

    if request.form.get("reset"):
        execute("UPDATE users SET avatar=NULL WHERE id=?", (uid,))
        drop_old()
    elif request.form.get("animal") is not None:
        a = request.form.get("animal", type=int)
        owned = {r["animal"] for r in query("SELECT animal FROM zoo WHERE uid=?", (uid,))}
        if a in owned:
            execute("UPDATE users SET avatar=? WHERE id=?", ("a:%d" % a, uid))
            drop_old()
    else:
        f = request.files.get("photo")
        if not f or not f.filename:
            return redirect(url_for("profile", aerr="請先選一張照片"))
        try:
            from PIL import Image, ImageOps

            im = ImageOps.exif_transpose(Image.open(f.stream)).convert("RGB")
            im = ImageOps.fit(im, (200, 200), Image.LANCZOS)
        except Exception:
            return redirect(url_for("profile", aerr="這個檔案無法當作照片使用"))
        os.makedirs(AVATAR_DIR, exist_ok=True)
        name = "%d-%s.jpg" % (uid, os.urandom(3).hex())
        im.save(os.path.join(AVATAR_DIR, name), "JPEG", quality=85)
        execute("UPDATE users SET avatar=? WHERE id=?", ("u:" + name, uid))
        drop_old()
    return redirect(url_for("profile", ok=1))


# ---------- reading ----------

def day_status(uid, day):
    """每本書在 day 這天那一篇是否已完成"""
    return {k: idx_for(k, day) in done_set(uid, k) for k in BOOKS}


def missed_items(user):
    """過了當天卻還沒讀的：{書: [(日期, 篇序, 標題), ...]}，新的在前"""
    today = today_tw()
    start = max(START_DATE, parse_day(user["created"]) if user["created"] else START_DATE)
    out = {}
    for k in BOOKS:
        done = done_set(user["id"], k)
        arts = load(k)
        rows = []
        d = today - timedelta(days=1)
        while d >= start:
            i = idx_for(k, d)
            if i not in done:
                rows.append((d, i + 1, arts[i]["t"]))
            d -= timedelta(days=1)
        out[k] = rows
    return out


@app.route("/")
@login_required
def home():
    return redirect(url_for("read_home"))


@app.route("/read")
@login_required
def read_home():
    st = day_status(g.user["id"], today_tw())
    first = next((k for k, v in st.items() if not v), "lee")
    return redirect(url_for("read", key=first))


@app.route("/read/<key>")
@login_required
def read(key):
    if key not in BOOKS:
        abort(404)
    day = parse_day(request.args.get("d"))
    n = idx_for(key, day)
    art = load(key)[n]
    uid = g.user["id"]
    st = day_status(uid, day)
    return render_template(
        "read.html",
        active="read",
        books=BOOKS,
        key=key,
        book=BOOKS[key],
        day=day,
        is_today=(day == today_tw()),
        prev_day=day - timedelta(days=1),
        next_day=day + timedelta(days=1),
        title=art["t"],
        paras=[p for p in art["b"].split("\n") if p.strip()],
        n=n + 1,
        idx=n,
        total=len(load(key)),
        status=st,
        missed_n=sum(len(v) for v in missed_items(g.user).values()),
        bg=bg_colors(g.user["bg"]),
        bg_spec=g.user["bg"] or "p:mist",
        my_animals=[r["animal"] for r in query("SELECT animal FROM zoo WHERE uid=? ORDER BY day DESC LIMIT 3", (uid,))],
        presets=BG_PRESETS,
        ndone=sum(st.values()),
        today_reads=query("SELECT COUNT(*) n FROM reads WHERE uid=? AND ts=?", (uid, today_tw().isoformat()))[0]["n"],
        got_today=bool(query("SELECT 1 FROM zoo WHERE uid=? AND day=?", (uid, today_tw().isoformat()))),
        goal=DAILY_GOAL,
        finished=st[key],
        new_animal=session.pop("new_animal", None),
        new_day=parse_day(session.pop("new_day", None)),
    )


@app.route("/read/<key>/done", methods=["POST"])
@login_required
def mark_done(key):
    if key not in BOOKS:
        abort(404)
    uid = g.user["id"]
    idx = request.form.get("idx", type=int)
    if idx is None or not 0 <= idx < len(load(key)):
        abort(400)
    animal = None
    if request.form.get("undo"):
        execute("DELETE FROM reads WHERE uid=? AND book=? AND idx=?", (uid, key, idx))
    else:
        today = today_tw()
        execute("INSERT OR IGNORE INTO reads VALUES (?,?,?,?)", (uid, key, idx, today.isoformat()))
        # 今天讀完任意 DAILY_GOAL 篇（不限是否當天規定、補讀也算）-> 隨機獲得一隻小動物（每天一次）
        n_today = query("SELECT COUNT(*) n FROM reads WHERE uid=? AND ts=?", (uid, today.isoformat()))[0]["n"]
        if n_today >= DAILY_GOAL and not query(
            "SELECT 1 FROM zoo WHERE uid=? AND day=?", (uid, today.isoformat())
        ):
            animal = random.randrange(ANIMAL_COUNT)
            execute("INSERT OR IGNORE INTO zoo VALUES (?,?,?)", (uid, today.isoformat(), animal))
            if not request.form.get("ajax"):
                session["new_animal"] = animal
                session["new_day"] = today.isoformat()
    if request.form.get("ajax"):
        # 朗讀連播用：不換頁，直接回傳結果
        day = today_tw()
        return jsonify(ok=True, animal=animal,
                       animal_name=ANIMAL_NAMES[animal] if animal is not None else None,
                       today=(day == today_tw()), day="%d/%d" % (day.month, day.day))
    return redirect(safe_next(request.form.get("next")) or url_for("read", key=key))


@app.route("/api/day")
@login_required
def api_day():
    """朗讀連播用：某一天五本書各一篇的內容與完成狀態"""
    day = parse_day(request.args.get("d"))
    st = day_status(g.user["id"], day)
    items = []
    for k, b in BOOKS.items():
        i = idx_for(k, day)
        art = load(k)[i]
        items.append({
            "key": k, "name": b["name"], "sub": b.get("sub", ""), "idx": i, "n": i + 1,
            "total": len(load(k)), "title": art["t"], "done": st[k],
            "paras": [p for p in art["b"].split("\n") if p.strip()],
        })
    return jsonify(day=day.isoformat(), items=items)


@app.route("/missed")
@login_required
def missed():
    m = missed_items(g.user)
    st = day_status(g.user["id"], today_tw())
    return render_template("missed.html", active="read", books=BOOKS, key="missed", status=st,
                           is_today=True, day=today_tw(), missed=m,
                           missed_n=sum(len(v) for v in m.values()))


@app.route("/bg", methods=["POST"])
@login_required
def set_bg():
    v = request.form.get("bg", "")
    if v.startswith("p:") and v[2:] in BG_PRESETS or re.fullmatch(r"c:#[0-9a-fA-F]{6}", v):
        execute("UPDATE users SET bg=? WHERE id=?", (v, g.user["id"]))
    return redirect(safe_next(request.form.get("next")) or url_for("read_home"))


# ---------- progress & zoo ----------

@app.route("/progress")
@login_required
def progress():
    today = today_tw()
    today_idx = {k: idx_for(k, today) for k in BOOKS}
    totals = {k: len(load(k)) for k in BOOKS}
    people = {}
    for u in query("SELECT id, nick, avatar FROM users"):
        people[u["id"]] = {
            "id": u["id"], "nick": u["nick"], "avatar": u["avatar"], "counts": {k: 0 for k in BOOKS},
            "today": 0, "animals": [], "zoo_total": 0,
        }
    for r in query("SELECT uid, book, idx FROM reads"):
        p = people.get(r["uid"])
        if p and r["book"] in BOOKS:
            p["counts"][r["book"]] += 1
            if r["idx"] == today_idx[r["book"]]:
                p["today"] += 1
    for r in query("SELECT uid, animal FROM zoo ORDER BY day"):
        p = people.get(r["uid"])
        if p:
            p["animals"].append(r["animal"])
    for p in people.values():
        p["zoo_total"] = len(p["animals"])
        p["animals"] = p["animals"][-8:]
        p["sum"] = sum(p["counts"].values())
    me = g.user["id"]
    ordered = sorted(people.values(), key=lambda p: (p["id"] != me, -p["sum"], p["id"]))
    return render_template("progress.html", active="progress", books=BOOKS, totals=totals,
                           people=ordered, me=me, nbooks=len(BOOKS))


@app.route("/zoo/<int:uid>")
@login_required
def zoo(uid):
    rows = query("SELECT nick FROM users WHERE id=?", (uid,))
    if not rows:
        abort(404)
    animals = [(r["day"], r["animal"]) for r in
               query("SELECT day, animal FROM zoo WHERE uid=? ORDER BY day", (uid,))]
    return render_template("zoo.html", active="progress", nick=rows[0]["nick"], animals=animals,
                           kinds=len({a for _, a in animals}), total_kinds=ANIMAL_COUNT)


# ---------- admin ----------

def admin_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not session.get("admin"):
            return redirect(url_for("admin_login"))
        return f(*a, **kw)

    return wrapper


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    err = None
    if request.method == "POST":
        if hmac.compare_digest(request.form.get("key", "").strip(), _admin_key()):
            session["admin"] = True
            session.permanent = True
            return redirect(url_for("admin"))
        err = "金鑰不正確"
    return render_template("admin_login.html", err=err)


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("admin_login"))


@app.route("/admin")
@admin_required
def admin():
    today = today_tw()
    today_idx = {k: idx_for(k, today) for k in BOOKS}
    users = [dict(u) for u in query("SELECT * FROM users ORDER BY id")]
    by = {u["id"]: u for u in users}
    for u in users:
        u.update(counts={k: 0 for k in BOOKS}, today=0, last="", animals=0, missed=0)
    for r in query("SELECT uid, book, idx, ts FROM reads"):
        u = by.get(r["uid"])
        if u and r["book"] in BOOKS:
            u["counts"][r["book"]] += 1
            if r["idx"] == today_idx[r["book"]]:
                u["today"] += 1
            u["last"] = max(u["last"], r["ts"] or "")
    for r in query("SELECT uid, COUNT(*) n FROM zoo GROUP BY uid"):
        if r["uid"] in by:
            by[r["uid"]]["animals"] = r["n"]
    for u in users:
        u["sum"] = sum(u["counts"].values())
        u["missed"] = sum(len(v) for v in missed_items(u).values())
    users.sort(key=lambda u: (-u["today"], -u["sum"]))
    summary = {
        "users": len(users),
        "active_today": sum(1 for u in users if u["last"] == today.isoformat()),
        "done_today": sum(1 for u in users if u["today"] == len(BOOKS)),
        "reads": sum(u["sum"] for u in users),
        "animals": sum(u["animals"] for u in users),
    }
    return render_template("admin.html", users=users, books=BOOKS, totals={k: len(load(k)) for k in BOOKS},
                           summary=summary, today=today, nbooks=len(BOOKS))


@app.route("/admin/u/<int:uid>")
@admin_required
def admin_user(uid):
    rows = query("SELECT * FROM users WHERE id=?", (uid,))
    if not rows:
        abort(404)
    u = rows[0]
    recent = [
        {"book": BOOKS[r["book"]]["name"], "n": r["idx"] + 1, "title": load(r["book"])[r["idx"]]["t"], "ts": r["ts"]}
        for r in query("SELECT book, idx, ts FROM reads WHERE uid=? ORDER BY ts DESC, rowid DESC LIMIT 40", (uid,))
        if r["book"] in BOOKS
    ]
    perday = query("SELECT ts, COUNT(*) n FROM reads WHERE uid=? GROUP BY ts ORDER BY ts DESC LIMIT 14", (uid,))
    animals = [(r["day"], r["animal"]) for r in query("SELECT day, animal FROM zoo WHERE uid=? ORDER BY day", (uid,))]
    m = missed_items(u)
    return render_template("admin_user.html", u=u, recent=recent, perday=perday, animals=animals,
                           missed={BOOKS[k]["name"]: len(v) for k, v in m.items()})


if __name__ == "__main__":
    app.run(debug=True)

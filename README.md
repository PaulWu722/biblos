# 信息島（biblos）

讀信息、答題、孵蛋，讓島上越來越熱鬧。文章來自李常受文集、倪柝聲文集（鼓嶺訓練記錄卷一）、新約總論、新約生命讀經、舊約生命讀經。

原始碼在 `island/`（Vite + TypeScript），用 `tools/deploy-island.sh` build 到 `docs/` 再 push 到 main 發布。信息島的存檔在 `biblos_island`（`supabase/island.sql`）；舊版玩家的發蛋腳本是 `supabase/legacy-eggs.sql`，舊版閱讀紀錄併入信息島並重算進度的腳本是 `supabase/legacy-reads.sql`。以下「功能」是舊版「聖經中的鑽石」的說明，`docs/` 已換成信息島。

- 網址：https://paulwu722.github.io/biblos/
- 網頁：`docs/`，用 GitHub Pages 從 `main` 分支的 `/docs` 發布，push 後約 1～2 分鐘更新。
- 資料庫：Supabase 專案 `PaulWu722's Project`（`gserdnkovlwfdgcaguqe`），表格是 `biblos_users`／`biblos_reads`／`biblos_zoo`／`biblos_config`。
  表格都開 RLS 且沒有 policy，網頁只能透過 `biblos_*` 函式存取。手機號碼只有後台函式會回傳。

## 功能
- 手機號碼登入（無密碼），第一次登入設暱稱。登入後瀏覽器記住一組 token。
- 閱讀頁：每篇有「完成閱讀」按鈕、朗讀（`docs/tts.js`，瀏覽器內建語音）、閱讀背景。
- 第幾篇 = (今天 − `START`) 天數，讀完自動循環；台灣時間換日。`START`、`GOAL` 在 `docs/app.js` 開頭。
- 每天讀完任意 3 篇得一隻小動物（100 種，在 `docs/animals/`），一天最多一隻。
- 奔跑賽程、各人動物園、過期未讀、個人設定（暱稱、用動物當頭像）。
- 後台：`#/admin`，輸入後台金鑰。金鑰只存 SHA-256 雜湊在 `biblos_config`；要換金鑰，在 Supabase SQL Editor 執行
  `update biblos_config set v = encode(extensions.digest('新金鑰', 'sha256'), 'hex') where k = 'admin_hash';`

## 文章資料
`docs/data/<書>/<篇>.json`（每篇一檔）與 `docs/data/titles.json`，由 `tools/split_data.py` 從原始的 `legacy/data/*.json` 產生（原始檔不放進 git）。

## 本機測試
```
python3 -m http.server 8000 -d docs
```
本機測試會連到正式的 Supabase 資料庫。

## 舊版
`legacy/` 是原本放在 PythonAnywhere 的 Flask 版，只留作參考。舊資料用 `tools/import_sqlite.py` 匯入 Supabase。

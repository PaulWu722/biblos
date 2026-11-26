# 把 legacy/data/*.json 切成 docs/data/<書>/<篇>.json 與 titles.json（網站只在需要時載入單篇）
import json, os
T = {}
for k in ['lee', 'nee', 'nt', 'lsnt', 'lsot']:
    d = json.load(open(f'legacy/data/{k}.json'))
    os.makedirs(f'docs/data/{k}', exist_ok=True)
    T[k] = [a['t'] for a in d]
    for i, a in enumerate(d):
        json.dump(a, open(f'docs/data/{k}/{i}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(T, open('docs/data/titles.json', 'w'), ensure_ascii=False, separators=(',', ':'))

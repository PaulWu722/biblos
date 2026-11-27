#!/bin/sh
# Build 信息島 into docs/ (GitHub Pages serves main:/docs). docs/data is the article data and stays as it is.
set -e
cd "$(dirname "$0")/.."
npm --prefix island run build
rm -rf docs/assets docs/eggs docs/scenes docs/quiz docs/animals docs/app.js docs/style.css docs/tts.js
rsync -a --exclude data island/dist/ docs/
echo "docs/ updated"

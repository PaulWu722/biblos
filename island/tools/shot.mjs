// Screenshot the island view like a phone (390x844 @2x) for comparing with scene-concepts/.
// Needs the dev server: npm run dev -- --port 5173. Usage: node tools/shot.mjs out.png [sceneId]
import { chromium } from '@playwright/test';
const [out = 'shot.png', scene = 'eden'] = process.argv.slice(2);
const species = { eden: ['rabbit', 'sheep', 'deer', 'dove'], ark: ['elephant', 'giraffe', 'zebra', 'raven'], wilderness: ['camel', 'donkey', 'quail'], bethlehem: ['lamb', 'sheepdog', 'ox', 'donkeyBlue'], galilee: ['fish', 'seagull', 'sheepCream', 'sparrow'], jerusalem: ['lion', 'lambGlow', 'leopard', 'eagle'] }[scene] ?? [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(([scene, species, order]) => {
  const t = new Date().toISOString();
  const animals = species.map((s, i) => ({ id: `shot${i}`, speciesId: s, level: 3, xp: 250, originSceneId: scene, createdAt: t, updatedAt: t }));
  localStorage.setItem('xinxi-island:v1', JSON.stringify({ version: 1, userId: 'shot', reads: [], pendingBatch: [{}, {}], eggs: [], animals, companions: [],
    currentSceneId: scene, unlockedSceneIds: order.slice(0, order.indexOf(scene) + 1), collection: {}, goldenScenes: [], lastResetAt: t, settings: { minReadSeconds: 90 } }));
}, [scene, species, ['eden', 'ark', 'wilderness', 'bethlehem', 'galilee', 'jerusalem']]);
await page.goto('http://localhost:5173/?local#/island');
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);

import type { SceneId } from './scenes';

export interface SpeciesConfig { id: string; name: string; scene: SceneId; }

// 24 species, 4 per scene (designstructure.md §3.2-3.7). Reused species in later scenes
// (donkey, sheep variants...) are listed once under the scene that introduces them.
export const SPECIES: SpeciesConfig[] = [
  { id: 'rabbit', name: '兔子', scene: 'eden' },
  { id: 'sheep', name: '羊', scene: 'eden' },
  { id: 'deer', name: '鹿', scene: 'eden' },
  { id: 'dove', name: '鴿子', scene: 'eden' },
  { id: 'elephant', name: '大象', scene: 'ark' },
  { id: 'giraffe', name: '長頸鹿', scene: 'ark' },
  { id: 'zebra', name: '斑馬', scene: 'ark' },
  { id: 'raven', name: '烏鴉', scene: 'ark' },
  { id: 'camel', name: '駱駝', scene: 'wilderness' },
  { id: 'donkey', name: '驢', scene: 'wilderness' },
  { id: 'quail', name: '鵪鶉', scene: 'wilderness' },
  { id: 'ibex', name: '野山羊', scene: 'wilderness' },
  { id: 'lamb', name: '羔羊', scene: 'bethlehem' },
  { id: 'sheepdog', name: '牧羊犬', scene: 'bethlehem' },
  { id: 'ox', name: '牛', scene: 'bethlehem' },
  { id: 'donkeyBlue', name: '小驢', scene: 'bethlehem' },
  { id: 'fish', name: '魚群', scene: 'galilee' },
  { id: 'seagull', name: '海鷗', scene: 'galilee' },
  { id: 'sheepCream', name: '奶油羊', scene: 'galilee' },
  { id: 'sparrow', name: '麻雀', scene: 'galilee' },
  { id: 'lion', name: '獅子', scene: 'jerusalem' },
  { id: 'lambGlow', name: '光羔羊', scene: 'jerusalem' },
  { id: 'leopard', name: '豹', scene: 'jerusalem' },
  { id: 'eagle', name: '鷹', scene: 'jerusalem' },
];
export const speciesById = (id: string): SpeciesConfig => {
  const s = SPECIES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown species ${id}`);
  return s;
};
export const speciesOfScene = (scene: SceneId): SpeciesConfig[] => SPECIES.filter((s) => s.scene === scene);

export type SceneId = 'eden' | 'ark' | 'wilderness' | 'bethlehem' | 'galilee' | 'jerusalem';

export interface SceneConfig {
  id: SceneId;
  order: number;
  name: string;
  /** Species whose first egg-guarantee (legendary) is this scene's signature animal. */
  signature: string;
}

export const SCENES: SceneConfig[] = [
  { id: 'eden', order: 1, name: '伊甸園', signature: 'deer' },
  { id: 'ark', order: 2, name: '亞拉臘山', signature: 'elephant' },
  { id: 'wilderness', order: 3, name: '西奈山', signature: 'camel' },
  { id: 'bethlehem', order: 4, name: '伯利恆的野地', signature: 'lamb' },
  { id: 'galilee', order: 5, name: '加利利海', signature: 'fish' },
  { id: 'jerusalem', order: 6, name: '新耶路撒冷', signature: 'lion' },
];
export const sceneById = (id: string): SceneConfig => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

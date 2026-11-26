import { RULES } from '../../config/rules';

const H = 3600_000;
/** Start (UTC ms) of the game day containing `now`; days roll over at 05:00 Taipei. */
export function gameDayStart(now: Date): number {
  const shift = (RULES.taipeiOffsetHours - RULES.resetHourTaipei) * H; // +3h
  return Math.floor((now.getTime() + shift) / (24 * H)) * 24 * H - shift;
}
export const isSameGameDay = (a: Date, b: Date): boolean => gameDayStart(a) === gameDayStart(b);

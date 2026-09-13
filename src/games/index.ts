import type { GameDefinition } from '../core/types';
import { wotr } from './wotr';

export const games: readonly GameDefinition[] = [wotr];

export function getGame(id: string): GameDefinition {
  const game = games.find((candidate) => candidate.id === id);
  if (!game) throw new Error(`Unsupported game: ${id}`);
  return game;
}

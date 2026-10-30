import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Dataset, Observation } from '../../src/types/data';

export const dataset: Dataset = JSON.parse(readFileSync(join(process.cwd(), 'public/data/budzse.json'), 'utf8'));

export function obs(id: string): Observation {
  const o = dataset.observations.find((x) => x.id === id);
  if (!o) throw new Error(`No observation ${id}`);
  return o;
}

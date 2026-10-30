import type { Dataset, Observation, Source } from '../../src/types/data';
import type { en } from '../../src/i18n/en';
import type { hu } from '../../src/i18n/hu';

type LabelGroup = 'indicators' | 'statuses' | 'statusHelp' | 'publishers' | 'scopes' | 'methods' | 'revisions';

export const ORIGIN: string;
export const LABELS: {
  hu: Pick<typeof hu, LabelGroup>;
  en: Pick<typeof en, LabelGroup>;
};
export function observationSchema(dataset: Dataset): unknown;
export function validateObservation(doc: unknown, observation: Observation, source: Source): string[];
export function observationDocument(
  dataset: Dataset,
  observation: Observation,
): {
  interpretation: { caveats: { id: string }[] };
  citation: { en: string };
};

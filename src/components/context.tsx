import { createContext, useContext } from 'react';
import type { Messages } from '../i18n';
import type { Measured } from '../lib/measure';
import type { ViewState } from '../lib/view';
import type { Dataset, Lang, Observation } from '../types/data';

export interface AppContextValue {
  data: Dataset;
  lang: Lang;
  m: Messages;
  view: ViewState;
  setView: (patch: Partial<ViewState>, mode?: 'push' | 'replace') => void;
  inspect: (obs: Observation, measured?: Measured | null) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp outside AppContext');
  return v;
}

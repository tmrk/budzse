import type { FiscalScope, Indicator, Lang, Method, Revision, Status } from '../types/data';
import { en } from './en';
import { hu } from './hu';

export type Messages = typeof hu;
export const MESSAGES: Record<Lang, Messages> = { hu, en };

export const indicatorName = (m: Messages, i: Indicator) => m.indicators[i];
export const statusName = (m: Messages, s: Status) => m.statuses[s];
export const scopeName = (m: Messages, s: FiscalScope) => m.scopes[s];
export const methodName = (m: Messages, x: Method) => m.methods[x];
export const revisionName = (m: Messages, r: Revision) => m.revisions[r];

// The shape of public/data/budzse.json, produced by scripts/transform/build-dataset.mjs.

export type Lang = 'hu' | 'en';
export type Localized = Record<Lang, string>;

export type Indicator =
  | 'revenue'
  | 'expenditure'
  | 'deficit'
  | 'gdp'
  | 'gni'
  | 'oda'
  | 'odaGe'
  | 'odaBilateral'
  | 'odaMultilateral'
  | 'odaPctGni'
  | 'revenuePctGdp'
  | 'expenditurePctGdp'
  | 'deficitPctGdp'
  | 'realGdpGrowth'
  | 'cpi';

export type FiscalScope = 'centralBudget' | 'centralSubsystem' | 'generalGovernment' | 'economy' | 'donor';

/**
 * original: budget act as first promulgated. revised: budget act main sums after statutory amendment.
 * draft: bill or draft, not law. planned: budget-time official projection that is not a legal main sum.
 * actual: full-year outturn. ytd: part-year execution. forecast: published official projection.
 */
export type Status = 'original' | 'revised' | 'draft' | 'planned' | 'actual' | 'ytd' | 'forecast';

export type Method = 'cash' | 'esa2010' | 'dacNet' | 'dacGrantEquivalent' | 'nationalAccounts' | 'cpiAnnualAverage';

export type Revision = 'final' | 'preliminary' | 'revised' | 'projection';

export interface Observation {
  id: string;
  year: number;
  indicator: Indicator;
  scope: FiscalScope;
  status: Status;
  method: Method;
  /** Normalised value: whole HUF for money, plain number for percentages. */
  value: number;
  unit: 'HUF' | 'pct';
  original: { value: string; unit: string; currency: string; usd?: string };
  institution: string;
  source: string;
  locator: string;
  revision: Revision;
  /** Who published a forecast, when several institutions forecast one year. */
  publisher?: 'ec' | 'gov';
  period?: string;
  evidence?: string;
  note?: Localized;
  /** Set when a figure rests on a secondary citation because the primary was unreachable. */
  secondary?: boolean;
  /** Formula when the figure is calculated at build time from other sourced inputs. */
  derivation?: { formula: string; inputs: string[]; rate?: number };
}

export interface Source {
  id: string;
  institution: Localized;
  title: string;
  url: string;
  publicationDate: string | null;
  /** Laws: the day Parliament adopted the act. */
  adoptedDate?: string | null;
  accessed: string;
  type: 'law' | 'dataset' | 'report' | 'secondary';
  licence?: string;
  note?: Localized;
}

export interface CpiYear {
  year: number;
  /** Published index, previous year = 100. */
  index: number;
  /** Chained level, 2000 = 100. */
  level: number;
  status: 'actual' | 'forecast';
  source: string;
  locator: string;
}

export interface Dataset {
  generatedAt: string;
  coverageYears: [number, number];
  observations: Observation[];
  sources: Record<string, Source>;
  cpi: {
    annual: CpiYear[];
    latestMonth: {
      month: string;
      /** Price level of that month relative to the annual average of baseYear. */
      factorVsBaseYear: number;
      baseYear: number;
      source: string;
    };
  };
  gaps: { id: string; indicator: Indicator | 'oda'; years: string; reason: Localized; searched: Localized }[];
  breaks: { year: number; scope: 'central'; note: Localized }[];
  fxCheck: { year: number; oecdImplied: number; mnbAverage: number; differencePct: number }[];
  latestUpdate: { label: string; date: string }[];
}

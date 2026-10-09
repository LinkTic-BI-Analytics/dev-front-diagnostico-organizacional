/**
 * Espejo de los DTOs de analítica del servidor
 * (`src/server/analytics/dto/analytics.dto.ts`), tal como llegan en JSON al navegador.
 * Nacieron replicados cuando la API era un proyecto aparte; ahora que viven en el mismo
 * proyecto se podrían importar de allí, pero un cambio en un lado obliga a revisar el otro.
 */

export interface ThresholdBand {
  label: string;
  minValue: number;
  maxValue: number;
  color: string;
}

/** Toda respuesta analítica llega envuelta así. */
export interface Envelope<T> {
  data: T | null;
  meta: {
    n: number;
    /** true cuando el corte no alcanza la cohorte mínima y el dato queda oculto. */
    insufficient: boolean;
    minCohortSize: number;
    generatedAt: string;
  };
}

export interface IndicatorResult {
  code: string;
  value: number | null;
  respondents: number;
  observations: number;
}

export interface NpsResult {
  code: string;
  value: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

export interface RadarPoint {
  code: string;
  label: string;
  value: number | null;
  band: ThresholdBand | null;
}

export interface OverviewPayload {
  imc: { value: number | null; band: ThresholdBand | null; respondents: number };
  nps: NpsResult;
  participation: { completed: number; population: number | null; rate: number | null };
  completion: { completed: number; started: number; rate: number | null };
  medianDurationSeconds: number | null;
  topValueArea: { code: string; name: string; mentions: number } | null;
  radar: RadarPoint[];
}

export interface IndicatorsPayload {
  indicators: IndicatorResult[];
  composite: IndicatorResult;
  nps: NpsResult;
  radar: RadarPoint[];
  thresholds: ThresholdBand[];
  weights: { indicatorCode: string; weight: number }[];
}

export interface DistributionRow {
  value: string;
  label: string;
  count: number;
  share: number;
}

export type CountedOption = DistributionRow;

export interface ComponentsPayload {
  indicators: (IndicatorResult & { label: string; band: ThresholdBand | null })[];
  composite: IndicatorResult;
  innovationNetwork: { sourceArea: string; targetArea: string; initiatives: number }[];
  thresholds: ThresholdBand[];
}

export interface RelationshipCell {
  sourceArea: string;
  targetArea: string;
  irel: number | null;
  iconf: number | null;
  ival: number | null;
  respondents: number;
  weight: number;
}

export interface AreaRankingRow {
  areaCode: string;
  areaName: string;
  irel: number | null;
  respondents: number;
}

export interface PerceptionGapRow {
  areaCode: string;
  areaName: string;
  received: number | null;
  granted: number | null;
  gap: number | null;
}

export interface AspectMatrixRow {
  areaCode: string;
  areaName: string;
  aspects: Record<string, number | null>;
  respondents: number;
}

export interface RelationshipPayload {
  map: {
    areas: { code: string; name: string }[];
    cells: RelationshipCell[];
    degrees: { areaCode: string; inbound: number; outbound: number }[];
  };
  suppressedCells: number;
  ranking: AreaRankingRow[];
  suppressedRanking: number;
  gap: PerceptionGapRow[];
  aspects: AspectMatrixRow[];
}

export interface NpsPayload {
  global: NpsResult;
  byArea: (NpsResult & { areaCode: string; areaName: string; respondents: number })[];
  motives: { promoters: CountedOption[]; detractors: CountedOption[] };
}

export interface OpenAnswer {
  id: string;
  text: string;
  theme: string | null;
  ownArea: string | null;
  submittedAt: string | null;
}

export interface QualitativePayload {
  barriers: CountedOption[];
  reworkProcesses: CountedOption[];
  areasToStrengthen: CountedOption[];
  npsMotives: { promoters: CountedOption[]; detractors: CountedOption[] };
  openAnswers: OpenAnswer[];
}

export interface AreaDetailPayload {
  area: { code: string; name: string; headcount: number | null };
  gap: PerceptionGapRow | null;
  gapBand: ThresholdBand | null;
  aspects: AspectMatrixRow | null;
  nps: NpsResult;
}

export interface ResponsesPayload {
  total: number;
  page: number;
  pageSize: number;
  rows: {
    id: string;
    ownArea: string | null;
    ownAreaName: string | null;
    ownAreaOther: string | null;
    respondentRole: string | null;
    respondentRoleLabel: string | null;
    submittedAt: string | null;
    durationSeconds: number | null;
    answerCount: number;
  }[];
}

export interface IndicesByAreaPayload {
  rows: {
    areaCode: string;
    areaName: string;
    respondents: number;
    indicators: Record<string, number | null>;
  }[];
  suppressed: number;
}

/**
 * Monitoreo de la recolección (`GET /admin/monitoring`). Es participación, no opinión: no
 * pasa por la cohorte mínima, porque se mira justo cuando hay pocas respuestas.
 */
export interface MonitoringPayload {
  timezone: 'America/Bogota';
  totals: {
    started: number;
    completed: number;
    drafts: number;
    /** Borradores con actividad en los últimos 30 minutos: gente respondiendo ahora. */
    activeNow: number;
    /** Borradores sin actividad hace más de 24 horas. */
    stalled: number;
    completionRate: number | null;
    population: number | null;
    participationRate: number | null;
    medianDurationSeconds: number | null;
    completedToday: number;
    lastSubmittedAt: string | null;
    lastActivityAt: string | null;
  };
  timeline: {
    date: string;
    started: number;
    completed: number;
    cumulativeStarted: number;
    cumulativeCompleted: number;
  }[];
  /** weekday 0 = lunes … 6 = domingo. Solo celdas con al menos un envío. */
  heatmap: { weekday: number; hour: number; completed: number }[];
  funnel: { componentId: number; title: string; reached: number }[];
  dropOff: { componentId: number; title: string; drafts: number }[];
  durations: { label: string; minSeconds: number; maxSeconds: number | null; count: number }[];
  byArea: {
    areaCode: string;
    areaName: string;
    procesoCode: string | null;
    procesoName: string | null;
    completed: number;
    drafts: number;
    headcount: number | null;
    participationRate: number | null;
  }[];
  byRole: { value: string; label: string; completed: number; drafts: number }[];
  unidentified: number;
}

/** Una afirmación 0-10 del instrumento, una por una (`GET /admin/items`). */
export interface ItemStat {
  code: string;
  label: string;
  componentId: number;
  componentTitle: string;
  /** Índice al que alimenta; `NPS_INT` para la pregunta de recomendación. */
  indicatorCode: string;
  respondents: number;
  observations: number;
  /** Promedio en la escala 0-10. */
  mean: number | null;
  /** El promedio llevado a 0-100, como los índices. */
  index: number | null;
  /** Desviación estándar en la escala 0-10. */
  sd: number | null;
  /** 0-100: 100 es que todos dieron la misma nota; 0, la dispersión máxima posible. */
  consensus: number | null;
  /** Cuántas veces se dio cada nota, del 0 al 10. */
  distribution: number[];
}

export interface ItemsPayload {
  items: ItemStat[];
}

/** Los índices vistos desde un nivel de cargo, o desde un grupo de niveles. */
export interface RoleIndicesRow {
  key: string;
  label: string;
  respondents: number;
  indicators: Record<string, number | null>;
  imc: number | null;
  nps: number | null;
}

export interface IndicesByRolePayload {
  roles: RoleIndicesRow[];
  suppressedRoles: number;
  groups: (RoleIndicesRow & { roles: string[] })[];
  suppressedGroups: number;
}

/** La red de interacción declarada en el componente 1 y lo que se dice de cada área. */
/**
 * KPI 32: zona en el plano de motricidad y dependencia. Motriz: mueve más de lo típico y
 * depende menos; de enlace: las dos por encima; dependiente: la mueven más de lo que mueve;
 * autónoma: las dos por debajo.
 */
export type InfluenceZone = 'MOTRIZ' | 'ENLACE' | 'DEPENDIENTE' | 'AUTONOMA';

export interface InfluenceNode {
  code: string;
  name: string;
  /** La gestión del área; `null` en el nivel de gestiones. */
  groupCode: string | null;
  groupName: string | null;
  /** Suma de la fuerza (1-3) de las relaciones en que otras dependen de esta. */
  motricidad: number;
  /** Suma de la fuerza de las relaciones en que esta depende de otras. */
  dependencia: number;
  /** Cuántas dependen de esta. */
  clients: number;
  /** De cuántas depende esta. */
  providers: number;
  zone: InfluenceZone;
  /** Personas que la evalúan. */
  receivedFrom: number;
  /** Personas de ella que evaluaron a otras. Con cero, su dependencia no se mide. */
  grantedBy: number;
  irelReceived: number | null;
  irelGranted: number | null;
}

/** «`from` mueve a `to`»: la gente de `to` trabaja con `from` y depende de lo que entrega. */
export interface InfluenceEdge {
  from: string;
  to: string;
  strength: 1 | 2 | 3;
  weight: number;
  respondents: number;
  /** IREL que `to` le da a `from`. */
  irel: number | null;
}

export interface InfluenceLevel {
  nodes: InfluenceNode[];
  /** Solo las relaciones que alcanzan la cohorte. */
  edges: InfluenceEdge[];
  suppressedEdges: number;
  internalPairs: number;
  /** La media que corta los dos ejes del plano. */
  mean: number;
  thresholds: { media: number; fuerte: number } | null;
}

export interface InfluencePayload {
  areas: InfluenceLevel;
  gestiones: InfluenceLevel;
}

export interface NetworkPayload {
  respondents: number;
  demand: {
    areaCode: string;
    areaName: string;
    procesoName: string | null;
    mentions: number;
    principal: number;
    mentionShare: number;
  }[];
  importance: { areaCode: string; areaName: string; mentions: number; irel: number; respondents: number }[];
  frequency: DistributionRow[];
  interactionTypes: CountedOption[];
  valueVsStrengthen: { areaCode: string; areaName: string; value: number; strengthen: number }[];
  innovation: {
    respondents: number;
    noneShare: number;
    connectedAreas: number;
    isolated: { areaCode: string; areaName: string }[];
  };
}

/** Qué tanto se puede confiar en el corte (`GET /admin/quality`). */
export interface QualityPayload {
  completed: number;
  speeders: { thresholdSeconds: number; count: number; share: number | null };
  straightLining: { count: number; share: number | null; minItems: number };
  flatComponents: { componentId: number; title: string; count: number; share: number | null }[];
  openAnswers: { count: number; share: number | null };
  otherSpecified: number;
}

export interface AdminFilters {
  campaignId?: string;
  ownArea?: string;
  respondentRole?: string;
  frecuencia?: string;
  tipoInteraccion?: string;
  from?: string;
  to?: string;
}

/** Etiquetas de los aspectos del componente 2, para la matriz. */
export const ASPECT_LABELS: Record<string, string> = {
  c2_facilidad: 'Facilidad para trabajar',
  c2_comunicacion: 'Comunicación',
  c2_confianza: 'Confianza',
  c2_cumplimiento: 'Cumplimiento',
  c2_valor: 'Generación de valor',
};

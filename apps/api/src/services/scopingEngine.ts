import { z } from 'zod';

export const ProjectCategoryEnum = z.enum([
  'WEBSITE_CREATION',
  'FULLSTACK',
  'MOBILE_APPS',
  'ECOMMERCE',
  'CUSTOM_INTEGRATION',
]);

export type ProjectCategory = z.infer<typeof ProjectCategoryEnum>;

export const ScopingInputSchema = z.object({
  category: ProjectCategoryEnum,
  hasBrandAssets: z.boolean(),
  hasWrittenContent: z.boolean(),
  hasDomainAndDns: z.boolean(),
  designPreference: z.enum(['component_library', 'bespoke_scratch']),
  hourlyRateCents: z.number().int().positive().optional().default(8000),
});

export type ScopingInput = z.infer<typeof ScopingInputSchema>;

export interface RuleAdjustment {
  rule: string;
  applied: boolean;
  type: 'deduction' | 'addition' | 'neutral';
  minHoursDelta: number;
  maxHoursDelta: number;
  reason: string;
}

export interface AppliedRulesSnapshot {
  category: ProjectCategory;
  baselineHours: {
    min: number;
    max: number;
  };
  adjustments: RuleAdjustment[];
  netAdjustment: {
    minHoursDelta: number;
    maxHoursDelta: number;
  };
  finalHourRange: {
    min: number;
    max: number;
  };
  hourlyRateCents: number;
  calculatedAt: string;
}

export interface ScopingResult {
  estimatedHourRange: [number, number];
  hourlyRateCents: number;
  totalEstimatedCostRangeCents: [number, number];
  initialDepositCents: number;
  appliedRulesSnapshot: AppliedRulesSnapshot;
}

// Category baselines [minHours, maxHours]
export const CATEGORY_BASELINES: Record<ProjectCategory, [number, number]> = {
  WEBSITE_CREATION: [30, 50],
  FULLSTACK: [60, 100],
  MOBILE_APPS: [70, 110],
  ECOMMERCE: [45, 75],
  CUSTOM_INTEGRATION: [25, 45],
};

const DEFAULT_HOURLY_RATE_CENTS = 8000; // $80.00/hour
const MIN_ALLOWED_HOURS = 10;

/**
 * Pure deterministic scoping engine calculator.
 * Computes estimated hour range, costs, deposit, and a frozen JSON rules snapshot.
 */
export function calculateProjectEstimate(input: ScopingInput): ScopingResult {
  const hourlyRate = input.hourlyRateCents ?? DEFAULT_HOURLY_RATE_CENTS;
  const [baseMin, baseMax] = CATEGORY_BASELINES[input.category] ?? [40, 70];

  const adjustments: RuleAdjustment[] = [];
  let minDelta = 0;
  let maxDelta = 0;

  // Rule 1: Brand Assets
  if (input.hasBrandAssets) {
    const deltaMin = -5;
    const deltaMax = -8;
    minDelta += deltaMin;
    maxDelta += deltaMax;
    adjustments.push({
      rule: 'hasBrandAssets',
      applied: true,
      type: 'deduction',
      minHoursDelta: deltaMin,
      maxHoursDelta: deltaMax,
      reason: 'Client provided logos, brand guidelines, and color palettes (-5h min / -8h max)',
    });
  } else {
    adjustments.push({
      rule: 'hasBrandAssets',
      applied: false,
      type: 'neutral',
      minHoursDelta: 0,
      maxHoursDelta: 0,
      reason: 'Brand assets not provided by client; no deduction applied',
    });
  }

  // Rule 2: Written Content
  if (input.hasWrittenContent) {
    const deltaMin = -4;
    const deltaMax = -6;
    minDelta += deltaMin;
    maxDelta += deltaMax;
    adjustments.push({
      rule: 'hasWrittenContent',
      applied: true,
      type: 'deduction',
      minHoursDelta: deltaMin,
      maxHoursDelta: deltaMax,
      reason: 'Client provided copy, media, and site content (-4h min / -6h max)',
    });
  } else {
    adjustments.push({
      rule: 'hasWrittenContent',
      applied: false,
      type: 'neutral',
      minHoursDelta: 0,
      maxHoursDelta: 0,
      reason: 'Written content not provided; placeholder copy will be required',
    });
  }

  // Rule 3: Domain & DNS
  if (input.hasDomainAndDns) {
    const deltaMin = -2;
    const deltaMax = -3;
    minDelta += deltaMin;
    maxDelta += deltaMax;
    adjustments.push({
      rule: 'hasDomainAndDns',
      applied: true,
      type: 'deduction',
      minHoursDelta: deltaMin,
      maxHoursDelta: deltaMax,
      reason: 'Client provisioned domain and configured DNS (-2h min / -3h max)',
    });
  } else {
    adjustments.push({
      rule: 'hasDomainAndDns',
      applied: false,
      type: 'neutral',
      minHoursDelta: 0,
      maxHoursDelta: 0,
      reason: 'Domain setup and DNS provisioning required by engineering team',
    });
  }

  // Rule 4: Design Preference
  if (input.designPreference === 'bespoke_scratch') {
    const deltaMin = 10;
    const deltaMax = 16;
    minDelta += deltaMin;
    maxDelta += deltaMax;
    adjustments.push({
      rule: 'designPreference_bespoke',
      applied: true,
      type: 'addition',
      minHoursDelta: deltaMin,
      maxHoursDelta: deltaMax,
      reason: 'Custom bespoke scratch UI/UX design and token system (+10h min / +16h max)',
    });
  } else {
    const deltaMin = -3;
    const deltaMax = -5;
    minDelta += deltaMin;
    maxDelta += deltaMax;
    adjustments.push({
      rule: 'designPreference_component_library',
      applied: true,
      type: 'deduction',
      minHoursDelta: deltaMin,
      maxHoursDelta: deltaMax,
      reason: 'Pre-built component library design acceleration (-3h min / -5h max)',
    });
  }

  // Apply hour bounds with safety floor
  const finalMinHours = Math.max(MIN_ALLOWED_HOURS, baseMin + minDelta);
  const finalMaxHours = Math.max(finalMinHours + 5, baseMax + maxDelta);

  const totalMinCostCents = finalMinHours * hourlyRate;
  const totalMaxCostCents = finalMaxHours * hourlyRate;
  const initialDepositCents = Math.round(totalMinCostCents * 0.5);

  const appliedRulesSnapshot: AppliedRulesSnapshot = {
    category: input.category,
    baselineHours: {
      min: baseMin,
      max: baseMax,
    },
    adjustments,
    netAdjustment: {
      minHoursDelta: minDelta,
      maxHoursDelta: maxDelta,
    },
    finalHourRange: {
      min: finalMinHours,
      max: finalMaxHours,
    },
    hourlyRateCents: hourlyRate,
    calculatedAt: new Date().toISOString(),
  };

  return {
    estimatedHourRange: [finalMinHours, finalMaxHours],
    hourlyRateCents: hourlyRate,
    totalEstimatedCostRangeCents: [totalMinCostCents, totalMaxCostCents],
    initialDepositCents,
    appliedRulesSnapshot,
  };
}


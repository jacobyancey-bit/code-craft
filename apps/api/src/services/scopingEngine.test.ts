import { describe, it, expect } from 'vitest';
import {
  calculateProjectEstimate,
  CATEGORY_BASELINES,
  ScopingInput,
} from './scopingEngine.js';

describe('Scoping Engine', () => {
  const baseInput: ScopingInput = {
    category: 'WEBSITE_CREATION',
    hasBrandAssets: false,
    hasWrittenContent: false,
    hasDomainAndDns: false,
    designPreference: 'component_library',
    hourlyRateCents: 8000,
  };

  it('correctly knocks hours off the total when toggling hasBrandAssets: true', () => {
    const withoutBrand = calculateProjectEstimate({
      ...baseInput,
      hasBrandAssets: false,
    });

    const withBrand = calculateProjectEstimate({
      ...baseInput,
      hasBrandAssets: true,
    });

    // Brand assets deduction is 5 min hours and 8 max hours
    expect(withBrand.estimatedHourRange[0]).toBe(withoutBrand.estimatedHourRange[0] - 5);
    expect(withBrand.estimatedHourRange[1]).toBe(withoutBrand.estimatedHourRange[1] - 8);

    // Costs and deposit should also reflect the hour reduction
    expect(withBrand.totalEstimatedCostRangeCents[0]).toBe(withoutBrand.totalEstimatedCostRangeCents[0] - 5 * 8000);
    expect(withBrand.initialDepositCents).toBe(
      Math.round(withBrand.totalEstimatedCostRangeCents[0] * 0.5)
    );

    // Verify snapshot records the rule
    const brandRule = withBrand.appliedRulesSnapshot.adjustments.find(
      (a) => a.rule === 'hasBrandAssets'
    );
    expect(brandRule).toBeDefined();
    expect(brandRule?.applied).toBe(true);
    expect(brandRule?.minHoursDelta).toBe(-5);
    expect(brandRule?.maxHoursDelta).toBe(-8);
  });

  it('correctly calculates deposit at exactly 50% of the minimum estimated cost', () => {
    const result = calculateProjectEstimate({
      ...baseInput,
      hasBrandAssets: true,
      hasWrittenContent: true,
      hasDomainAndDns: true,
      designPreference: 'bespoke_scratch',
    });

    const minCost = result.totalEstimatedCostRangeCents[0];
    expect(result.initialDepositCents).toBe(Math.round(minCost * 0.5));
  });

  it('adds custom design hours when bespoke_scratch is selected', () => {
    const componentLibrary = calculateProjectEstimate({
      ...baseInput,
      designPreference: 'component_library',
    });

    const bespoke = calculateProjectEstimate({
      ...baseInput,
      designPreference: 'bespoke_scratch',
    });

    // bespoke (+10) vs component_library (-3) = 13 hour min difference
    expect(bespoke.estimatedHourRange[0]).toBe(componentLibrary.estimatedHourRange[0] + 13);
  });

  it('respects different category baselines', () => {
    const webResult = calculateProjectEstimate({
      ...baseInput,
      category: 'WEBSITE_CREATION',
    });
    const fullstackResult = calculateProjectEstimate({
      ...baseInput,
      category: 'FULLSTACK',
    });

    const [webMin] = CATEGORY_BASELINES.WEBSITE_CREATION;
    const [fsMin] = CATEGORY_BASELINES.FULLSTACK;

    expect(fullstackResult.appliedRulesSnapshot.baselineHours.min).toBe(fsMin);
    expect(webResult.appliedRulesSnapshot.baselineHours.min).toBe(webMin);
  });
});


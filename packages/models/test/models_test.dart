import 'package:test/test.dart';
import 'package:codecraft_models/models.dart';

void main() {
  group('CodeCraft Dart Models', () {
    test('ScopingEstimate deserializes correctly from backend API JSON', () {
      final json = {
        'estimatedHourRange': [16, 28],
        'hourlyRateCents': 8000,
        'totalEstimatedCostRangeCents': [128000, 224000],
        'initialDepositCents': 64000,
        'appliedRulesSnapshot': {
          'category': 'WEBSITE_CREATION',
          'baselineHours': {'min': 30, 'max': 50},
          'adjustments': [
            {
              'rule': 'hasBrandAssets',
              'applied': true,
              'type': 'deduction',
              'minHoursDelta': -5,
              'maxHoursDelta': -8,
              'reason': 'Brand guidelines provided'
            }
          ],
          'netAdjustment': {'minHoursDelta': -5, 'maxHoursDelta': -8},
          'finalHourRange': {'min': 16, 'max': 28},
          'hourlyRateCents': 8000,
          'calculatedAt': '2026-11-06T22:20:00.000Z'
        }
      };

      final estimate = ScopingEstimate.fromJson(json);

      expect(estimate.minHours, 16.0);
      expect(estimate.maxHours, 28.0);
      expect(estimate.hourlyRateCents, 8000);
      expect(estimate.initialDepositCents, 64000);
      expect(estimate.initialDepositDollars, 640.0);
      expect(estimate.appliedRulesSnapshot.category, ProjectCategory.websiteCreation);
      expect(estimate.appliedRulesSnapshot.adjustments.length, 1);
      expect(estimate.appliedRulesSnapshot.adjustments[0].rule, 'hasBrandAssets');
    });

    test('Project remaining funded hours calculates properly', () {
      final project = Project(
        id: 'proj-123',
        title: 'Mobile App',
        category: ProjectCategory.mobileApps,
        status: ProjectStatus.inProgress,
        appliedRulesSnapshot: AppliedRulesSnapshot(
          category: ProjectCategory.mobileApps,
          baselineMinHours: 70,
          baselineMaxHours: 110,
          adjustments: [],
          netMinHoursDelta: 0,
          netMaxHoursDelta: 0,
          finalMinHours: 70,
          finalMaxHours: 110,
          hourlyRateCents: 8000,
          calculatedAt: DateTime.now(),
        ),
        minEstimatedHours: 70,
        maxEstimatedHours: 110,
        hourlyRateCents: 8000,
        hardCapHours: 115,
        fundedHours: 35.0,
        consumedHours: 12.5,
        clientId: 'client-1',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(project.remainingFundedHours, 22.5);
    });
  });
}


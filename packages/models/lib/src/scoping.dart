import 'enums.dart';
import 'rules.dart';

class ScopingInput {
  final ProjectCategory category;
  final bool hasBrandAssets;
  final bool hasWrittenContent;
  final bool hasDomainAndDns;
  final DesignPreference designPreference;
  final int hourlyRateCents;

  const ScopingInput({
    required this.category,
    required this.hasBrandAssets,
    required this.hasWrittenContent,
    required this.hasDomainAndDns,
    required this.designPreference,
    this.hourlyRateCents = 8000,
  });

  Map<String, dynamic> toJson() {
    return {
      'category': category.toJson(),
      'hasBrandAssets': hasBrandAssets,
      'hasWrittenContent': hasWrittenContent,
      'hasDomainAndDns': hasDomainAndDns,
      'designPreference': designPreference.toJson(),
      'hourlyRateCents': hourlyRateCents,
    };
  }
}

class ScopingEstimate {
  final double minHours;
  final double maxHours;
  final int hourlyRateCents;
  final int minCostCents;
  final int maxCostCents;
  final int initialDepositCents;
  final AppliedRulesSnapshot appliedRulesSnapshot;

  const ScopingEstimate({
    required this.minHours,
    required this.maxHours,
    required this.hourlyRateCents,
    required this.minCostCents,
    required this.maxCostCents,
    required this.initialDepositCents,
    required this.appliedRulesSnapshot,
  });

  factory ScopingEstimate.fromJson(Map<String, dynamic> json) {
    final hourRange = (json['estimatedHourRange'] as List<dynamic>?) ?? [0, 0];
    final costRange = (json['totalEstimatedCostRangeCents'] as List<dynamic>?) ?? [0, 0];

    return ScopingEstimate(
      minHours: (hourRange[0] as num).toDouble(),
      maxHours: (hourRange[1] as num).toDouble(),
      hourlyRateCents: (json['hourlyRateCents'] as num?)?.toInt() ?? 8000,
      minCostCents: (costRange[0] as num).toInt(),
      maxCostCents: (costRange[1] as num).toInt(),
      initialDepositCents: (json['initialDepositCents'] as num?)?.toInt() ?? 0,
      appliedRulesSnapshot: AppliedRulesSnapshot.fromJson(
        (json['appliedRulesSnapshot'] as Map<String, dynamic>?) ?? {},
      ),
    );
  }

  double get initialDepositDollars => initialDepositCents / 100.0;
  double get minCostDollars => minCostCents / 100.0;
  double get maxCostDollars => maxCostCents / 100.0;
}

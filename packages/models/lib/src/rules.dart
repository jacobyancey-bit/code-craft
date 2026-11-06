import 'enums.dart';

class RuleAdjustment {
  final String rule;
  final bool applied;
  final String type; // deduction, addition, neutral
  final double minHoursDelta;
  final double maxHoursDelta;
  final String reason;

  const RuleAdjustment({
    required this.rule,
    required this.applied,
    required this.type,
    required this.minHoursDelta,
    required this.maxHoursDelta,
    required this.reason,
  });

  factory RuleAdjustment.fromJson(Map<String, dynamic> json) {
    return RuleAdjustment(
      rule: json['rule'] as String,
      applied: json['applied'] as bool? ?? false,
      type: json['type'] as String? ?? 'neutral',
      minHoursDelta: (json['minHoursDelta'] as num?)?.toDouble() ?? 0.0,
      maxHoursDelta: (json['maxHoursDelta'] as num?)?.toDouble() ?? 0.0,
      reason: json['reason'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rule': rule,
      'applied': applied,
      'type': type,
      'minHoursDelta': minHoursDelta,
      'maxHoursDelta': maxHoursDelta,
      'reason': reason,
    };
  }
}

class AppliedRulesSnapshot {
  final ProjectCategory category;
  final double baselineMinHours;
  final double baselineMaxHours;
  final List<RuleAdjustment> adjustments;
  final double netMinHoursDelta;
  final double netMaxHoursDelta;
  final double finalMinHours;
  final double finalMaxHours;
  final int hourlyRateCents;
  final DateTime calculatedAt;

  const AppliedRulesSnapshot({
    required this.category,
    required this.baselineMinHours,
    required this.baselineMaxHours,
    required this.adjustments,
    required this.netMinHoursDelta,
    required this.netMaxHoursDelta,
    required this.finalMinHours,
    required this.finalMaxHours,
    required this.hourlyRateCents,
    required this.calculatedAt,
  });

  factory AppliedRulesSnapshot.fromJson(Map<String, dynamic> json) {
    final baseline = (json['baselineHours'] as Map<String, dynamic>?) ?? {};
    final net = (json['netAdjustment'] as Map<String, dynamic>?) ?? {};
    final finalHours = (json['finalHourRange'] as Map<String, dynamic>?) ?? {};
    final rawAdjustments = (json['adjustments'] as List<dynamic>?) ?? [];

    return AppliedRulesSnapshot(
      category: ProjectCategory.fromString(json['category'] as String? ?? 'WEBSITE_CREATION'),
      baselineMinHours: (baseline['min'] as num?)?.toDouble() ?? 30.0,
      baselineMaxHours: (baseline['max'] as num?)?.toDouble() ?? 50.0,
      adjustments: rawAdjustments
          .map((a) => RuleAdjustment.fromJson(a as Map<String, dynamic>))
          .toList(),
      netMinHoursDelta: (net['minHoursDelta'] as num?)?.toDouble() ?? 0.0,
      netMaxHoursDelta: (net['maxHoursDelta'] as num?)?.toDouble() ?? 0.0,
      finalMinHours: (finalHours['min'] as num?)?.toDouble() ?? 0.0,
      finalMaxHours: (finalHours['max'] as num?)?.toDouble() ?? 0.0,
      hourlyRateCents: (json['hourlyRateCents'] as num?)?.toInt() ?? 8000,
      calculatedAt: json['calculatedAt'] != null
          ? DateTime.parse(json['calculatedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category': category.toJson(),
      'baselineHours': {
        'min': baselineMinHours,
        'max': baselineMaxHours,
      },
      'adjustments': adjustments.map((a) => a.toJson()).toList(),
      'netAdjustment': {
        'minHoursDelta': netMinHoursDelta,
        'maxHoursDelta': netMaxHoursDelta,
      },
      'finalHourRange': {
        'min': finalMinHours,
        'max': finalMaxHours,
      },
      'hourlyRateCents': hourlyRateCents,
      'calculatedAt': calculatedAt.toIso8601String(),
    };
  }
}

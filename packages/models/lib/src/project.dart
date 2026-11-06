import 'enums.dart';
import 'rules.dart';
import 'user.dart';

class Project {
  final String id;
  final String title;
  final String? description;
  final ProjectCategory category;
  final ProjectStatus status;
  final AppliedRulesSnapshot appliedRulesSnapshot;
  final double minEstimatedHours;
  final double maxEstimatedHours;
  final int hourlyRateCents;
  final double hardCapHours;
  final double fundedHours;
  final double consumedHours;
  final String? stripeCustomerId;
  final String? defaultPaymentMethodId;
  final String? stripePaymentIntentId;
  final String? claimedById;
  final DateTime? claimHoldStartedAt;
  final DateTime? claimHoldExpiresAt;
  final bool isClaimConfirmed;
  final String clientId;
  final User? client;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Project({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.status,
    required this.appliedRulesSnapshot,
    required this.minEstimatedHours,
    required this.maxEstimatedHours,
    required this.hourlyRateCents,
    required this.hardCapHours,
    this.fundedHours = 0.0,
    this.consumedHours = 0.0,
    this.stripeCustomerId,
    this.defaultPaymentMethodId,
    this.stripePaymentIntentId,
    this.claimedById,
    this.claimHoldStartedAt,
    this.claimHoldExpiresAt,
    this.isClaimConfirmed = false,
    required this.clientId,
    this.client,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      category: ProjectCategory.fromString(json['category'] as String? ?? 'WEBSITE_CREATION'),
      status: ProjectStatus.fromString(json['status'] as String? ?? 'PENDING_DEPOSIT'),
      appliedRulesSnapshot: AppliedRulesSnapshot.fromJson(
        (json['appliedRulesSnapshot'] as Map<String, dynamic>?) ?? {},
      ),
      minEstimatedHours: (json['minEstimatedHours'] as num?)?.toDouble() ?? 0.0,
      maxEstimatedHours: (json['maxEstimatedHours'] as num?)?.toDouble() ?? 0.0,
      hourlyRateCents: (json['hourlyRateCents'] as num?)?.toInt() ?? 8000,
      hardCapHours: (json['hardCapHours'] as num?)?.toDouble() ?? 0.0,
      fundedHours: (json['fundedHours'] as num?)?.toDouble() ?? 0.0,
      consumedHours: (json['consumedHours'] as num?)?.toDouble() ?? 0.0,
      stripeCustomerId: json['stripeCustomerId'] as String?,
      defaultPaymentMethodId: json['defaultPaymentMethodId'] as String?,
      stripePaymentIntentId: json['stripePaymentIntentId'] as String?,
      claimedById: json['claimedById'] as String?,
      claimHoldStartedAt: json['claimHoldStartedAt'] != null
          ? DateTime.parse(json['claimHoldStartedAt'] as String)
          : null,
      claimHoldExpiresAt: json['claimHoldExpiresAt'] != null
          ? DateTime.parse(json['claimHoldExpiresAt'] as String)
          : null,
      isClaimConfirmed: json['isClaimConfirmed'] as bool? ?? false,
      clientId: json['clientId'] as String,
      client: json['client'] != null ? User.fromJson(json['client'] as Map<String, dynamic>) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  double get remainingFundedHours => fundedHours - consumedHours;

  bool get isHoldActive {
    if (claimHoldExpiresAt == null) return false;
    return claimHoldExpiresAt!.isAfter(DateTime.now());
  }

  Duration get remainingHoldDuration {
    if (claimHoldExpiresAt == null) return Duration.zero;
    final diff = claimHoldExpiresAt!.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }
}

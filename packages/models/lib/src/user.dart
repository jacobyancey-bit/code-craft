import 'enums.dart';

class User {
  final String id;
  final String email;
  final String? name;
  final Role role;
  final int activeJobs;
  final String? stripeCustomerId;
  final String? defaultPaymentMethodId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const User({
    required this.id,
    required this.email,
    this.name,
    this.role = Role.client,
    this.activeJobs = 0,
    this.stripeCustomerId,
    this.defaultPaymentMethodId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      role: Role.fromString((json['role'] as String?) ?? 'CLIENT'),
      activeJobs: (json['activeJobs'] as num?)?.toInt() ?? 0,
      stripeCustomerId: json['stripeCustomerId'] as String?,
      defaultPaymentMethodId: json['defaultPaymentMethodId'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role.toJson(),
      'activeJobs': activeJobs,
      'stripeCustomerId': stripeCustomerId,
      'defaultPaymentMethodId': defaultPaymentMethodId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

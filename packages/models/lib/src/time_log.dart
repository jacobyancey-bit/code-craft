class TimeLog {
  final String id;
  final String projectId;
  final String techId;
  final double hours;
  final String? notes;
  final String? gitCommitHash;
  final bool isAutoApproved;
  final bool autoApprovalTriggered;
  final DateTime? autoApprovedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TimeLog({
    required this.id,
    required this.projectId,
    required this.techId,
    required this.hours,
    this.notes,
    this.gitCommitHash,
    this.isAutoApproved = false,
    this.autoApprovalTriggered = false,
    this.autoApprovedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TimeLog.fromJson(Map<String, dynamic> json) {
    return TimeLog(
      id: json['id'] as String,
      projectId: json['projectId'] as String,
      techId: json['techId'] as String,
      hours: (json['hours'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'] as String?,
      gitCommitHash: json['gitCommitHash'] as String?,
      isAutoApproved: json['isAutoApproved'] as bool? ?? false,
      autoApprovalTriggered: json['autoApprovalTriggered'] as bool? ?? false,
      autoApprovedAt: json['autoApprovedAt'] != null
          ? DateTime.parse(json['autoApprovedAt'] as String)
          : null,
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
      'projectId': projectId,
      'techId': techId,
      'hours': hours,
      'notes': notes,
      'gitCommitHash': gitCommitHash,
      'isAutoApproved': isAutoApproved,
      'autoApprovalTriggered': autoApprovalTriggered,
      'autoApprovedAt': autoApprovedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

enum Role {
  client,
  tech,
  admin;

  static Role fromString(String value) {
    switch (value.toUpperCase()) {
      case 'CLIENT':
        return Role.client;
      case 'TECH':
        return Role.tech;
      case 'ADMIN':
        return Role.admin;
      default:
        return Role.client;
    }
  }

  String toJson() => name.toUpperCase();
}

enum ProjectCategory {
  websiteCreation,
  fullstack,
  mobileApps,
  ecommerce,
  customIntegration;

  static ProjectCategory fromString(String value) {
    switch (value.toUpperCase()) {
      case 'WEBSITE_CREATION':
        return ProjectCategory.websiteCreation;
      case 'FULLSTACK':
        return ProjectCategory.fullstack;
      case 'MOBILE_APPS':
        return ProjectCategory.mobileApps;
      case 'ECOMMERCE':
        return ProjectCategory.ecommerce;
      case 'CUSTOM_INTEGRATION':
        return ProjectCategory.customIntegration;
      default:
        return ProjectCategory.websiteCreation;
    }
  }

  String toJson() {
    switch (this) {
      case ProjectCategory.websiteCreation:
        return 'WEBSITE_CREATION';
      case ProjectCategory.fullstack:
        return 'FULLSTACK';
      case ProjectCategory.mobileApps:
        return 'MOBILE_APPS';
      case ProjectCategory.ecommerce:
        return 'ECOMMERCE';
      case ProjectCategory.customIntegration:
        return 'CUSTOM_INTEGRATION';
    }
  }

  String get displayName {
    switch (this) {
      case ProjectCategory.websiteCreation:
        return 'Website Creation';
      case ProjectCategory.fullstack:
        return 'Full-Stack Application';
      case ProjectCategory.mobileApps:
        return 'Mobile App (iOS & Android)';
      case ProjectCategory.ecommerce:
        return 'E-Commerce Platform';
      case ProjectCategory.customIntegration:
        return 'Custom Integration & API';
    }
  }
}

enum ProjectStatus {
  draft,
  pendingDeposit,
  openForClaim,
  open,
  claimed,
  inProgress,
  inReview,
  completed,
  cancelled;

  static ProjectStatus fromString(String value) {
    switch (value.toUpperCase()) {
      case 'DRAFT':
        return ProjectStatus.draft;
      case 'PENDING_DEPOSIT':
        return ProjectStatus.pendingDeposit;
      case 'OPEN_FOR_CLAIM':
        return ProjectStatus.openForClaim;
      case 'OPEN':
        return ProjectStatus.open;
      case 'CLAIMED':
        return ProjectStatus.claimed;
      case 'IN_PROGRESS':
        return ProjectStatus.inProgress;
      case 'IN_REVIEW':
        return ProjectStatus.inReview;
      case 'COMPLETED':
        return ProjectStatus.completed;
      case 'CANCELLED':
        return ProjectStatus.cancelled;
      default:
        return ProjectStatus.pendingDeposit;
    }
  }

  String toJson() {
    switch (this) {
      case ProjectStatus.draft:
        return 'DRAFT';
      case ProjectStatus.pendingDeposit:
        return 'PENDING_DEPOSIT';
      case ProjectStatus.openForClaim:
        return 'OPEN_FOR_CLAIM';
      case ProjectStatus.open:
        return 'OPEN';
      case ProjectStatus.claimed:
        return 'CLAIMED';
      case ProjectStatus.inProgress:
        return 'IN_PROGRESS';
      case ProjectStatus.inReview:
        return 'IN_REVIEW';
      case ProjectStatus.completed:
        return 'COMPLETED';
      case ProjectStatus.cancelled:
        return 'CANCELLED';
    }
  }

  String get label {
    switch (this) {
      case ProjectStatus.draft:
        return 'Draft';
      case ProjectStatus.pendingDeposit:
        return 'Pending 50% Deposit';
      case ProjectStatus.openForClaim:
      case ProjectStatus.open:
        return 'Open for Claim (FCFS)';
      case ProjectStatus.claimed:
        return 'Claim Hold (15 min)';
      case ProjectStatus.inProgress:
        return 'In Progress';
      case ProjectStatus.inReview:
        return 'In Review';
      case ProjectStatus.completed:
        return 'Completed';
      case ProjectStatus.cancelled:
        return 'Cancelled';
    }
  }
}

enum DesignPreference {
  componentLibrary,
  bespokeScratch;

  static DesignPreference fromString(String value) {
    if (value.toLowerCase() == 'bespoke_scratch') {
      return DesignPreference.bespokeScratch;
    }
    return DesignPreference.componentLibrary;
  }

  String toJson() {
    return this == DesignPreference.bespokeScratch
        ? 'bespoke_scratch'
        : 'component_library';
  }

  String get displayName {
    return this == DesignPreference.bespokeScratch
        ? 'Bespoke from Scratch'
        : 'Modern Component Library';
  }
}

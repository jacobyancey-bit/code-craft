import 'package:flutter/material.dart';
import 'theme.dart';

class StatusBadge extends StatelessWidget {
  final String label;
  final String status;

  const StatusBadge({
    super.key,
    required this.label,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    Color textColor;

    switch (status.toUpperCase()) {
      case 'OPEN_FOR_CLAIM':
      case 'OPEN':
        badgeColor = CodeCraftTheme.accent.withValues(alpha: 0.15);
        textColor = CodeCraftTheme.accent;
        break;
      case 'CLAIMED':
        badgeColor = CodeCraftTheme.warning.withValues(alpha: 0.15);
        textColor = CodeCraftTheme.warning;
        break;
      case 'IN_PROGRESS':
        badgeColor = CodeCraftTheme.primary.withValues(alpha: 0.15);
        textColor = CodeCraftTheme.primaryLight;
        break;
      case 'COMPLETED':
        badgeColor = Colors.green.withValues(alpha: 0.15);
        textColor = Colors.green;
        break;
      default: // PENDING_DEPOSIT / DRAFT
        badgeColor = Colors.blueGrey.withValues(alpha: 0.2);
        textColor = CodeCraftTheme.textMuted;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: textColor.withValues(alpha: 0.3), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

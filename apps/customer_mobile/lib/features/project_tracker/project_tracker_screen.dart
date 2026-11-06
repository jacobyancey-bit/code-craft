import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';

class ProjectTrackerScreen extends StatelessWidget {
  final CodeCraftApiClient apiClient;
  final Project project;

  const ProjectTrackerScreen({
    super.key,
    required this.apiClient,
    required this.project,
  });

  @override
  Widget build(BuildContext context) {
    final remaining = project.remainingFundedHours;
    final progress = project.fundedHours > 0
        ? (project.consumedHours / project.fundedHours).clamp(0.0, 1.0)
        : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Project Tracker'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    project.title,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                ),
                StatusBadge(
                  label: project.status.label,
                  status: project.status.toJson(),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Drawdown Balance Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: CodeCraftTheme.darkSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: CodeCraftTheme.primary.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Drawdown Hour Balance',
                    style: TextStyle(color: CodeCraftTheme.textMuted, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${remaining.toStringAsFixed(1)} hrs',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: CodeCraftTheme.accent,
                        ),
                      ),
                      Text(
                        'of ${project.fundedHours.toStringAsFixed(1)} hrs funded',
                        style: const TextStyle(color: CodeCraftTheme.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 10,
                      backgroundColor: CodeCraftTheme.darkSurfaceCard,
                      valueColor: const AlwaysStoppedAnimation(CodeCraftTheme.accent),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${project.consumedHours.toStringAsFixed(1)} hours logged by technician',
                    style: const TextStyle(fontSize: 12, color: CodeCraftTheme.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Metrics Grid
            Row(
              children: [
                Expanded(
                  child: MetricStatCard(
                    label: 'Hard Cap',
                    value: '${project.hardCapHours.toInt()}h',
                    subtitle: 'Overrun Protection',
                    icon: Icons.shield_outlined,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricStatCard(
                    label: 'Rate',
                    value: '\$${(project.hourlyRateCents / 100).toInt()}/h',
                    subtitle: 'Guaranteed',
                    icon: Icons.attach_money,
                    accentColor: CodeCraftTheme.accent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Applied Rules Snapshot Breakdown
            const Text(
              'Applied Scoping Snapshot',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: CodeCraftTheme.darkSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: project.appliedRulesSnapshot.adjustments.map((adj) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          adj.applied ? Icons.check_circle_outline : Icons.remove_circle_outline,
                          size: 18,
                          color: adj.applied ? CodeCraftTheme.accent : CodeCraftTheme.textMuted,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            adj.reason,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

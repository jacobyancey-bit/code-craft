import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';
import '../time_logging/time_logging_screen.dart';

class FCFSRadarScreen extends StatefulWidget {
  final CodeCraftApiClient apiClient;
  final String techId;

  const FCFSRadarScreen({
    super.key,
    required this.apiClient,
    required this.techId,
  });

  @override
  State<FCFSRadarScreen> createState() => _FCFSRadarScreenState();
}

class _FCFSRadarScreenState extends State<FCFSRadarScreen> {
  List<Project> _jobs = [];
  bool _isLoading = false;
  String? _errorMessage;
  String? _claimingProjectId;

  @override
  void initState() {
    super.initState();
    _loadAvailableJobs();
  }

  Future<void> _loadAvailableJobs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final jobs = await widget.apiClient.getAvailableJobs(widget.techId);
      setState(() {
        _jobs = jobs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _claimJob(Project project) async {
    setState(() => _claimingProjectId = project.id);

    try {
      await widget.apiClient.claimJob(project.id, widget.techId);
      await _loadAvailableJobs();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Claim hold acquired! You have 15 minutes to confirm.'),
          backgroundColor: CodeCraftTheme.warning,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: CodeCraftTheme.error),
      );
    } finally {
      if (mounted) setState(() => _claimingProjectId = null);
    }
  }

  Future<void> _confirmJob(Project project) async {
    setState(() => _claimingProjectId = project.id);

    try {
      await widget.apiClient.confirmJob(project.id, widget.techId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Job confirmed! Moved to IN_PROGRESS.'),
          backgroundColor: CodeCraftTheme.accent,
        ),
      );

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => TimeLoggingScreen(
            apiClient: widget.apiClient,
            project: project,
            techId: widget.techId,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: CodeCraftTheme.error),
      );
    } finally {
      if (mounted) setState(() => _claimingProjectId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FCFS Job Radar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAvailableJobs,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: CodeCraftTheme.error),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        CodeCraftButton(label: 'Retry', onPressed: _loadAvailableJobs),
                      ],
                    ),
                  ),
                )
              : _jobs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.radar, size: 64, color: CodeCraftTheme.primary.withValues(alpha: 0.5)),
                          const SizedBox(height: 16),
                          const Text(
                            'Scanning for incoming jobs...',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'New jobs appear here in real-time as soon as clients deposit.',
                            style: TextStyle(fontSize: 13, color: CodeCraftTheme.textMuted),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _jobs.length,
                      itemBuilder: (context, index) {
                        final job = _jobs[index];
                        final isClaiming = _claimingProjectId == job.id;
                        final isHeldByMe = job.claimedById == widget.techId;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: CodeCraftTheme.darkSurface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isHeldByMe
                                  ? CodeCraftTheme.warning
                                  : const Color(0xFF334155),
                              width: isHeldByMe ? 1.5 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      job.title,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  StatusBadge(
                                    label: job.status.label,
                                    status: job.status.toJson(),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                job.category.displayName,
                                style: const TextStyle(
                                  color: CodeCraftTheme.primaryLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Quick metrics
                              Row(
                                children: [
                                  _pill(Icons.schedule, '${job.minEstimatedHours.toInt()}-${job.maxEstimatedHours.toInt()}h scope'),
                                  const SizedBox(width: 8),
                                  _pill(Icons.account_balance_wallet_outlined, '${job.fundedHours.toStringAsFixed(1)}h funded'),
                                  const SizedBox(width: 8),
                                  _pill(Icons.attach_money, '\$${(job.hourlyRateCents / 100).toInt()}/h'),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Hold countdown if claimed by me
                              if (isHeldByMe && job.claimHoldExpiresAt != null) ...[
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    HoldCountdownTimer(
                                      expiresAt: job.claimHoldExpiresAt!,
                                      onExpired: _loadAvailableJobs,
                                    ),
                                    CodeCraftButton(
                                      label: 'Confirm Job',
                                      icon: Icons.check,
                                      isLoading: isClaiming,
                                      onPressed: () => _confirmJob(job),
                                    ),
                                  ],
                                ),
                              ] else ...[
                                SizedBox(
                                  width: double.infinity,
                                  child: CodeCraftButton(
                                    label: 'Claim Job (15-min Hold)',
                                    icon: Icons.touch_app_outlined,
                                    isLoading: isClaiming,
                                    onPressed: () => _claimJob(job),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
    );
  }

  Widget _pill(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: CodeCraftTheme.darkSurfaceCard,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: CodeCraftTheme.textMuted),
          const SizedBox(width: 4),
          Text(text, style: const TextStyle(fontSize: 12, color: CodeCraftTheme.textMuted)),
        ],
      ),
    );
  }
}


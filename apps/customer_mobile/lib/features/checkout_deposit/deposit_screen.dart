import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';
import '../project_tracker/project_tracker_screen.dart';

class DepositScreen extends StatefulWidget {
  final CodeCraftApiClient apiClient;
  final Project project;
  final int initialDepositCents;

  const DepositScreen({
    super.key,
    required this.apiClient,
    required this.project,
    required this.initialDepositCents,
  });

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handlePayment() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Create deposit session
      await widget.apiClient.createDepositSession(widget.project.id);

      // In real mobile app, launch Stripe mobile SDK sheet.
      // For this workflow, transition project to funded and navigate to live tracker
      if (!mounted) return;
      setState(() => _isLoading = false);

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ProjectTrackerScreen(
            apiClient: widget.apiClient,
            project: widget.project,
          ),
        ),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final depositDollars = widget.initialDepositCents / 100.0;
    final initialFundedHours = widget.project.minEstimatedHours * 0.5;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fund Initial Drawdown Block'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.project.title,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            StatusBadge(
              label: widget.project.status.label,
              status: widget.project.status.toJson(),
            ),
            const SizedBox(height: 24),

            // Card Breakdown
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: CodeCraftTheme.darkSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  _row('Initial Drawdown Block', '${initialFundedHours.toStringAsFixed(1)} hours'),
                  const SizedBox(height: 12),
                  _row('Hourly Rate', '\$80 / hour'),
                  const SizedBox(height: 12),
                  _row('Estimated Range', '${widget.project.minEstimatedHours.toInt()} - ${widget.project.maxEstimatedHours.toInt()} hrs'),
                  const SizedBox(height: 12),
                  _row('Safety Hard Cap', '${widget.project.hardCapHours.toInt()} hrs'),
                  const Divider(height: 24, color: Color(0xFF334155)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Due Today (50%):',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        '\$${depositDollars.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: CodeCraftTheme.warning,
                          fontWeight: FontWeight.bold,
                          fontSize: 24,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              '🔒 Card will be vaulted off-session for seamless 20-hour replenishment blocks once remaining hours drop below 5.',
              style: TextStyle(fontSize: 13, color: CodeCraftTheme.textMuted),
            ),
            const Spacer(),
            if (_errorMessage != null) ...[
              Text(_errorMessage!, style: const TextStyle(color: CodeCraftTheme.error)),
              const SizedBox(height: 12),
            ],
            SizedBox(
              width: double.infinity,
              child: CodeCraftButton(
                label: 'Authorize & Deposit \$${depositDollars.toStringAsFixed(0)}',
                icon: Icons.credit_card,
                isLoading: _isLoading,
                onPressed: _handlePayment,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: CodeCraftTheme.textMuted)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}

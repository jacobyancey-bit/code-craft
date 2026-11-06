import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';

class TimeLoggingScreen extends StatefulWidget {
  final CodeCraftApiClient apiClient;
  final Project project;
  final String techId;

  const TimeLoggingScreen({
    super.key,
    required this.apiClient,
    required this.project,
    required this.techId,
  });

  @override
  State<TimeLoggingScreen> createState() => _TimeLoggingScreenState();
}

class _TimeLoggingScreenState extends State<TimeLoggingScreen> {
  final _hoursController = TextEditingController(text: '3.5');
  final _notesController = TextEditingController();
  final _commitController = TextEditingController(text: 'a1b2c3d4e5f6789012345678901234567890abcd');

  bool _isLoading = false;
  String? _successMessage;
  String? _errorMessage;

  double _consumedHours = 0.0;
  double _fundedHours = 0.0;

  @override
  void initState() {
    super.initState();
    _consumedHours = widget.project.consumedHours;
    _fundedHours = widget.project.fundedHours;
  }

  Future<void> _submitLog() async {
    final hours = double.tryParse(_hoursController.text.trim());
    if (hours == null || hours <= 0 || hours > 8.0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid duration between 0.1 and 8.0 hours')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final res = await widget.apiClient.logTime(
        projectId: widget.project.id,
        techId: widget.techId,
        hoursLogged: hours,
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
        gitCommitHash: _commitController.text.trim().isNotEmpty ? _commitController.text.trim() : null,
      );

      final balance = res['balance'] as Map<String, dynamic>;
      final autoReplenish = balance['autoReplenishTriggered'] as bool? ?? false;

      setState(() {
        _consumedHours = (balance['consumedHours'] as num).toDouble();
        _fundedHours = (balance['fundedHours'] as num).toDouble();
        _isLoading = false;
        _successMessage = autoReplenish
            ? '✅ Time logged! Remaining balance was <= 5h: Auto-replenished +20 hours off-session!'
            : '✅ Successfully logged ${hours.toStringAsFixed(1)} hours.';
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final remaining = _fundedHours - _consumedHours;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Time Logger'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.project.title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Remaining drawdown pill
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: CodeCraftTheme.darkSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Remaining Balance', style: TextStyle(color: CodeCraftTheme.textMuted, fontSize: 13)),
                      Text(
                        '${remaining.toStringAsFixed(1)} hrs',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: CodeCraftTheme.accent),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Consumed', style: TextStyle(color: CodeCraftTheme.textMuted, fontSize: 13)),
                      Text(
                        '${_consumedHours.toStringAsFixed(1)} / ${_fundedHours.toStringAsFixed(1)}h',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Form inputs
            TextField(
              controller: _hoursController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Hours Worked (Max 8.0h)',
                filled: true,
                fillColor: CodeCraftTheme.darkSurface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _commitController,
              decoration: InputDecoration(
                labelText: 'Git Commit Hash (SHA verification)',
                hintText: 'e.g., 40-char hex commit hash',
                filled: true,
                fillColor: CodeCraftTheme.darkSurface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Task Notes & Deliverables',
                filled: true,
                fillColor: CodeCraftTheme.darkSurface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 24),

            if (_successMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: CodeCraftTheme.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: CodeCraftTheme.accent.withValues(alpha: 0.4)),
                ),
                child: Text(_successMessage!, style: const TextStyle(color: CodeCraftTheme.accent)),
              ),
              const SizedBox(height: 16),
            ],

            if (_errorMessage != null) ...[
              Text(_errorMessage!, style: const TextStyle(color: CodeCraftTheme.error)),
              const SizedBox(height: 16),
            ],

            SizedBox(
              width: double.infinity,
              child: CodeCraftButton(
                label: 'Submit Time Log & Verify Commit',
                icon: Icons.history_toggle_off,
                isLoading: _isLoading,
                onPressed: _submitLog,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

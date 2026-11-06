import 'dart:async';
import 'package:flutter/material.dart';
import 'theme.dart';

class HoldCountdownTimer extends StatefulWidget {
  final DateTime expiresAt;
  final VoidCallback? onExpired;

  const HoldCountdownTimer({
    super.key,
    required this.expiresAt,
    this.onExpired,
  });

  @override
  State<HoldCountdownTimer> createState() => _HoldCountdownTimerState();
}

class _HoldCountdownTimerState extends State<HoldCountdownTimer> {
  late Timer _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateRemaining());
  }

  void _updateRemaining() {
    final diff = widget.expiresAt.difference(DateTime.now());
    if (diff.isNegative) {
      if (mounted) {
        setState(() => _remaining = Duration.zero);
      }
      _timer.cancel();
      widget.onExpired?.call();
    } else {
      if (mounted) {
        setState(() => _remaining = diff);
      }
    }
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final minutes = _remaining.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = _remaining.inSeconds.remainder(60).toString().padLeft(2, '0');

    final isUrgent = _remaining.inMinutes < 3;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: (isUrgent ? CodeCraftTheme.error : CodeCraftTheme.warning).withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: (isUrgent ? CodeCraftTheme.error : CodeCraftTheme.warning).withOpacity(0.4),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.timer_outlined,
            size: 16,
            color: isUrgent ? CodeCraftTheme.error : CodeCraftTheme.warning,
          ),
          const SizedBox(width: 6),
          Text(
            'Hold: $minutes:$seconds',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isUrgent ? CodeCraftTheme.error : CodeCraftTheme.warning,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}

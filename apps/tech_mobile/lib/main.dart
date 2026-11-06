import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';
import 'features/fcfs_radar/fcfs_radar_screen.dart';

void main() {
  final apiClient = CodeCraftApiClient(baseUrl: 'http://localhost:4000');
  // Seed demo technician UUID
  const defaultTechId = '783afeb5-a24b-413d-a0f5-dd05875ba1b0';
  runApp(TechMobileApp(apiClient: apiClient, techId: defaultTechId));
}

class TechMobileApp extends StatelessWidget {
  final CodeCraftApiClient apiClient;
  final String techId;

  const TechMobileApp({
    super.key,
    required this.apiClient,
    required this.techId,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Code_Craft Technician',
      theme: CodeCraftTheme.darkTheme,
      debugShowCheckedModeBanner: false,
      home: FCFSRadarScreen(apiClient: apiClient, techId: techId),
    );
  }
}


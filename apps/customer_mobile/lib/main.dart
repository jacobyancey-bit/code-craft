import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';
import 'features/intake_wizard/intake_wizard_screen.dart';

void main() {
  final apiClient = CodeCraftApiClient(baseUrl: 'http://localhost:4000');
  runApp(CustomerMobileApp(apiClient: apiClient));
}

class CustomerMobileApp extends StatelessWidget {
  final CodeCraftApiClient apiClient;

  const CustomerMobileApp({super.key, required this.apiClient});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Code_Craft Customer',
      theme: CodeCraftTheme.darkTheme,
      debugShowCheckedModeBanner: false,
      home: IntakeWizardScreen(apiClient: apiClient),
    );
  }
}


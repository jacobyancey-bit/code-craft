import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:tech_mobile/main.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('TechMobileApp boots and displays FCFS Job Radar', (WidgetTester tester) async {
    final mockClient = MockClient((request) async {
      return http.Response(
        jsonEncode({
          'techId': 'tech-123',
          'activeJobs': 0,
          'unlockedCategories': ['WEBSITE_CREATION'],
          'availableProjects': [],
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final client = CodeCraftApiClient(baseUrl: 'http://localhost:4000', client: mockClient);
    await tester.pumpWidget(TechMobileApp(apiClient: client, techId: 'tech-123'));
    await tester.pumpAndSettle();

    expect(find.text('FCFS Job Radar'), findsOneWidget);
    expect(find.text('Scanning for incoming jobs...'), findsOneWidget);
  });
}


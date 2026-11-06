import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:customer_mobile/main.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('CustomerMobileApp boots and displays New Project Intake', (WidgetTester tester) async {
    final mockClient = MockClient((request) async {
      return http.Response(
        jsonEncode({
          'estimatedHourRange': [20, 35],
          'hourlyRateCents': 8000,
          'totalEstimatedCostRangeCents': [160000, 280000],
          'initialDepositCents': 80000,
          'appliedRulesSnapshot': {
            'category': 'WEBSITE_CREATION',
            'baselineHours': {'min': 30, 'max': 50},
            'adjustments': [],
            'netAdjustment': {'minHoursDelta': -10, 'maxHoursDelta': -15},
            'finalHourRange': {'min': 20, 'max': 35},
            'hourlyRateCents': 8000,
            'calculatedAt': '2026-11-06T22:00:00.000Z'
          }
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final client = CodeCraftApiClient(baseUrl: 'http://localhost:4000', client: mockClient);
    await tester.pumpWidget(CustomerMobileApp(apiClient: client));
    await tester.pumpAndSettle();

    expect(find.text('New Project Intake'), findsOneWidget);
    expect(find.text('Project Title'), findsOneWidget);
    expect(find.text('Your Email'), findsOneWidget);
  });
}

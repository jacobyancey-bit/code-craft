import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';
import 'package:codecraft_api_client/api_client.dart';

void main() {
  group('CodeCraftApiClient Tests', () {
    test('getHealth returns status ok', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/health');
        return http.Response(
          jsonEncode({
            'status': 'ok',
            'timestamp': '2026-11-06T22:00:00.000Z',
            'database': 'connected',
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final api = CodeCraftApiClient(baseUrl: 'http://localhost:4000', client: mockClient);
      final health = await api.getHealth();

      expect(health['status'], 'ok');
      expect(health['database'], 'connected');
    });

    test('estimateProject sends payload and parses ScopingEstimate', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/projects/estimate');
        final decoded = jsonDecode(request.body);
        expect(decoded['category'], 'WEBSITE_CREATION');
        expect(decoded['hasBrandAssets'], true);

        return http.Response(
          jsonEncode({
            'estimatedHourRange': [18, 31],
            'hourlyRateCents': 8000,
            'totalEstimatedCostRangeCents': [144000, 248000],
            'initialDepositCents': 72000,
            'appliedRulesSnapshot': {
              'category': 'WEBSITE_CREATION',
              'baselineHours': {'min': 30, 'max': 50},
              'adjustments': [],
              'netAdjustment': {'minHoursDelta': -12, 'maxHoursDelta': -19},
              'finalHourRange': {'min': 18, 'max': 31},
              'hourlyRateCents': 8000,
              'calculatedAt': '2026-11-06T22:00:00.000Z'
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final api = CodeCraftApiClient(baseUrl: 'http://localhost:4000', client: mockClient);
      final estimate = await api.estimateProject(
        const ScopingInput(
          category: ProjectCategory.websiteCreation,
          hasBrandAssets: true,
          hasWrittenContent: true,
          hasDomainAndDns: false,
          designPreference: DesignPreference.componentLibrary,
        ),
      );

      expect(estimate.minHours, 18.0);
      expect(estimate.maxHours, 31.0);
      expect(estimate.initialDepositCents, 72000);
      expect(estimate.initialDepositDollars, 720.0);
    });

    test('claimJob hits /api/tech/jobs/:id/claim', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/tech/jobs/proj-123/claim');
        final body = jsonDecode(request.body);
        expect(body['techId'], 'tech-456');

        return http.Response(
          jsonEncode({
            'success': true,
            'projectId': 'proj-123',
            'status': 'CLAIMED',
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final api = CodeCraftApiClient(baseUrl: 'http://localhost:4000', client: mockClient);
      final res = await api.claimJob('proj-123', 'tech-456');

      expect(res['success'], true);
      expect(res['status'], 'CLAIMED');
    });
  });
}

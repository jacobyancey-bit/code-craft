import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:codecraft_models/models.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic details;

  ApiException(this.statusCode, this.message, [this.details]);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class CodeCraftApiClient {
  final String baseUrl;
  final http.Client _client;

  CodeCraftApiClient({
    this.baseUrl = 'http://localhost:4000',
    http.Client? client,
  }) : _client = client ?? http.Client();

  Uri _uri(String path, [Map<String, dynamic>? queryParameters]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$baseUrl$cleanPath';
    final uri = Uri.parse(fullUrl);
    if (queryParameters != null && queryParameters.isNotEmpty) {
      return uri.replace(
        queryParameters: queryParameters.map((k, v) => MapEntry(k, v.toString())),
      );
    }
    return uri;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  dynamic _handleResponse(http.Response response) {
    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      body = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final message = (body is Map && body['message'] != null)
        ? body['message'] as String
        : 'Request failed with status ${response.statusCode}';
    throw ApiException(response.statusCode, message, body);
  }

  // GET /health
  Future<Map<String, dynamic>> getHealth() async {
    final res = await _client.get(_uri('/health'), headers: _headers);
    return _handleResponse(res) as Map<String, dynamic>;
  }

  // POST /api/projects/estimate
  Future<ScopingEstimate> estimateProject(ScopingInput input) async {
    final res = await _client.post(
      _uri('/api/projects/estimate'),
      headers: _headers,
      body: jsonEncode(input.toJson()),
    );
    final data = _handleResponse(res) as Map<String, dynamic>;
    return ScopingEstimate.fromJson(data);
  }

  // POST /api/projects
  Future<Map<String, dynamic>> createProject({
    required String clientEmail,
    String? clientName,
    required String title,
    String? description,
    required ProjectCategory category,
    required bool hasBrandAssets,
    required bool hasWrittenContent,
    required bool hasDomainAndDns,
    required DesignPreference designPreference,
    int? hourlyRateCents,
  }) async {
    final payload = {
      'client': {
        'email': clientEmail,
        if (clientName != null) 'name': clientName,
      },
      'title': title,
      if (description != null) 'description': description,
      'category': category.toJson(),
      'hasBrandAssets': hasBrandAssets,
      'hasWrittenContent': hasWrittenContent,
      'hasDomainAndDns': hasDomainAndDns,
      'designPreference': designPreference.toJson(),
      if (hourlyRateCents != null) 'hourlyRateCents': hourlyRateCents,
    };

    final res = await _client.post(
      _uri('/api/projects'),
      headers: _headers,
      body: jsonEncode(payload),
    );
    final data = _handleResponse(res) as Map<String, dynamic>;
    return {
      'project': Project.fromJson(data['project'] as Map<String, dynamic>),
      'initialDepositCents': data['initialDepositCents'],
      'totalEstimatedCostRangeCents': data['totalEstimatedCostRangeCents'],
    };
  }

  // POST /api/payments/create-deposit-session
  Future<Map<String, dynamic>> createDepositSession(String projectId) async {
    final res = await _client.post(
      _uri('/api/payments/create-deposit-session'),
      headers: _headers,
      body: jsonEncode({'projectId': projectId}),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  // GET /api/tech/jobs/available?techId=...
  Future<List<Project>> getAvailableJobs(String techId) async {
    final res = await _client.get(
      _uri('/api/tech/jobs/available', {'techId': techId}),
      headers: _headers,
    );
    final data = _handleResponse(res) as Map<String, dynamic>;
    final projects = (data['availableProjects'] as List<dynamic>?) ?? [];
    return projects.map((p) => Project.fromJson(p as Map<String, dynamic>)).toList();
  }

  // POST /api/tech/jobs/:projectId/claim
  Future<Map<String, dynamic>> claimJob(String projectId, String techId) async {
    final res = await _client.post(
      _uri('/api/tech/jobs/$projectId/claim'),
      headers: _headers,
      body: jsonEncode({'techId': techId}),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  // POST /api/tech/jobs/:projectId/confirm
  Future<Map<String, dynamic>> confirmJob(String projectId, String techId) async {
    final res = await _client.post(
      _uri('/api/tech/jobs/$projectId/confirm'),
      headers: _headers,
      body: jsonEncode({'techId': techId}),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  // POST /api/tech/projects/:projectId/log-time
  Future<Map<String, dynamic>> logTime({
    required String projectId,
    required String techId,
    required double hoursLogged,
    String? notes,
    String? gitCommitHash,
  }) async {
    final payload = {
      'techId': techId,
      'hoursLogged': hoursLogged,
      if (notes != null) 'notes': notes,
      if (gitCommitHash != null) 'gitCommitHash': gitCommitHash,
    };

    final res = await _client.post(
      _uri('/api/tech/projects/$projectId/log-time'),
      headers: _headers,
      body: jsonEncode(payload),
    );
    return _handleResponse(res) as Map<String, dynamic>;
  }

  void close() {
    _client.close();
  }
}

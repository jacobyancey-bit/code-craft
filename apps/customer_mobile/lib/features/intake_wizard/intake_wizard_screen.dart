import 'package:flutter/material.dart';
import 'package:codecraft_api_client/api_client.dart';
import 'package:codecraft_ui_kit/ui_kit.dart';
import '../checkout_deposit/deposit_screen.dart';

class IntakeWizardScreen extends StatefulWidget {
  final CodeCraftApiClient apiClient;

  const IntakeWizardScreen({super.key, required this.apiClient});

  @override
  State<IntakeWizardScreen> createState() => _IntakeWizardScreenState();
}

class _IntakeWizardScreenState extends State<IntakeWizardScreen> {
  final _emailController = TextEditingController(text: 'client@example.com');
  final _titleController = TextEditingController(text: 'Custom SaaS Platform');

  ProjectCategory _category = ProjectCategory.websiteCreation;
  bool _hasBrandAssets = true;
  bool _hasWrittenContent = false;
  bool _hasDomainAndDns = true;
  DesignPreference _designPreference = DesignPreference.componentLibrary;

  ScopingEstimate? _estimate;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchEstimate();
  }

  Future<void> _fetchEstimate() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final estimate = await widget.apiClient.estimateProject(
        ScopingInput(
          category: _category,
          hasBrandAssets: _hasBrandAssets,
          hasWrittenContent: _hasWrittenContent,
          hasDomainAndDns: _hasDomainAndDns,
          designPreference: _designPreference,
        ),
      );

      setState(() {
        _estimate = estimate;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _submitProject() async {
    if (_titleController.text.trim().isEmpty || _emailController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your project title and email')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final res = await widget.apiClient.createProject(
        clientEmail: _emailController.text.trim(),
        title: _titleController.text.trim(),
        category: _category,
        hasBrandAssets: _hasBrandAssets,
        hasWrittenContent: _hasWrittenContent,
        hasDomainAndDns: _hasDomainAndDns,
        designPreference: _designPreference,
      );

      final project = res['project'] as Project;
      final depositCents = res['initialDepositCents'] as int;

      if (!mounted) return;
      setState(() => _isLoading = false);

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => DepositScreen(
            apiClient: widget.apiClient,
            project: project,
            initialDepositCents: depositCents,
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Project Intake'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Contact & Title
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Project Title',
                filled: true,
                fillColor: CodeCraftTheme.darkSurface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              decoration: InputDecoration(
                labelText: 'Your Email',
                filled: true,
                fillColor: CodeCraftTheme.darkSurface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 24),

            // Category Dropdown
            const Text(
              'Select Category',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: CodeCraftTheme.darkSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<ProjectCategory>(
                  value: _category,
                  isExpanded: true,
                  dropdownColor: CodeCraftTheme.darkSurface,
                  items: ProjectCategory.values.map((cat) {
                    return DropdownMenuItem(
                      value: cat,
                      child: Text(cat.displayName),
                    );
                  }).toList(),
                  onChanged: (cat) {
                    if (cat != null) {
                      setState(() => _category = cat);
                      _fetchEstimate();
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Readiness Toggles
            const Text(
              'Client Readiness & Assets',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _buildSwitch(
              'Brand Assets & Logos Ready',
              'Deducts ~5-8 hours if vector logos/fonts exist',
              _hasBrandAssets,
              (v) {
                setState(() => _hasBrandAssets = v);
                _fetchEstimate();
              },
            ),
            _buildSwitch(
              'Written Content & Media Ready',
              'Deducts ~4-6 hours if copy is drafted',
              _hasWrittenContent,
              (v) {
                setState(() => _hasWrittenContent = v);
                _fetchEstimate();
              },
            ),
            _buildSwitch(
              'Domain & DNS Provisioned',
              'Deducts ~2-3 hours if domain is already set up',
              _hasDomainAndDns,
              (v) {
                setState(() => _hasDomainAndDns = v);
                _fetchEstimate();
              },
            ),
            const SizedBox(height: 16),

            // Design Preference
            const Text(
              'Design Architecture',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Component Library (-3h)'),
                    selected: _designPreference == DesignPreference.componentLibrary,
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _designPreference = DesignPreference.componentLibrary);
                        _fetchEstimate();
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ChoiceChip(
                    label: const Text('Bespoke Scratch (+10h)'),
                    selected: _designPreference == DesignPreference.bespokeScratch,
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _designPreference = DesignPreference.bespokeScratch);
                        _fetchEstimate();
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Live Calculation Card
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else if (_estimate != null) ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: CodeCraftTheme.darkSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: CodeCraftTheme.primary.withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Estimated Scope',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${_estimate!.minHours.toInt()} - ${_estimate!.maxHours.toInt()} hrs',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: CodeCraftTheme.accent,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24, color: Color(0xFF334155)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Rate: \$80 / hr'),
                        Text(
                          '\$${_estimate!.minCostDollars.toStringAsFixed(0)} - \$${_estimate!.maxCostDollars.toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Initial 50% Drawdown Block:',
                          style: TextStyle(fontWeight: FontWeight.bold, color: CodeCraftTheme.warning),
                        ),
                        Text(
                          '\$${_estimate!.initialDepositDollars.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: CodeCraftTheme.warning,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: CodeCraftButton(
                  label: 'Proceed to Deposit (\$${_estimate!.initialDepositDollars.toStringAsFixed(0)})',
                  icon: Icons.lock_outline,
                  onPressed: _submitProject,
                ),
              ),
            ],
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                style: const TextStyle(color: CodeCraftTheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSwitch(String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: CodeCraftTheme.darkSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Material(
        color: Colors.transparent,
        child: SwitchListTile(
          title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: CodeCraftTheme.textMuted)),
          value: value,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

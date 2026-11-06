import { useState, useEffect } from 'react';
import { ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface ScopingEstimate {
  estimatedHourRange: [number, number];
  hourlyRateCents: number;
  totalEstimatedCostRangeCents: [number, number];
  initialDepositCents: number;
  appliedRulesSnapshot: {
    category: string;
    baselineHours: { min: number; max: number };
    adjustments: Array<{ rule: string; applied: boolean; reason: string }>;
  };
}

export function App() {
  const [category, setCategory] = useState('WEBSITE_CREATION');
  const [hasBrandAssets, setHasBrandAssets] = useState(true);
  const [hasWrittenContent, setHasWrittenContent] = useState(false);
  const [hasDomainAndDns, setHasDomainAndDns] = useState(true);
  const [designPreference, setDesignPreference] = useState<'component_library' | 'bespoke_scratch'>('component_library');

  const [title, setTitle] = useState('Customer Experience Portal');
  const [email, setEmail] = useState('founder@acme.com');

  const [estimate, setEstimate] = useState<ScopingEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          hasBrandAssets,
          hasWrittenContent,
          hasDomainAndDns,
          designPreference,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEstimate(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [category, hasBrandAssets, hasWrittenContent, hasDomainAndDns, designPreference]);

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { email },
          title,
          category,
          hasBrandAssets,
          hasWrittenContent,
          hasDomainAndDns,
          designPreference,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedProject(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Code<span style={{ color: '#6366f1' }}>_Craft</span> Customer Portal
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
            Interactive Scope Scoper, 50% Drawdown Deposits & Live Milestone Tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#1e293b', padding: '8px 16px', borderRadius: '12px' }}>
          <Zap size={16} color="#10b981" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>API Connected</span>
        </div>
      </header>

      {createdProject ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{createdProject.project.title}</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Status: {createdProject.project.status}</p>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '8px 16px', borderRadius: '24px', fontWeight: 700, fontSize: '14px' }}>
              Pending 50% Deposit
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Scope Estimate</span>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                {createdProject.project.minEstimatedHours} - {createdProject.project.maxEstimatedHours} hrs
              </p>
            </div>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Safety Hard Cap</span>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                {createdProject.project.hardCapHours} hrs
              </p>
            </div>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Hourly Rate</span>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
                ${createdProject.project.hourlyRateCents / 100}/hr
              </p>
            </div>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #f59e0b' }}>
              <span style={{ fontSize: '12px', color: '#f59e0b' }}>Initial Block Due</span>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>
                ${createdProject.initialDepositCents / 100}
              </p>
            </div>
          </div>

          <button
            onClick={() => setCreatedProject(null)}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Create Another Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px' }}>
          {/* Intake Controls */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Project Readiness & Scoping</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Project Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              >
                <option value="WEBSITE_CREATION">Website Creation (30-50h base)</option>
                <option value="FULLSTACK">Full-Stack Application (60-100h base)</option>
                <option value="MOBILE_APPS">Mobile Apps (iOS & Android) (70-110h base)</option>
                <option value="ECOMMERCE">E-Commerce Platform (45-75h base)</option>
                <option value="CUSTOM_INTEGRATION">Custom Integration & API (25-45h base)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={hasBrandAssets} onChange={(e) => setHasBrandAssets(e.target.checked)} />
                <span>Brand assets & vector logos ready <strong style={{ color: '#10b981' }}>(-5h min / -8h max)</strong></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={hasWrittenContent} onChange={(e) => setHasWrittenContent(e.target.checked)} />
                <span>Written content & media copy drafted <strong style={{ color: '#10b981' }}>(-4h min / -6h max)</strong></span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={hasDomainAndDns} onChange={(e) => setHasDomainAndDns(e.target.checked)} />
                <span>Domain & DNS already configured <strong style={{ color: '#10b981' }}>(-2h min / -3h max)</strong></span>
              </label>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Design Architecture</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setDesignPreference('component_library')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: designPreference === 'component_library' ? '2px solid #6366f1' : '1px solid #334155',
                    background: designPreference === 'component_library' ? '#312e81' : '#0f172a',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Component Library (-3h)
                </button>
                <button
                  type="button"
                  onClick={() => setDesignPreference('bespoke_scratch')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: designPreference === 'bespoke_scratch' ? '2px solid #6366f1' : '1px solid #334155',
                    background: designPreference === 'bespoke_scratch' ? '#312e81' : '#0f172a',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Bespoke Scratch (+10h)
                </button>
              </div>
            </div>
          </div>

          {/* Live Estimate Card */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Live Calculation</h3>
                {loading && <RefreshCw size={16} className="animate-spin" color="#6366f1" />}
              </div>

              {estimate && (
                <div>
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Hour Range</span>
                    <p style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>
                      {estimate.estimatedHourRange[0]} - {estimate.estimatedHourRange[1]} hours
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                    <span style={{ color: '#94a3b8' }}>Rate</span>
                    <span style={{ fontWeight: 600 }}>${estimate.hourlyRateCents / 100}/hr</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                    <span style={{ color: '#94a3b8' }}>Estimated Total Cost</span>
                    <span style={{ fontWeight: 600 }}>
                      ${estimate.totalEstimatedCostRangeCents[0] / 100} - ${estimate.totalEstimatedCostRangeCents[1] / 100}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>Initial 50% Block</span>
                      <p style={{ fontSize: '11px', color: '#94a3b8' }}>Refundable drawdown block</p>
                    </div>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
                      ${estimate.initialDepositCents / 100}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateProject}
              disabled={loading || !estimate}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Lock Scope & Create Project <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

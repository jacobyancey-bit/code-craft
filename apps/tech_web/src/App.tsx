import { useState, useEffect } from 'react';
import { Radar, Clock, CheckCircle2, RefreshCw, Briefcase, GitCommit } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  category: string;
  status: string;
  minEstimatedHours: number;
  maxEstimatedHours: number;
  hourlyRateCents: number;
  fundedHours: number;
  consumedHours: number;
  hardCapHours: number;
  claimedById: string | null;
  claimHoldExpiresAt: string | null;
}

export function App() {
  const [techId, setTechId] = useState('783afeb5-a24b-413d-a0f5-dd05875ba1b0');
  const [jobs, setJobs] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);

  // Time logging modal state
  const [loggingProject, setLoggingProject] = useState<Project | null>(null);
  const [hours, setHours] = useState('3.5');
  const [notes, setNotes] = useState('');
  const [commitHash, setCommitHash] = useState('a1b2c3d4e5f6789012345678901234567890abcd');
  const [message, setMessage] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tech/jobs/available?techId=${techId}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.availableProjects || []);
        setActiveJobsCount(data.activeJobs || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [techId]);

  const handleClaim = async (projectId: string) => {
    try {
      const res = await fetch(`/api/tech/jobs/${projectId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techId }),
      });
      if (res.ok) {
        setMessage('✅ 15-minute claim hold acquired!');
        fetchJobs();
      } else {
        const err = await res.json();
        setMessage(`❌ ${err.message}`);
      }
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
    }
  };

  const handleConfirm = async (projectId: string) => {
    try {
      const res = await fetch(`/api/tech/jobs/${projectId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techId }),
      });
      if (res.ok) {
        setMessage('🚀 Job confirmed and moved to IN_PROGRESS!');
        fetchJobs();
      } else {
        const err = await res.json();
        setMessage(`❌ ${err.message}`);
      }
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingProject) return;

    try {
      const res = await fetch(`/api/tech/projects/${loggingProject.id}/log-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techId,
          hoursLogged: parseFloat(hours),
          notes: notes || undefined,
          gitCommitHash: commitHash || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(
          data.balance.autoReplenishTriggered
            ? `✅ Time logged! Balance <= 5h triggered +20h auto-replenish! (${data.balance.remainingFundedHours}h remaining)`
            : `✅ Successfully logged ${hours} hours! (${data.balance.remainingFundedHours}h remaining)`
        );
        setLoggingProject(null);
        fetchJobs();
      } else {
        const err = await res.json();
        setMessage(`❌ ${err.message}`);
      }
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Code<span style={{ color: '#10b981' }}>_Craft</span> Technician Radar
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
            FCFS Ticket Dispatch, 15-Minute Locks & Drawdown Logging
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', padding: '8px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Briefcase size={16} color="#6366f1" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Active Jobs: {activeJobsCount} / 2 (Cap)</span>
          </div>
          <button
            onClick={fetchJobs}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {message && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px' }}>
          {message}
        </div>
      )}

      {/* Technician ID Switcher */}
      <div style={{ marginBottom: '24px', background: '#1e293b', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Technician UUID:</span>
        <input
          type="text"
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
        />
      </div>

      {/* Available Jobs Radar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {jobs.length === 0 ? (
          <div style={{ background: '#1e293b', borderRadius: '20px', padding: '48px', textAlign: 'center', border: '1px solid #334155' }}>
            <Radar size={48} color="#6366f1" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>No Available Jobs on Radar</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Jobs matching your certified categories will appear in real time once funded.
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const isHeldByMe = job.claimedById === techId;
            return (
              <div
                key={job.id}
                style={{
                  background: '#1e293b',
                  border: isHeldByMe ? '2px solid #f59e0b' : '1px solid #334155',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{job.title}</h3>
                    <span style={{ fontSize: '12px', background: '#0f172a', padding: '4px 10px', borderRadius: '20px', color: '#6366f1', fontWeight: 600 }}>
                      {job.category}
                    </span>
                    <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '20px', color: '#10b981', fontWeight: 600 }}>
                      {job.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', color: '#94a3b8', fontSize: '13px' }}>
                    <span>Scope: {job.minEstimatedHours} - {job.maxEstimatedHours}h</span>
                    <span>Funded: <strong style={{ color: '#10b981' }}>{job.fundedHours}h</strong></span>
                    <span>Hard Cap: {job.hardCapHours}h</span>
                    <span>Rate: ${(job.hourlyRateCents / 100).toFixed(0)}/h</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {job.status === 'IN_PROGRESS' && isHeldByMe ? (
                    <button
                      onClick={() => setLoggingProject(job)}
                      style={{ padding: '10px 18px', borderRadius: '10px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }}
                    >
                      <Clock size={16} /> Log Time
                    </button>
                  ) : isHeldByMe ? (
                    <>
                      <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Clock size={14} /> 15-Min Hold Active
                      </div>
                      <button
                        onClick={() => handleConfirm(job.id)}
                        style={{ padding: '10px 18px', borderRadius: '10px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }}
                      >
                        <CheckCircle2 size={16} /> Confirm Acceptance
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleClaim(job.id)}
                      disabled={activeJobsCount >= 2}
                      style={{ padding: '10px 18px', borderRadius: '10px', background: activeJobsCount >= 2 ? '#334155' : '#6366f1', color: '#fff', border: 'none', fontWeight: 600, cursor: activeJobsCount >= 2 ? 'not-allowed' : 'pointer' }}
                    >
                      {activeJobsCount >= 2 ? 'Cap Reached (2)' : 'Claim Job (15m Hold)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Time Logging Modal */}
      {loggingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Log Daily Hours</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Project: {loggingProject.title}</p>

            <form onSubmit={handleLogTime}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Hours Logged (Max 8.0h)</label>
                <input
                  type="number"
                  step="0.5"
                  max="8.0"
                  min="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Git Commit SHA (Proof of Work)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <GitCommit size={16} color="#94a3b8" />
                  <input
                    type="text"
                    value={commitHash}
                    onChange={(e) => setCommitHash(e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Task Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                  placeholder="Implemented authentication middleware and API error handling"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setLoggingProject(null)}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 18px', borderRadius: '8px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Submit & Decrement Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

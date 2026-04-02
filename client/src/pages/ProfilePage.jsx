import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SKILL_OPTIONS = [
  { id: 'sk_python', name: 'Python' }, { id: 'sk_js', name: 'JavaScript' },
  { id: 'sk_ts', name: 'TypeScript' }, { id: 'sk_go', name: 'Go / Golang' },
  { id: 'sk_rust', name: 'Rust' }, { id: 'sk_react', name: 'React / Frontend' },
  { id: 'sk_node', name: 'Node.js / Backend' }, { id: 'sk_cloud', name: 'Cloud / AWS / GCP' },
  { id: 'sk_ml', name: 'Machine Learning' }, { id: 'sk_nlp', name: 'NLP / LLMs' },
  { id: 'sk_fundraise', name: 'Fundraising' }, { id: 'sk_gtm', name: 'Go-to-market' },
  { id: 'sk_salesb2b', name: 'Sales B2B' }, { id: 'sk_uxdesign', name: 'UX / UI Design' },
  { id: 'sk_prodstrat', name: 'Product Strategy' }, { id: 'sk_growth', name: 'Growth Hacking' },
  { id: 'sk_finance', name: 'Finance / CFO' }, { id: 'sk_recruit', name: 'Recruiting' },
  { id: 'sk_dataanlyt', name: 'Data Analysis' }, { id: 'sk_bizdev', name: 'Business Development' },
];

const ALL_ROLES = [
  'Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'VC Partner',
  'Engineer', 'Product Manager', 'Designer', 'Marketing', 'Growth',
  'Sales', 'Recruiter', 'Analyst', 'Advisor', 'Executive',
];

function EmptyState({ icon, text, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 20px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px dashed var(--border)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: action ? 12 : 0 }}>{text}</div>
      {action && onAction && (
        <button className="btn btn-ghost btn-sm" onClick={onAction}>{action}</button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    headline: '', summary: '', linkedinUrl: '',
    certifications: [], workExperience: [], projects: [],
  });

  useEffect(() => {
    if (!user?.personId) return;
    api.getMe(user.personId)
      .then(data => {
        setProfile(data);
        setHistory(data.history || []);
        setEditForm({
          headline: data.headline || '',
          summary: data.summary || data.description || '',
          linkedinUrl: data.linkedinUrl || '',
          certifications: data.certifications || [],
          workExperience: data.workExperience || [],
          projects: data.projects || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.personId]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.saveProfile(user.personId, {
        email: profile?.email || user?.email || '',
        headline: editForm.headline,
        description: editForm.summary,
        linkedinUrl: editForm.linkedinUrl,
        certifications: editForm.certifications,
        workExperience: editForm.workExperience,
        projects: editForm.projects,
        previousCompanies: editForm.workExperience.map(w => w.company).filter(Boolean),
        summary: editForm.summary,
      });
      // Reload
      const data = await api.getMe(user.personId);
      setProfile(data);
      setHistory(data.history || []);
      setSaveMsg('✓ Profile saved successfully!');
      setEditing(false);
    } catch (err) {
      setSaveMsg('Error saving: ' + err.message);
    }
    setSaving(false);
  }

  function addWorkExp() {
    setEditForm(f => ({ ...f, workExperience: [...f.workExperience, { company: '', role: '', years: '', description: '' }] }));
  }
  function removeWorkExp(i) {
    setEditForm(f => ({ ...f, workExperience: f.workExperience.filter((_, idx) => idx !== i) }));
  }
  function updateWorkExp(i, field, val) {
    setEditForm(f => ({ ...f, workExperience: f.workExperience.map((w, idx) => idx === i ? { ...w, [field]: val } : w) }));
  }

  function addProject() {
    setEditForm(f => ({ ...f, projects: [...f.projects, { name: '', description: '', url: '' }] }));
  }
  function removeProject(i) {
    setEditForm(f => ({ ...f, projects: f.projects.filter((_, idx) => idx !== i) }));
  }
  function updateProject(i, field, val) {
    setEditForm(f => ({ ...f, projects: f.projects.map((p, idx) => idx === i ? { ...p, [field]: val } : p) }));
  }

  function addCert() {
    setEditForm(f => ({ ...f, certifications: [...f.certifications, ''] }));
  }
  function removeCert(i) {
    setEditForm(f => ({ ...f, certifications: f.certifications.filter((_, idx) => idx !== i) }));
  }
  function updateCert(i, val) {
    setEditForm(f => ({ ...f, certifications: f.certifications.map((c, idx) => idx === i ? val : c) }));
  }

  if (!user) return (
    <div className="page" style={{ textAlign: 'center', padding: 60 }}>
      <button className="btn btn-primary" onClick={() => navigate('/login')}>Sign In</button>
    </div>
  );

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  const p = profile || user;
  const skillsHave = p.skillsHave || [];
  const skillsSeek = p.skillsSeek || [];
  const workExperience = p.workExperience || [];
  const certifications = p.certifications || [];
  const projects = p.projects || [];

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Hero Header */}
      <div style={{ padding: '28px 32px', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)', borderRadius: 20, border: '1px solid var(--border)', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {(p.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{p.name}</h1>
            {p.headline && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.4 }}>{p.headline}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(p.roles || []).map(r => (
                <span key={r} className="badge badge-accent" style={{ fontSize: 12 }}>{r}</span>
              ))}
              {p.companyName && <span className="badge badge-muted">{p.companyName}{p.companyStage ? ` · ${p.companyStage}` : ''}</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
              {p.email && <span>✉️ {p.email}</span>}
              {p.linkedinUrl && (
                <a href={p.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>🔗 LinkedIn</a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(!editing); setSaveMsg(''); }}>
              {editing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* Save status */}
      {saveMsg && (
        <div className={`alert ${saveMsg.startsWith('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
          {saveMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`tab ${tab === 'skills' ? 'active' : ''}`} onClick={() => setTab('skills')}>
          Skills {skillsHave.length > 0 ? `(${skillsHave.length})` : ''}
        </button>
        <button className={`tab ${tab === 'experience' ? 'active' : ''}`} onClick={() => setTab('experience')}>
          Experience {workExperience.length > 0 ? `(${workExperience.length})` : ''}
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Event History ({history.length})
        </button>
      </div>

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div className="stack">
          {editing ? (
            /* Edit mode */
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Edit Profile</div>
              <div className="stack">
                <div>
                  <label className="form-label">Headline</label>
                  <input className="form-input" value={editForm.headline} onChange={e => setEditForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. Founder at XYZ | AI + SaaS" />
                </div>
                <div>
                  <label className="form-label">Bio / Summary</label>
                  <textarea className="form-input" rows={4} value={editForm.summary} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))} placeholder="Tell the community about yourself and what you're building…" style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label className="form-label">LinkedIn URL</label>
                  <input className="form-input" value={editForm.linkedinUrl} onChange={e => setEditForm(f => ({ ...f, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/your-name" />
                </div>

                {/* Work Experience */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="form-label" style={{ margin: 0 }}>Work Experience</label>
                    <button className="btn btn-ghost btn-sm" onClick={addWorkExp}>+ Add</button>
                  </div>
                  <div className="stack-sm">
                    {editForm.workExperience.map((w, i) => (
                      <div key={i} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                          <input className="form-input" value={w.company} onChange={e => updateWorkExp(i, 'company', e.target.value)} placeholder="Company" />
                          <input className="form-input" value={w.role} onChange={e => updateWorkExp(i, 'role', e.target.value)} placeholder="Role / Title" />
                        </div>
                        <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                          <input className="form-input" value={w.years} onChange={e => updateWorkExp(i, 'years', e.target.value)} placeholder="e.g. 2020-2024" />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <textarea className="form-input" rows={2} value={w.description} onChange={e => updateWorkExp(i, 'description', e.target.value)} placeholder="Brief description…" style={{ flex: 1, resize: 'none' }} />
                          <button className="btn btn-danger btn-sm" onClick={() => removeWorkExp(i)} style={{ alignSelf: 'flex-start', flexShrink: 0 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="form-label" style={{ margin: 0 }}>Projects</label>
                    <button className="btn btn-ghost btn-sm" onClick={addProject}>+ Add</button>
                  </div>
                  <div className="stack-sm">
                    {editForm.projects.map((proj, i) => (
                      <div key={i} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                          <input className="form-input" value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} placeholder="Project name" />
                          <input className="form-input" value={proj.url} onChange={e => updateProject(i, 'url', e.target.value)} placeholder="URL (optional)" />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input className="form-input" value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} placeholder="Short description" style={{ flex: 1 }} />
                          <button className="btn btn-danger btn-sm" onClick={() => removeProject(i)} style={{ flexShrink: 0 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="form-label" style={{ margin: 0 }}>Certifications</label>
                    <button className="btn btn-ghost btn-sm" onClick={addCert}>+ Add</button>
                  </div>
                  <div className="stack-sm">
                    {editForm.certifications.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10 }}>
                        <input className="form-input" value={c} onChange={e => updateCert(i, e.target.value)} placeholder="e.g. AWS Solutions Architect" style={{ flex: 1 }} />
                        <button className="btn btn-danger btn-sm" onClick={() => removeCert(i)} style={{ flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />Saving…</> : '✓ Save Profile'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setEditing(false); setSaveMsg(''); }}>Cancel</button>
                </div>
              </div>
            </div>
          ) : (
            /* View mode */
            <>
              {/* About */}
              {(p.summary || p.description) ? (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>About</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p.summary || p.description}</p>
                </div>
              ) : (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>About</div>
                  <EmptyState icon="📝" text="No bio added yet." action="Add bio →" onAction={() => setEditing(true)} />
                </div>
              )}

              <div className="grid-2">
                {/* Contact */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Contact</div>
                  <div className="stack-sm">
                    {p.email && <div style={{ fontSize: 14 }}><span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Email</span>{p.email}</div>}
                    {p.linkedinUrl ? (
                      <div style={{ fontSize: 14 }}><span style={{ color: 'var(--text-muted)', marginRight: 8 }}>LinkedIn</span>
                        <a href={p.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>View Profile →</a>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>+ Add LinkedIn</button>
                    )}
                  </div>
                </div>

                {/* Looking For */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Looking To Meet</div>
                  {(p.seeksRoles || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(p.seeksRoles || []).map(r => <span key={r} className="badge badge-info" style={{ fontSize: 12 }}>{r}</span>)}
                    </div>
                  ) : (
                    <EmptyState icon="🎯" text="No target roles specified." />
                  )}
                </div>
              </div>

              {/* Work Experience */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Work Experience</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
                </div>
                {workExperience.length > 0 ? (
                  <div className="stack">
                    {workExperience.map((exp, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-soft), var(--bg-secondary))', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                          {(exp.company || '?')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>{exp.role}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{exp.company} · {exp.years}</div>
                          {exp.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{exp.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="💼" text="No work experience added yet." action="Add experience →" onAction={() => setEditing(true)} />
                )}
              </div>

              {/* Projects */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Projects</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
                </div>
                {projects.length > 0 ? (
                  <div className="grid-2">
                    {projects.map((proj, i) => (
                      <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {proj.url ? <a href={proj.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{proj.name} ↗</a> : proj.name}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{proj.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="🚀" text="No projects added yet." action="Add project →" onAction={() => setEditing(true)} />
                )}
              </div>

              {/* Certifications */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Certifications</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
                </div>
                {certifications.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {certifications.map((c, i) => (
                      <span key={i} className="badge badge-muted" style={{ fontSize: 13, padding: '5px 14px' }}>🏅 {c}</span>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="🏅" text="No certifications added yet." action="Add certification →" onAction={() => setEditing(true)} />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SKILLS TAB */}
      {tab === 'skills' && (
        <div className="stack">
          {/* Skills I Have */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚡</span> Skills I Bring
            </div>
            {skillsHave.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skillsHave.map((s, i) => (
                  <span key={i} className="badge badge-accent" style={{ fontSize: 13, padding: '6px 14px' }}>
                    {s.name || s}
                    {s.level && <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>· {s.level}</span>}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState icon="⚡" text="No skills listed. Skills are added when you register for events or update your profile." />
            )}
          </div>

          {/* Skills I Seek */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔍</span> Skills I'm Looking For
            </div>
            {skillsSeek.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skillsSeek.map((s, i) => (
                  <span key={i} className="badge badge-info" style={{ fontSize: 13, padding: '6px 14px' }}>
                    {s.name || s}
                    {s.level && <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>· {s.level}</span>}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState icon="🔍" text="No skills sought. Add skills you're looking for when registering for events." />
            )}
          </div>

          {/* Roles */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🎯</span> My Roles
            </div>
            {(p.roles || []).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(p.roles || []).map(r => (
                  <span key={r} className="badge badge-accent" style={{ fontSize: 13, padding: '6px 14px' }}>{r}</span>
                ))}
              </div>
            ) : (
              <EmptyState icon="🎯" text="No roles specified." />
            )}
          </div>

          {/* Event Intent */}
          {p.eventIntent && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>What I'm Looking For at Events</div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{p.eventIntent}"</p>
            </div>
          )}
        </div>
      )}

      {/* EXPERIENCE TAB */}
      {tab === 'experience' && (
        <div className="stack">
          {/* Work Experience */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>💼 Work Experience</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setTab('profile'); setEditing(true); }}>✏️ Edit</button>
            </div>
            {workExperience.length > 0 ? (
              <div style={{ position: 'relative' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', left: 22, top: 44, bottom: 0, width: 2, background: 'linear-gradient(to bottom, var(--accent), transparent)', opacity: 0.3 }} />
                <div className="stack">
                  {workExperience.map((exp, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: i === 0 ? 'linear-gradient(135deg, var(--accent), var(--info))' : 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: i === 0 ? '#fff' : 'var(--accent)', flexShrink: 0, zIndex: 1 }}>
                        {(exp.company || '?')[0]}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{exp.role}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{exp.company}</span>
                          <span>·</span>
                          <span>{exp.years}</span>
                        </div>
                        {exp.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>{exp.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon="💼" text="No work experience added yet." action="Add experience →" onAction={() => { setTab('profile'); setEditing(true); }} />
            )}
          </div>

          {/* Projects */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🚀 Projects</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setTab('profile'); setEditing(true); }}>✏️ Edit</button>
            </div>
            {projects.length > 0 ? (
              <div className="grid-2">
                {projects.map((proj, i) => (
                  <div key={i} style={{ padding: '18px 20px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,111,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
                      {proj.url ? <a href={proj.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{proj.name} ↗</a> : proj.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{proj.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="🚀" text="No projects added yet." action="Add project →" onAction={() => { setTab('profile'); setEditing(true); }} />
            )}
          </div>

          {/* Certifications */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🏅 Certifications</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setTab('profile'); setEditing(true); }}>✏️ Edit</button>
            </div>
            {certifications.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {certifications.map((c, i) => (
                  <span key={i} style={{ fontSize: 13, padding: '7px 16px', borderRadius: 100, background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))', border: '1px solid var(--border)', fontWeight: 500 }}>🏅 {c}</span>
                ))}
              </div>
            ) : (
              <EmptyState icon="🏅" text="No certifications added yet." action="Add certification →" onAction={() => { setTab('profile'); setEditing(true); }} />
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No event history yet</div>
              <p style={{ fontSize: 14, marginBottom: 20 }}>Attend events to build your networking history.</p>
              <button className="btn btn-primary" onClick={() => navigate('/events')}>Browse Events</button>
            </div>
          ) : (
            <div className="stack-sm">
              {history.map((h, i) => (
                <div key={i} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{h.eventName}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span>📅 {h.eventDate}</span>
                        <span>👥 Met {h.peopleMet} people</span>
                        <span>🤝 {h.connectionsMade} connections</span>
                        <span className="badge badge-muted" style={{ fontSize: 11 }}>{h.eventType}</span>
                      </div>
                      {h.highlights && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>{h.highlights}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <span key={j} style={{ fontSize: 18, color: j < h.rating ? '#f59e0b' : 'var(--border)' }}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

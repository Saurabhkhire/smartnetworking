import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SKILLS = [
  { id: 'sk_python', name: 'Python' }, { id: 'sk_js', name: 'JavaScript' },
  { id: 'sk_ts', name: 'TypeScript' }, { id: 'sk_react', name: 'React / Frontend' },
  { id: 'sk_node', name: 'Node.js / Backend' }, { id: 'sk_cloud', name: 'Cloud / AWS / GCP' },
  { id: 'sk_ml', name: 'Machine Learning' }, { id: 'sk_nlp', name: 'NLP / LLMs' },
  { id: 'sk_fundraise', name: 'Fundraising' }, { id: 'sk_gtm', name: 'Go-to-market' },
  { id: 'sk_salesb2b', name: 'Sales B2B' }, { id: 'sk_uxdesign', name: 'UX / UI Design' },
  { id: 'sk_prodstrat', name: 'Product Strategy' }, { id: 'sk_growth', name: 'Growth Hacking' },
  { id: 'sk_finance', name: 'Finance / CFO' }, { id: 'sk_recruit', name: 'Recruiting' },
  { id: 'sk_dataanlyt', name: 'Data Analysis' }, { id: 'sk_bizdev', name: 'Business Development' },
];

const ROLES = ['Founder', 'Co-Founder', 'Investor', 'Angel Investor', 'VC Partner', 'Engineer', 'Product Manager', 'Designer', 'Marketing', 'Growth', 'Sales', 'Recruiter', 'Analyst', 'Advisor', 'Executive'];
const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth', 'Independent', 'N/A'];

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [companyStage, setCompanyStage] = useState('Seed');
  const [headline, setHeadline] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Step 2: About you
  const [summary, setSummary] = useState('');
  const [skillsHave, setSkillsHave] = useState([]);
  const [seeksRoles, setSeeksRoles] = useState([]);

  // Step 3: Experience
  const [workExperience, setWorkExperience] = useState([
    { company: '', role: '', years: '', description: '' }
  ]);
  const [certifications, setCertifications] = useState(['']);
  const [projects, setProjects] = useState([{ name: '', description: '', url: '' }]);

  function toggleArr(arr, set, val) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  function addWorkExp() { setWorkExperience([...workExperience, { company: '', role: '', years: '', description: '' }]); }
  function updateWorkExp(i, field, val) {
    const updated = [...workExperience];
    updated[i] = { ...updated[i], [field]: val };
    setWorkExperience(updated);
  }
  function removeWorkExp(i) { setWorkExperience(workExperience.filter((_, idx) => idx !== i)); }

  function addProject() { setProjects([...projects, { name: '', description: '', url: '' }]); }
  function updateProject(i, field, val) {
    const updated = [...projects];
    updated[i] = { ...updated[i], [field]: val };
    setProjects(updated);
  }
  function removeProject(i) { setProjects(projects.filter((_, idx) => idx !== i)); }

  function addCert() { setCertifications([...certifications, '']); }
  function updateCert(i, val) {
    const updated = [...certifications];
    updated[i] = val;
    setCertifications(updated);
  }
  function removeCert(i) { setCertifications(certifications.filter((_, idx) => idx !== i)); }

  async function handleSubmit() {
    setError('');
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    setLoading(true);
    try {
      const data = await api.createAccount({
        name: name.trim(),
        email: email.trim(),
        roles,
        companyName,
        companyStage,
        headline,
        linkedinUrl,
        summary,
        skillsHave,
        seeksRoles,
        workExperience: workExperience.filter(w => w.company),
        certifications: certifications.filter(Boolean),
        projects: projects.filter(p => p.name),
        skillsSeek: [],
      });
      login({ personId: data.personId, name: data.name, email: data.email, roles: data.roles, companyName: data.companyName });
      navigate('/events');
    } catch (err) {
      setError(err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  const stepTitles = ['Basic Info', 'Skills & Goals', 'Experience'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>SmartNetworking</Link>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>Create your profile</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Fill in your professional details to get started</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {stepTitles.map((title, i) => (
            <button
              key={i}
              onClick={() => i < step - 1 && setStep(i + 1)}
              style={{
                flex: 1, padding: '12px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                border: 'none', cursor: i < step - 1 ? 'pointer' : 'default',
                background: step === i + 1 ? 'var(--accent)' : i < step - 1 ? 'var(--accent-soft)' : 'var(--bg-card)',
                color: step === i + 1 ? '#fff' : i < step - 1 ? 'var(--accent)' : 'var(--text-muted)',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {i + 1}. {title}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 32 }}>
          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

          {/* ── Step 1: Basic Info ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="stack">
              <div className="section-header" style={{ marginBottom: 0 }}>
                <div className="section-title" style={{ fontSize: 18 }}>Basic Information</div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Professional Headline</label>
                <input className="form-input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Founder & CEO at Nexus AI | Ex-Google" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select className="form-input" value={companyStage} onChange={e => setCompanyStage(e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input className="form-input" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
              </div>
              <div className="form-group">
                <label className="form-label">Your Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ROLES.map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => toggleArr(roles, setRoles, r)}
                      className="tag"
                      style={{
                        cursor: 'pointer', transition: 'all 0.15s',
                        ...(roles.includes(r) ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {})
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { if (!name || !email) { setError('Name and email required.'); return; } setError(''); setStep(2); }}>
                Next: Skills & Goals →
              </button>
            </div>
          )}

          {/* ── Step 2: Skills & Goals ────────────────────────────────── */}
          {step === 2 && (
            <div className="stack">
              <div className="section-header" style={{ marginBottom: 0 }}>
                <div className="section-title" style={{ fontSize: 18 }}>Skills & Goals</div>
              </div>
              <div className="form-group">
                <label className="form-label">Professional Summary</label>
                <textarea className="form-input" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Write a brief bio about your professional background and what you're building..." style={{ minHeight: 100 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Skills You Have</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SKILLS.map(s => (
                    <button
                      key={s.id} type="button"
                      onClick={() => toggleArr(skillsHave, setSkillsHave, s.id)}
                      className="tag"
                      style={{
                        cursor: 'pointer', transition: 'all 0.15s',
                        ...(skillsHave.includes(s.id) ? { background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'var(--success)' } : {})
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Roles You Want to Meet</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ROLES.map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => toggleArr(seeksRoles, setSeeksRoles, r)}
                      className="tag"
                      style={{
                        cursor: 'pointer', transition: 'all 0.15s',
                        ...(seeksRoles.includes(r) ? { background: 'var(--info-soft)', color: 'var(--info)', borderColor: 'var(--info)' } : {})
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                <button type="button" className="btn btn-primary" onClick={() => { setError(''); setStep(3); }} style={{ flex: 2, justifyContent: 'center' }}>Next: Experience →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Experience ────────────────────────────────────── */}
          {step === 3 && (
            <div className="stack">
              <div className="section-header" style={{ marginBottom: 0 }}>
                <div className="section-title" style={{ fontSize: 18 }}>Experience & Projects</div>
              </div>

              {/* Work Experience */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Work Experience</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addWorkExp}>+ Add</button>
                </div>
                <div className="stack-sm">
                  {workExperience.map((exp, i) => (
                    <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                      <div className="grid-2" style={{ marginBottom: 8 }}>
                        <input className="form-input" placeholder="Company" value={exp.company} onChange={e => updateWorkExp(i, 'company', e.target.value)} style={{ fontSize: 13 }} />
                        <input className="form-input" placeholder="Role / Title" value={exp.role} onChange={e => updateWorkExp(i, 'role', e.target.value)} style={{ fontSize: 13 }} />
                      </div>
                      <input className="form-input" placeholder="Years (e.g. 2020-2023)" value={exp.years} onChange={e => updateWorkExp(i, 'years', e.target.value)} style={{ fontSize: 13, marginBottom: 8 }} />
                      <textarea className="form-input" placeholder="What did you do?" value={exp.description} onChange={e => updateWorkExp(i, 'description', e.target.value)} style={{ fontSize: 13, minHeight: 60 }} />
                      {workExperience.length > 1 && (
                        <button type="button" onClick={() => removeWorkExp(i)} style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Certifications</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addCert}>+ Add</button>
                </div>
                <div className="stack-sm">
                  {certifications.map((cert, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" placeholder="Certification name" value={cert} onChange={e => updateCert(i, e.target.value)} style={{ fontSize: 13 }} />
                      {certifications.length > 1 && (
                        <button type="button" onClick={() => removeCert(i)} style={{ padding: '8px 12px', color: 'var(--danger)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Notable Projects</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addProject}>+ Add</button>
                </div>
                <div className="stack-sm">
                  {projects.map((proj, i) => (
                    <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                      <input className="form-input" placeholder="Project name" value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} style={{ fontSize: 13, marginBottom: 8 }} />
                      <textarea className="form-input" placeholder="What is this project?" value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} style={{ fontSize: 13, minHeight: 60, marginBottom: 8 }} />
                      <input className="form-input" placeholder="URL (optional)" value={proj.url} onChange={e => updateProject(i, 'url', e.target.value)} style={{ fontSize: 13 }} />
                      {projects.length > 1 && (
                        <button type="button" onClick={() => removeProject(i)} style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</> : 'Create Profile & Get Started →'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Card from '../components/Card.jsx';

const ROLES = ['Founder','Co-Founder','Investor','Angel Investor','VC Partner','Engineer',
  'Product Manager','Designer','Marketing','Growth','Sales','Recruiter','Analyst','Advisor','Mentor','Executive','CXO','Other'];

const STAGES = ['Idea','Pre-seed','Seed','Series A','Series B','Series C+','Growth','Public','Corporate','Agency','Independent','Student'];

const SKILLS = [
  { id: 'sk_python', name: 'Python' }, { id: 'sk_js', name: 'JavaScript' }, { id: 'sk_ts', name: 'TypeScript' },
  { id: 'sk_go', name: 'Go / Golang' }, { id: 'sk_rust', name: 'Rust' }, { id: 'sk_react', name: 'React / Frontend' },
  { id: 'sk_node', name: 'Node.js / Backend' }, { id: 'sk_cloud', name: 'Cloud / AWS / GCP' },
  { id: 'sk_ml', name: 'Machine Learning' }, { id: 'sk_nlp', name: 'NLP / LLMs' },
  { id: 'sk_fundraise', name: 'Fundraising' }, { id: 'sk_gtm', name: 'Go-to-market' },
  { id: 'sk_salesb2b', name: 'Sales B2B' }, { id: 'sk_uxdesign', name: 'UX / UI Design' },
  { id: 'sk_prodstrat', name: 'Product Strategy' }, { id: 'sk_growth', name: 'Growth Hacking' },
  { id: 'sk_finance', name: 'Finance / CFO' }, { id: 'sk_recruit', name: 'Recruiting' },
  { id: 'sk_dataanlyt', name: 'Data Analysis' }, { id: 'sk_bizdev', name: 'Business Development' },
];

const input = {
  width: '100%', padding: '10px 14px', background: '#0f0f14', border: '1px solid #2a2a3e',
  borderRadius: 8, color: '#e8e8f0', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 13, color: '#888', marginBottom: 4 };
const btn = (color = '#7c6fff') => ({
  padding: '9px 18px', background: color, color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
});
const addBtn = {
  padding: '6px 14px', background: 'transparent', color: '#7c6fff',
  border: '1px dashed #7c6fff55', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginTop: 4,
};
const removeBtn = {
  padding: '4px 10px', background: '#f8717122', color: '#f87171',
  border: '1px solid #f8717144', borderRadius: 6, cursor: 'pointer', fontSize: 11,
};

function MultiSelect({ options, value, onChange, labelText }) {
  function toggle(id) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={labelStyle}>{labelText}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {options.map(o => {
          const id = typeof o === 'string' ? o : o.id;
          const name = typeof o === 'string' ? o : o.name;
          const selected = value.includes(id);
          return (
            <button key={id} type="button" onClick={() => toggle(id)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: selected ? '#7c6fff22' : '#0f0f14', color: selected ? '#7c6fff' : '#666',
              border: `1px solid ${selected ? '#7c6fff' : '#2a2a3e'}`,
            }}>{name}</button>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_PROFILE = {
  name: '', email: '', linkedinUrl: '', headline: '',
  roles: [], companyName: '', companyStage: '', description: '',
  skillsHave: [], skillsSeek: [], seeksRoles: [], openToRematch: true,
  previousCompanies: [], certifications: [], projects: [],
};

export default function Profile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vg_profile');
      if (stored) setProfile({ ...EMPTY_PROFILE, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const set = k => e => {
    setProfile(p => ({ ...p, [k]: e.target.value }));
    setSaved(false);
  };
  const setArr = k => v => {
    setProfile(p => ({ ...p, [k]: v }));
    setSaved(false);
  };

  function save() {
    localStorage.setItem('vg_profile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Dynamic list helpers
  function addItem(key, template) {
    setProfile(p => ({ ...p, [key]: [...(p[key] || []), { ...template }] }));
    setSaved(false);
  }
  function removeItem(key, idx) {
    setProfile(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
    setSaved(false);
  }
  function updateItem(key, idx, field, val) {
    setProfile(p => ({
      ...p,
      [key]: p[key].map((item, i) => i === idx ? { ...item, [field]: val } : item),
    }));
    setSaved(false);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>My Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#4ade80', fontSize: 13 }}>Profile saved!</span>}
          <button style={btn()} onClick={save}>Save Profile</button>
        </div>
      </div>

      <Card title="Basic Info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={input} value={profile.name} onChange={set('name')} placeholder="Your full name" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={input} type="email" value={profile.email} onChange={set('email')} placeholder="you@example.com" />
          </div>
        </div>
        <label style={labelStyle}>Headline (one-liner)</label>
        <input style={input} value={profile.headline} onChange={set('headline')} placeholder="Building AI infrastructure for the next generation" />
        <label style={labelStyle}>LinkedIn URL</label>
        <input style={input} value={profile.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/yourname" />
      </Card>

      <Card title="Roles & Intent">
        <MultiSelect labelText="Your roles *" options={ROLES} value={profile.roles} onChange={setArr('roles')} />
        <MultiSelect labelText="Roles you seek to meet" options={ROLES} value={profile.seeksRoles} onChange={setArr('seeksRoles')} />
        <label style={labelStyle}>Bio / Description</label>
        <textarea
          style={{ ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
          value={profile.description}
          onChange={set('description')}
          placeholder="Brief background, what you're building, what you're looking for..."
        />
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <input type="checkbox" checked={profile.openToRematch}
            onChange={e => { setProfile(p => ({ ...p, openToRematch: e.target.checked })); setSaved(false); }} />
          Open to re-meeting past connections
        </label>
      </Card>

      <Card title="Current Company">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Company name</label>
            <input style={input} value={profile.companyName} onChange={set('companyName')} placeholder="Acme Corp" />
          </div>
          <div>
            <label style={labelStyle}>Stage</label>
            <select style={input} value={profile.companyStage} onChange={set('companyStage')}>
              <option value="">Select...</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Skills">
        <MultiSelect labelText="Skills I have" options={SKILLS} value={profile.skillsHave} onChange={setArr('skillsHave')} />
        <MultiSelect labelText="Skills I seek" options={SKILLS} value={profile.skillsSeek} onChange={setArr('skillsSeek')} />
      </Card>

      <Card title="Previous Companies">
        {(profile.previousCompanies || []).map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Company</label>
              <input style={{ ...input, marginBottom: 0 }} value={c.name || ''} onChange={e => updateItem('previousCompanies', i, 'name', e.target.value)} placeholder="Company" />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <input style={{ ...input, marginBottom: 0 }} value={c.role || ''} onChange={e => updateItem('previousCompanies', i, 'role', e.target.value)} placeholder="Role" />
            </div>
            <div>
              <label style={labelStyle}>Years</label>
              <input style={{ ...input, marginBottom: 0 }} value={c.years || ''} onChange={e => updateItem('previousCompanies', i, 'years', e.target.value)} placeholder="2" type="number" />
            </div>
            <button style={removeBtn} onClick={() => removeItem('previousCompanies', i)}>Remove</button>
          </div>
        ))}
        <button style={addBtn} onClick={() => addItem('previousCompanies', { name: '', role: '', years: '' })}>
          + Add Company
        </button>
      </Card>

      <Card title="Certifications">
        {(profile.certifications || []).map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Certification</label>
              <input style={{ ...input, marginBottom: 0 }} value={c.name || ''} onChange={e => updateItem('certifications', i, 'name', e.target.value)} placeholder="AWS Solutions Architect" />
            </div>
            <div>
              <label style={labelStyle}>Issuer</label>
              <input style={{ ...input, marginBottom: 0 }} value={c.issuer || ''} onChange={e => updateItem('certifications', i, 'issuer', e.target.value)} placeholder="Amazon" />
            </div>
            <div>
              <label style={labelStyle}>Year</label>
              <input style={{ ...input, marginBottom: 0 }} value={c.year || ''} onChange={e => updateItem('certifications', i, 'year', e.target.value)} placeholder="2023" type="number" />
            </div>
            <button style={removeBtn} onClick={() => removeItem('certifications', i)}>Remove</button>
          </div>
        ))}
        <button style={addBtn} onClick={() => addItem('certifications', { name: '', issuer: '', year: '' })}>
          + Add Certification
        </button>
      </Card>

      <Card title="Projects">
        {(profile.projects || []).map((p, i) => (
          <div key={i} style={{ marginBottom: 12, padding: '12px 14px', background: '#0f0f14', border: '1px solid #2a2a3e', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Project {i + 1}</label>
              <button style={removeBtn} onClick={() => removeItem('projects', i)}>Remove</button>
            </div>
            <label style={labelStyle}>Title</label>
            <input style={input} value={p.title || ''} onChange={e => updateItem('projects', i, 'title', e.target.value)} placeholder="Project name" />
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...input, minHeight: 60, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              value={p.description || ''}
              onChange={e => updateItem('projects', i, 'description', e.target.value)}
              placeholder="What did you build, what problem it solves..."
            />
          </div>
        ))}
        <button style={addBtn} onClick={() => addItem('projects', { title: '', description: '' })}>
          + Add Project
        </button>
      </Card>

      <div style={{ position: 'sticky', bottom: 24, display: 'flex', justifyContent: 'flex-end', padding: '0 4px' }}>
        <button style={{ ...btn(), padding: '12px 32px', fontSize: 15, boxShadow: '0 4px 24px #7c6fff44' }} onClick={save}>
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

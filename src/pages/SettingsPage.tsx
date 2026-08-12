import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Bell, Shield, Palette, Globe, Trash2, Camera, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [position, setPosition] = useState(user?.position || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [dateJoined, setDateJoined] = useState(user?.dateJoined || '');
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ name, position, birthday, bankAccount, dateJoined, bio });
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'language', label: 'Language & Region', icon: <Globe size={18} /> },
  ];

  return (
    <div className="page-content" style={{ padding: 'var(--spacing-6)', maxWidth: '1000px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Account Settings</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Manage your personal preferences and account settings</p>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: isActive ? 'var(--primary-alpha)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                  onMouseEnter={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="settings-content card-panel" style={{ flex: 1, padding: '2rem' }}>
          {activeTab === 'profile' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Profile Information</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'white',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    {name.charAt(0) || 'U'}
                  </div>
                  <button className="btn btn-icon" style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  <h3 style={{ fontWeight: 500, fontSize: '1.125rem', margin: '0 0 0.25rem 0' }}>{user?.name || 'User'}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.75rem 0' }}>{user?.role || 'MEMBER'}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Upload Photo</button>
                    <button className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--error)' }}>Remove</button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '32rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input type="email" className="input" style={{ backgroundColor: 'var(--bg-surface)' }} value={email} disabled />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Contact support to change your email address.</p>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Position</label>
                  <input type="text" className="input" value={position} onChange={e => setPosition(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Birthday</label>
                  <input type="date" className="input" value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bank Account</label>
                  <input type="text" className="input" value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date Joined</label>
                  <input type="date" className="input" value={dateJoined} onChange={e => setDateJoined(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label">Attach Kebele ID</label>
                    <input type="file" className="input" style={{ padding: '0.4rem' }} accept="image/*,.pdf" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label">Attach National ID</label>
                    <input type="file" className="input" style={{ padding: '0.4rem' }} accept="image/*,.pdf" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bio</label>
                  <textarea className="textarea" rows={4} placeholder="Tell your team a bit about yourself..." value={bio} onChange={e => setBio(e.target.value)} />
                </div>
                <div style={{ paddingTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Security Settings</h2>
              
              <div className="settings-section">
                <h3 style={{ fontWeight: 500, margin: '0 0 1rem 0' }}>Change Password</h3>
                <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '28rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Current Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">New Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <button type="button" className="btn btn-primary">Update Password</button>
                  </div>
                </form>
              </div>

              <div className="settings-section" style={{ borderBottom: 'none' }}>
                <h3 style={{ fontWeight: 500, margin: '0 0 0.5rem 0', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trash2 size={18} /> Danger Zone
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="btn btn-danger">Delete Account</button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Appearance</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Customize how Teamflow looks on your device.</p>
              
              <h3 style={{ fontWeight: 500, margin: '0 0 1rem 0' }}>Theme</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ border: '2px solid var(--primary)', borderRadius: 'var(--radius-lg)', padding: '1rem', cursor: 'pointer', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{ width: '96px', height: '64px', borderRadius: 'var(--radius-md)', backgroundColor: '#0D1117', border: '1px solid #30363D', margin: '0 auto 0.75rem auto' }}></div>
                  <span style={{ fontWeight: 500 }}>Dark Mode</span>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem', cursor: 'not-allowed', textAlign: 'center', backgroundColor: 'var(--bg-surface)', opacity: 0.5 }}>
                  <div style={{ width: '96px', height: '64px', borderRadius: 'var(--radius-md)', backgroundColor: '#F8F9FA', border: '1px solid #E5E7EB', margin: '0 auto 0.75rem auto' }}></div>
                  <span style={{ fontWeight: 500 }}>Light Mode</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>(Coming soon)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Notification Preferences</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Choose what you want to be notified about.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '32rem' }}>
                {[
                  { title: 'Task Assignments', desc: 'When you are assigned a new task' },
                  { title: 'Task Updates', desc: 'When a task you follow is updated or completed' },
                  { title: 'Comments & Mentions', desc: 'When someone mentions you in a comment' },
                  { title: 'Project Updates', desc: 'Weekly summaries of project progress' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
                    <div>
                      <h4 style={{ fontWeight: 500, margin: '0 0 0.25rem 0' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                    </div>
                    {/* Simplified standard checkbox since Tailwind switch won't work */}
                    <input type="checkbox" defaultChecked style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Language & Region</h2>
              
              <div className="form-group" style={{ maxWidth: '24rem' }}>
                <label className="form-label">Language</label>
                <select className="select">
                  <option>English (US)</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
              
              <div className="form-group" style={{ maxWidth: '24rem', marginTop: '1rem' }}>
                <label className="form-label">Time Zone</label>
                <select className="select">
                  <option>Pacific Time (PT)</option>
                  <option>Eastern Time (ET)</option>
                  <option>Central European Time (CET)</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

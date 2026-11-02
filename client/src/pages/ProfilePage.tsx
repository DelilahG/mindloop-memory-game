import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './ProfilePage.css';

const PRESET_COLORS = [
  '#a594d0', '#d094c5', '#94b8d0', '#94d0a5',
  '#d0c494', '#d09494', '#c0c0c0', '#e8c170',
];

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  eloRating: number;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalPairs: number;
    eloRating: number;
  };
  createdAt: string;
}

export function ProfilePage() {
  const { player, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#a594d0');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player) return;
    api.get<{ player: ProfileData }>(`/api/profile/${player.id}`).then(data => {
      setProfile(data.player);
      setDisplayName(data.player.displayName);
      setAvatarColor(data.player.avatarColor);
    }).catch(() => setError('Failed to load profile'));
  }, [player]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.patch('/api/profile/me', { displayName, avatarColor });
      setSaved(true);
      refreshProfile();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <Link to="/lobby" className="btn-back">
          <ArrowLeft size={20} /> Back to Lobby
        </Link>
      </header>

      <main className="profile-main">
        <div className="profile-card">
          <div className="profile-avatar-large" style={{ background: avatarColor }}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>

          <h1 className="profile-name">{profile.displayName}</h1>
          <p className="profile-username">@{profile.username}</p>
          <p className="profile-elo">Elo: {profile.eloRating}</p>

          <div className="profile-stats">
            <div className="stat">
              <span className="stat-label">Games</span>
              <span className="stat-value">{profile.stats.gamesPlayed}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Wins</span>
              <span className="stat-value">{profile.stats.gamesWon}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Win Rate</span>
              <span className="stat-value">{profile.stats.winRate}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Pairs</span>
              <span className="stat-value">{profile.stats.totalPairs}</span>
            </div>
          </div>

          <div className="profile-edit">
            <h2 className="profile-edit-title">Edit Profile</h2>

            <label className="profile-field">
              <span className="profile-field-label">Display Name</span>
              <input
                className="profile-input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={48}
              />
            </label>

            <div className="profile-field">
              <span className="profile-field-label">Avatar Color</span>
              <div className="color-picker">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${avatarColor === c ? ' color-swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setAvatarColor(c)}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className="profile-error">{error}</p>}

            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={16} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <p className="profile-joined">
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  );
}

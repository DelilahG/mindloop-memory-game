import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Landing } from './components/Landing';
import { SoloGamePage } from './pages/SoloGamePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LobbyPage } from './pages/LobbyPage';
import { MultiplayerGamePage } from './pages/MultiplayerGamePage';
import { ProfilePage } from './pages/ProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { MatchHistoryPage } from './pages/MatchHistoryPage';
import './App.css';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { player, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!player) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/solo" element={<SoloGamePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/lobby" element={
          <RequireAuth><LobbyPage /></RequireAuth>
        } />
        <Route path="/multiplayer" element={
          <RequireAuth><MultiplayerGamePage /></RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth><ProfilePage /></RequireAuth>
        } />
        <Route path="/matches" element={
          <RequireAuth><MatchHistoryPage /></RequireAuth>
        } />
      </Routes>
    </div>
  );
}

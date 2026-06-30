import { Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';
import Welcome from './pages/Welcome';
import Tournaments from './pages/Tournaments';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import NotFound from './pages/NotFound';
import ErrorBoundary from './pages/ErrorBoundary';
import GoalAvalanche from './pages/GoalAvalanche';
import PulseDashboard from './pages/PulseDashboard';
import Games from './pages/Games';

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/goal-avalanche" element={<GoalAvalanche />} />
          <Route path="/goal-avalanche/:year" element={<GoalAvalanche />} />
          <Route path="/pulse" element={<PulseDashboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

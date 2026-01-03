import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AddBet } from './pages/AddBet';
import { BetHistory } from './pages/BetHistory';
import { Analytics } from './pages/Analytics';
import { Help } from './pages/Help';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { BetProvider } from './context/BetContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PinnedGamesProvider } from './context/PinnedGamesContext';
import { AuthGate } from './components/auth/AuthGate';
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <BetProvider>
            <PinnedGamesProvider>
              <Router>
                <Routes>
                  {/* Public routes - accessible without authentication */}
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />

                  {/* Protected routes - require authentication */}
                  <Route
                    path="/*"
                    element={
                      <AuthGate>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/add" element={<AddBet />} />
                            <Route path="/history" element={<BetHistory />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/help" element={<Help />} />
                          </Routes>
                        </Layout>
                      </AuthGate>
                    }
                  />
                </Routes>
              </Router>
            </PinnedGamesProvider>
          </BetProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

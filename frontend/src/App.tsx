import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { BetProvider } from './context/BetContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PinnedGamesProvider } from './context/PinnedGamesContext';
import { AuthGate } from './components/auth/AuthGate';
import { ToastProvider } from './components/ui/Toast';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const AddBet = lazy(() => import('./pages/AddBet').then(m => ({ default: m.AddBet })));
const BetHistory = lazy(() => import('./pages/BetHistory').then(m => ({ default: m.BetHistory })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
// const Blackjack = lazy(() => import('./pages/Blackjack').then(m => ({ default: m.Blackjack })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <BetProvider>
            <PinnedGamesProvider>
              <Router>
                <Suspense fallback={<PageLoader />}>
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
                            <Suspense fallback={<PageLoader />}>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/add" element={<AddBet />} />
                                <Route path="/history" element={<BetHistory />} />
                                <Route path="/analytics" element={<Analytics />} />
                                {/* <Route path="/blackjack" element={<Blackjack />} /> */}
                                <Route path="/help" element={<Help />} />
                              </Routes>
                            </Suspense>
                          </Layout>
                        </AuthGate>
                      }
                    />
                  </Routes>
                </Suspense>
              </Router>
            </PinnedGamesProvider>
          </BetProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

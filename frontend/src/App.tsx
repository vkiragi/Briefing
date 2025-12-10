import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AddBet } from './pages/AddBet';
import { BetHistory } from './pages/BetHistory';
import { Analytics } from './pages/Analytics';
import { BetProvider } from './context/BetContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGate } from './components/auth/AuthGate';
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BetProvider>
          <Router>
            <AuthGate>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/add" element={<AddBet />} />
                  <Route path="/history" element={<BetHistory />} />
                  <Route path="/analytics" element={<Analytics />} />
                </Routes>
              </Layout>
            </AuthGate>
          </Router>
        </BetProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

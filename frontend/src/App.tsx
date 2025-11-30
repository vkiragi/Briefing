import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AddBet } from './pages/AddBet';
import { BetHistory } from './pages/BetHistory';
import { Analytics } from './pages/Analytics';
import { Bankroll } from './pages/Bankroll';
import { BetProvider } from './context/BetContext';

function App() {
  return (
    <BetProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddBet />} />
            <Route path="/history" element={<BetHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/bankroll" element={<Bankroll />} />
          </Routes>
        </Layout>
      </Router>
    </BetProvider>
  );
}

export default App;

import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { HomePage } from './pages/Home/HomePage';
import { UploadPage } from './pages/Upload/UploadPage';
import { ProcessingPage } from './pages/Processing/ProcessingPage';
import { ResultsPage } from './pages/Results/ResultsPage';
import { MapPage } from './pages/Map/MapPage';
import { AuthorityPage } from './pages/Authority/AuthorityPage';
import { ContractorPage } from './pages/Contractor/ContractorPage';
import { LeaderboardPage } from './pages/Leaderboard/LeaderboardPage';
import { LoginPage } from './pages/Login/LoginPage';

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [pathname]);

  return null;
};

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />

        <div className="min-h-screen flex flex-col bg-[#F7FAFC] text-[#0B1720] antialiased selection:bg-[#0EA5C6]/20 selection:text-[#087EA4]">
          {/* Main Navigation */}
          <Navbar />

          {/* Page Content */}
          <main className="relative flex-1 w-full overflow-x-hidden">
            {/* Very subtle background treatment */}
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 -z-10"
            >
              <div className="absolute inset-0 bg-[#F7FAFC]" />

              <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#0EA5C6]/[0.025] blur-3xl" />
            </div>

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/processing" element={<ProcessingPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/authority" element={<AuthorityPage />} />
              <Route path="/contractor" element={<ContractorPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
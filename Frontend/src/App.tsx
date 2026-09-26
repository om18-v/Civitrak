import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { RoleGate } from './components/auth/RoleGate';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { UploadPage } from './pages/Upload/UploadPage';
import { ProcessingPage } from './pages/Processing/ProcessingPage';
import { ResultsPage } from './pages/Results/ResultsPage';
import { MapPage } from './pages/Map/MapPage';
import { AuthorityPage } from './pages/Authority/AuthorityPage';
import { ContractorPage } from './pages/Contractor/ContractorPage';
import { LeaderboardPage } from './pages/Leaderboard/LeaderboardPage';
import { LoginPage } from './pages/Login/LoginPage';
import { CitizenHubPage } from './pages/Citizen/CitizenHubPage';


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


function PortalHomeRedirect() {
  const { currentRole } = useApp();
  return <Navigate to={currentRole === 'USER' ? '/citizen' : currentRole === 'AUTHORITY' ? '/authority' : '/contractor'} replace />;
}

function AppShell() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#EDEAE3] text-[#0D2B3A] antialiased">
        {location.pathname !== '/login' && <Navbar />}
        <main className="relative flex-1 w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<RoleGate allowed={['USER', 'AUTHORITY', 'CONTRACTOR']}><PortalHomeRedirect /></RoleGate>} />
            <Route path="/citizen" element={<RoleGate allowed={['USER']}><CitizenHubPage /></RoleGate>} />
            <Route path="/upload" element={<RoleGate allowed={['USER']}><UploadPage /></RoleGate>} />
            <Route path="/processing" element={<RoleGate allowed={['USER']}><ProcessingPage /></RoleGate>} />
            <Route path="/results" element={<RoleGate allowed={['USER']}><ResultsPage /></RoleGate>} />
            <Route path="/map" element={<RoleGate allowed={['USER']}><MapPage /></RoleGate>} />
            <Route path="/authority" element={<RoleGate allowed={['AUTHORITY']}><AuthorityPage /></RoleGate>} />
            <Route path="/contractor" element={<RoleGate allowed={['CONTRACTOR']}><ContractorPage /></RoleGate>} />
            <Route path="/leaderboard" element={<RoleGate allowed={['USER']}><LeaderboardPage /></RoleGate>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
        {location.pathname !== '/login' && <Footer />}
      </div>
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;

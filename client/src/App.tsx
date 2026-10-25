import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { TeamPlay } from './pages/TeamPlay';
import { Projector } from './pages/Projector';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveControlRoom } from './pages/LiveControlRoom';
import { QuestionBank } from './pages/QuestionBank';
import JudgePanel from './pages/JudgePanel';
import Analytics from './pages/Analytics';

function LayoutWithNavbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-gray-100">
      <Navbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen immersive routes (no top navbar) */}
        <Route path="/play" element={<TeamPlay />} />
        <Route path="/projector" element={<Projector />} />
        <Route path="/projector/:sessionId" element={<Projector />} />

        {/* Standard portal routes with top navbar */}
        <Route
          path="/"
          element={
            <LayoutWithNavbar>
              <Home />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/admin"
          element={
            <LayoutWithNavbar>
              <AdminDashboard />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/admin/live/:sessionId"
          element={
            <LayoutWithNavbar>
              <LiveControlRoom />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <LayoutWithNavbar>
              <QuestionBank />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/judge"
          element={
            <LayoutWithNavbar>
              <JudgePanel />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/judge/:sessionId"
          element={
            <LayoutWithNavbar>
              <JudgePanel />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/analytics"
          element={
            <LayoutWithNavbar>
              <Analytics />
            </LayoutWithNavbar>
          }
        />
        <Route
          path="/analytics/:sessionId"
          element={
            <LayoutWithNavbar>
              <Analytics />
            </LayoutWithNavbar>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PinsManagement from './pages/PinsManagement';
import UsersManagement from './pages/UsersManagement';
import CampusesManagement from './pages/CampusesManagement';
import NotificationsManagement from './pages/NotificationsManagement';
import FeedbacksManagement from './pages/FeedbacksManagement';
import DevelopersManagement from './pages/DevelopersManagement';
import FloorPlans from './pages/FloorPlans';
import MediaLibrary from './pages/MediaLibrary';
import SystemSettings from './pages/SystemSettings';
import ProfileSettings from './pages/ProfileSettings';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pins" element={<PinsManagement />} />
        <Route path="floors" element={<FloorPlans />} />
        <Route path="campuses" element={<CampusesManagement />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="feedbacks" element={<FeedbacksManagement />} />
        <Route path="notifications" element={<NotificationsManagement />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="developers" element={<DevelopersManagement />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

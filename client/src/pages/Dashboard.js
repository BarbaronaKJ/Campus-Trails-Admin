import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usersAPI, campusesAPI, suggestionsAndFeedbacksAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';
import './Dashboard.css';

function Dashboard() {
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [campuses, setCampuses] = useState([]);
  const [stats, setStats] = useState({
    pins: 0,
    users: 0,
    campuses: 0,
    feedbacks: 0,
    suggestionsAndFeedbacks: 0
  });
  const [feedbackTrends, setFeedbackTrends] = useState([]);
  const [localTracking, setLocalTracking] = useState({
    totalSearches: 0,
    totalPathfinding: 0,
    totalSavedPins: 0,
    activeUsers7Days: 0,
    avgSearchesPerUser: 0,
    avgPathfindingPerUser: 0,
    avgSavedPinsPerUser: 0
  });
  const [systemHealth, setSystemHealth] = useState({
    mongodb: 'checking',
    express: 'checking'
  });
  const [loading, setLoading] = useState(true);

  const CAMPUS_TRAILS_GREEN = '#28a745';
  const CAMPUS_TRAILS_BLUE = '#007bff';
  const CAMPUS_TRAILS_RED = '#dc3545';
  const CAMPUS_TRAILS_YELLOW = '#ffc107';

  useEffect(() => {
    fetchData();
    checkSystemHealth();
    // Refresh system health every 30 seconds
    const healthInterval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(healthInterval);
  }, [selectedCampus]);

  const checkSystemHealth = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      
      // Check Express server
      try {
        const expressRes = await fetch(`${baseUrl}/health`, { timeout: 5000 });
        setSystemHealth(prev => ({ ...prev, express: expressRes.ok ? 'online' : 'offline' }));
      } catch {
        setSystemHealth(prev => ({ ...prev, express: 'offline' }));
      }

      // Check MongoDB (via API)
      try {
        const token = localStorage.getItem('adminToken');
        const mongoRes = await fetch(`${baseUrl}/api/admin/pins?limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000
        });
        setSystemHealth(prev => ({ ...prev, mongodb: mongoRes.ok ? 'online' : 'offline' }));
      } catch {
        setSystemHealth(prev => ({ ...prev, mongodb: 'offline' }));
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      
      // Fetch campuses
      const campusesRes = await campusesAPI.getAll();
      const campusesData = campusesRes.data?.campuses || campusesRes.data || [];
      setCampuses(campusesData);

      // Build query params
      const campusQuery = selectedCampus !== 'all' ? `&campusId=${selectedCampus}` : '';

      // Fetch all data
      const [pinsRes, usersRes, suggestionsRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/pins?limit=1000&includeInvisible=true${campusQuery}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        usersAPI.getAll({ limit: 10000 }),
        suggestionsAndFeedbacksAPI.getAll({ limit: 1000 })
      ]);

      const pins = pinsRes.pins || pinsRes.data || [];
      const users = usersRes.data?.users || usersRes.data || [];
      const suggestions = suggestionsRes.data?.suggestions || suggestionsRes.data || [];

      // Extract all feedbackHistory from users for facility reports
      const allFeedbackHistory = [];
      users.forEach(user => {
        if (user.activity && user.activity.feedbackHistory && Array.isArray(user.activity.feedbackHistory)) {
          user.activity.feedbackHistory.forEach(feedback => {
            allFeedbackHistory.push({
              ...feedback,
              userId: user._id,
              date: feedback.date || feedback.createdAt
            });
          });
        }
      });

      // Calculate stats
      setStats({
        pins: pins.length,
        users: users.length,
        campuses: campusesData.length,
        feedbacks: allFeedbackHistory.length,
        suggestionsAndFeedbacks: suggestions.length
      });

      // Calculate local tracking data
      let totalSearches = 0;
      let totalPathfinding = 0;
      let totalSavedPins = 0;
      const activeUsersSet = new Set();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      users.forEach(user => {
        // Count saved pins
        if (user.activity?.savedPins) {
          totalSavedPins += user.activity.savedPins.length;
        }

        // Count searches
        if (user.activity?.searchCount) {
          totalSearches += user.activity.searchCount || 0;
        }

        // Count pathfinding
        if (user.activity?.pathfindingCount) {
          totalPathfinding += user.activity.pathfindingCount || 0;
        }

        // Track active users (last 7 days)
        if (user.activity?.lastActiveDate) {
          const lastActive = new Date(user.activity.lastActiveDate);
          if (lastActive >= sevenDaysAgo) {
            activeUsersSet.add(user._id);
          }
        }
      });

      setLocalTracking({
        totalSearches,
        totalPathfinding,
        totalSavedPins,
        activeUsers7Days: activeUsersSet.size,
        avgSearchesPerUser: users.length > 0 ? (totalSearches / users.length).toFixed(1) : 0,
        avgPathfindingPerUser: users.length > 0 ? (totalPathfinding / users.length).toFixed(1) : 0,
        avgSavedPinsPerUser: users.length > 0 ? (totalSavedPins / users.length).toFixed(1) : 0
      });

      // Calculate feedback trends (last 7 days)
      const now = new Date();
      const trendsData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Create day boundaries
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Count facility reports from feedbackHistory
        const reports = allFeedbackHistory.filter(f => {
          const feedbackDate = new Date(f.date || f.createdAt || 0);
          return feedbackDate >= dayStart && feedbackDate <= dayEnd;
        }).length;
        
        // Count user app feedback from suggestions
        const appFeedback = suggestions.filter(s => {
          const createdAt = new Date(s.createdAt);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length;

        trendsData.push({
          date: dateStr,
          'Facility Reports': reports,
          'User App Feedback': appFeedback
        });
      }

      setFeedbackTrends(trendsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Engagement Analytics</h1>
        <div className="campus-selector">
          <label>Active Campus Overview:</label>
          <select 
            value={selectedCampus} 
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="campus-dropdown"
          >
            <option value="all">All Campuses</option>
            {campuses.map(campus => (
              <option key={campus._id} value={campus._id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* System Health */}
      <div className="dashboard-section">
        <h2>System Health</h2>
        <div className="system-health-grid">
          <div className={`health-card ${systemHealth.mongodb === 'online' ? 'online' : 'offline'}`}>
            <div className="health-indicator"></div>
            <div>
              <h3>MongoDB Atlas</h3>
              <p>{systemHealth.mongodb === 'online' ? '✓ Online' : '✗ Offline'}</p>
            </div>
          </div>
          <div className={`health-card ${systemHealth.express === 'online' ? 'online' : 'offline'}`}>
            <div className="health-indicator"></div>
            <div>
              <h3>Express Server</h3>
              <p>{systemHealth.express === 'online' ? '✓ Online' : '✗ Offline'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-section">
        <h2>Quick Statistics</h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_BLUE}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Pins</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.pins}</p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_GREEN}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Users</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.users}</p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_YELLOW}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Campuses</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.campuses}</p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_RED}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Facility Reports</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.feedbacks}</p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid #6f42c1`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>App Feedback</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.suggestionsAndFeedbacks}</p>
          </div>
        </div>
      </div>

      {/* Simple Local Tracking */}
      <div className="dashboard-section">
        <h2>Local Tracking Data</h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_BLUE}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Searches</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.totalSearches}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Avg: {localTracking.avgSearchesPerUser} per user
            </p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_YELLOW}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Pathfinding Routes</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.totalPathfinding}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Avg: {localTracking.avgPathfindingPerUser} per user
            </p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_GREEN}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Saved Pins</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.totalSavedPins}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Avg: {localTracking.avgSavedPinsPerUser} per user
            </p>
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid #6f42c1`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Active Users (7 Days)</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.activeUsers7Days}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Users active this week
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Trends */}
      <div className="dashboard-section">
        <h2>Feedback Trends (Last 7 Days)</h2>
        <div className="chart-container" style={{ height: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={feedbackTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="Facility Reports" 
                stroke={CAMPUS_TRAILS_RED} 
                strokeWidth={2}
                dot={{ fill: CAMPUS_TRAILS_RED, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="User App Feedback" 
                stroke={CAMPUS_TRAILS_BLUE} 
                strokeWidth={2}
                dot={{ fill: CAMPUS_TRAILS_BLUE, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

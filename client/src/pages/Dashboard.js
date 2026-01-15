import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usersAPI, campusesAPI, suggestionsAndFeedbacksAPI, analyticsAPI } from '../services/api';
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
    userSearches: 0,
    anonymousSearches: 0,
    userPathfinding: 0,
    anonymousPathfinding: 0,
    avgSearchesPerUser: 0,
    avgPathfindingPerUser: 0,
    avgSavedPinsPerUser: 0
  });
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [usageTrends, setUsageTrends] = useState([]); // For charts
  const [systemHealth, setSystemHealth] = useState({
    mongodb: 'checking',
    express: 'checking'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CAMPUS_TRAILS_GREEN = '#28a745';
  const CAMPUS_TRAILS_BLUE = '#007bff';
  const CAMPUS_TRAILS_RED = '#dc3545';
  const CAMPUS_TRAILS_YELLOW = '#ffc107';

  useEffect(() => {
    fetchData();
    checkSystemHealth();
    
    // Auto-refresh every 30 seconds to show updated values
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...');
      fetchData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
    // Refresh system health every 30 seconds
    const healthInterval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(healthInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError('');
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      
      console.log('🔍 Dashboard: Fetching data...');
      console.log('🔍 API Base URL:', baseUrl);
      console.log('🔍 Has token:', !!token);
      
      if (!token) {
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch campuses
      let campusesData = [];
      try {
        const campusesRes = await campusesAPI.getAll();
        // Handle different response structures
        if (campusesRes.data?.campuses) {
          campusesData = campusesRes.data.campuses;
        } else if (campusesRes.data && Array.isArray(campusesRes.data)) {
          campusesData = campusesRes.data;
        } else if (Array.isArray(campusesRes)) {
          campusesData = campusesRes;
        }
        setCampuses(campusesData);
        console.log('✅ Campuses fetched:', campusesData.length, campusesData);
      } catch (err) {
        console.error('❌ Error fetching campuses:', err);
        setError(`Error fetching campuses: ${err.message || 'Unknown error'}`);
      }

      // Build query params - don't filter by campus for dashboard stats
      // const campusQuery = selectedCampus !== 'all' ? `&campusId=${selectedCampus}` : '';

      // Fetch all data
      let pins = [];
      let users = [];
      let suggestions = [];
      let analyticsData = null;
      
      try {
        const [pinsRes, usersRes, suggestionsRes, analyticsRes] = await Promise.all([
          fetch(`${baseUrl}/api/admin/pins?limit=1000&includeInvisible=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(async r => {
            if (!r.ok) {
              const errorText = await r.text();
              throw new Error(`Pins API error (${r.status}): ${errorText}`);
            }
            return r.json();
          }),
          usersAPI.getAll({ limit: 10000 }).catch(err => {
            console.error('❌ Error fetching users:', err);
            throw new Error(`Users API error: ${err.message || 'Unknown error'}`);
          }),
          suggestionsAndFeedbacksAPI.getAll({ limit: 1000 }).catch(err => {
            console.error('❌ Error fetching suggestions:', err);
            console.error('❌ Error details:', {
              message: err.message,
              status: err.response?.status,
              statusText: err.response?.statusText,
              url: err.config?.url,
              response: err.response?.data
            });
            
            // If 404, log a helpful message
            if (err.response?.status === 404) {
              console.warn('⚠️ Route /api/admin/suggestions_and_feedbacks not found. The backend needs to be redeployed with this route.');
            }
            
            // Don't throw - suggestions are optional for dashboard
            return { data: { suggestions: [] } };
          }),
          analyticsAPI.getStats({ days: 30 }).catch(err => {
            console.error('❌ Error fetching analytics:', err);
            // Don't throw - analytics are optional
            return { data: null };
          })
        ]);

        // Handle pins response (direct fetch, returns JSON directly)
        // API returns: { success: true, pins: [...], pagination: {...} }
        if (pinsRes && pinsRes.success && pinsRes.pins) {
          pins = pinsRes.pins;
        } else if (pinsRes && pinsRes.pins) {
          pins = pinsRes.pins;
        } else if (pinsRes && pinsRes.data && Array.isArray(pinsRes.data)) {
          pins = pinsRes.data;
        } else if (Array.isArray(pinsRes)) {
          pins = pinsRes;
        } else {
          pins = [];
        }

        // Handle users response (axios wraps in .data)
        // API returns: { success: true, users: [...], pagination: {...} }
        // Axios wraps: usersRes.data = { success: true, users: [...] }
        if (usersRes && usersRes.data) {
          if (usersRes.data.users) {
            users = usersRes.data.users;
          } else if (usersRes.data.success && usersRes.data.users) {
            users = usersRes.data.users;
          } else if (Array.isArray(usersRes.data)) {
            users = usersRes.data;
          }
        } else if (Array.isArray(usersRes)) {
          users = usersRes;
        } else {
          users = [];
        }

        // Handle suggestions response (same as FeedbacksManagement)
        // API returns: { success: true, suggestions: [...], pagination: {...} }
        // Axios wraps it in .data, so: suggestionsRes.data = { success: true, suggestions: [...] }
        if (suggestionsRes && suggestionsRes.data) {
          if (suggestionsRes.data.suggestions) {
            suggestions = suggestionsRes.data.suggestions;
          } else if (Array.isArray(suggestionsRes.data)) {
            suggestions = suggestionsRes.data;
          }
        } else if (Array.isArray(suggestionsRes)) {
          suggestions = suggestionsRes;
        } else {
          suggestions = [];
        }

        // Handle analytics response
        if (analyticsRes && analyticsRes.data && analyticsRes.data.data) {
          analyticsData = analyticsRes.data.data;
          console.log('✅ Analytics data fetched:', analyticsData);
          
          // Set popular routes and searches
          if (analyticsData.popularRoutes) {
            setPopularRoutes(analyticsData.popularRoutes);
          }
          if (analyticsData.popularSearches) {
            setPopularSearches(analyticsData.popularSearches);
          }
        } else if (analyticsRes && analyticsRes.data) {
          analyticsData = analyticsRes.data;
          if (analyticsData.popularRoutes) {
            setPopularRoutes(analyticsData.popularRoutes);
          }
          if (analyticsData.popularSearches) {
            setPopularSearches(analyticsData.popularSearches);
          }
        }
        
        console.log('✅ Data fetched:', { 
          pins: pins.length, 
          users: users.length, 
          suggestions: suggestions.length,
          pinsSample: pins.slice(0, 2),
          usersSample: users.slice(0, 2),
          suggestionsSample: suggestions.slice(0, 2),
          pinsResStructure: Object.keys(pinsRes || {}),
          usersResStructure: usersRes?.data ? Object.keys(usersRes.data) : 'no data',
          suggestionsResStructure: suggestionsRes?.data ? Object.keys(suggestionsRes.data) : 'no data'
        });
        
        // Warn if suggestions failed but don't block dashboard
        if (suggestions.length === 0 && (!suggestionsRes || !suggestionsRes.data || !suggestionsRes.data.suggestions)) {
          console.warn('⚠️ No suggestions data available. This may be due to a 404 error if the route is not deployed.');
        }
      } catch (err) {
        console.error('❌ Error fetching dashboard data:', err);
        setError(`Error fetching data: ${err.message || 'Unknown error'}. Check console for details.`);
        // Set empty arrays to prevent crashes
        pins = [];
        users = [];
        suggestions = [];
      }

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

      // Calculate local tracking data (user-specific)
      let userSearches = 0;
      let userPathfinding = 0;
      let totalSavedPins = 0;
      const activeUsersSet = new Set();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      users.forEach(user => {
        // Count saved pins
        if (user.activity?.savedPins) {
          totalSavedPins += user.activity.savedPins.length;
        }

        // Count searches (user-specific)
        if (user.activity?.searchCount) {
          userSearches += user.activity.searchCount || 0;
        }

        // Count pathfinding (user-specific)
        if (user.activity?.pathfindingCount) {
          userPathfinding += user.activity.pathfindingCount || 0;
        }

        // Track active users (last 7 days)
        if (user.activity?.lastActiveDate) {
          const lastActive = new Date(user.activity.lastActiveDate);
          if (lastActive >= sevenDaysAgo) {
            activeUsersSet.add(user._id);
          }
        }
      });

      // Combine user-specific and anonymous analytics
      // Ensure analyticsData exists before accessing properties
      const analyticsDataSafe = analyticsData || {};
      const anonymousSearches = analyticsDataSafe.totalSearches || 0;
      const anonymousPathfinding = analyticsDataSafe.totalPathfindingRoutes || 0;
      const totalSearches = userSearches + anonymousSearches;
      const totalPathfinding = userPathfinding + anonymousPathfinding;

      setLocalTracking({
        totalSearches,
        totalPathfinding,
        totalSavedPins,
        activeUsers7Days: activeUsersSet.size,
        userSearches, // User-specific searches
        anonymousSearches, // Anonymous searches
        userPathfinding, // User-specific pathfinding
        anonymousPathfinding, // Anonymous pathfinding
        avgSearchesPerUser: users.length > 0 ? (userSearches / users.length).toFixed(1) : 0,
        avgPathfindingPerUser: users.length > 0 ? (userPathfinding / users.length).toFixed(1) : 0,
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

      // Build usage trends data for charts (last 7 days)
      const usageTrendsData = [];
      const nowForTrends = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(nowForTrends.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Count searches for this day from analytics
        let daySearches = 0;
        const recentSearches = analyticsDataSafe.recentSearches;
        if (recentSearches && Array.isArray(recentSearches)) {
          daySearches = recentSearches.filter(s => {
            if (!s || !s.timestamp) return false;
            const searchDate = new Date(s.timestamp);
            return searchDate >= dayStart && searchDate <= dayEnd;
          }).length;
        }

        // Count pathfinding routes for this day from analytics
        let dayPathfinding = 0;
        const recentRoutes = analyticsDataSafe.recentRoutes;
        if (recentRoutes && Array.isArray(recentRoutes)) {
          dayPathfinding = recentRoutes.filter(r => {
            if (!r || !r.timestamp) return false;
            const routeDate = new Date(r.timestamp);
            return routeDate >= dayStart && routeDate <= dayEnd;
          }).length;
        }

        usageTrendsData.push({
          date: dateStr,
          Searches: daySearches,
          PathfindingRoutes: dayPathfinding
        });
      }

      setUsageTrends(usageTrendsData);
    } catch (error) {
      console.error('❌ Error processing dashboard data:', error);
      setError(`Error processing data: ${error.message || 'Unknown error'}`);
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
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h1>Engagement Analytics</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#ccc' : CAMPUS_TRAILS_BLUE,
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
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
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          margin: '20px',
          borderRadius: '5px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>⚠️ Error:</strong> {error}
          <br />
          <small style={{ marginTop: '10px', display: 'block' }}>
            Check browser console (F12) for more details. Make sure:
            <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
              <li>REACT_APP_API_URL is set correctly in Render</li>
              <li>Backend service is running</li>
              <li>You are logged in</li>
            </ul>
          </small>
          <button 
            onClick={() => {
              setError('');
              fetchData();
            }}
            style={{
              marginTop: '10px',
              padding: '5px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

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

      {/* Usage Analytics with Charts */}
      <div className="dashboard-section">
        <h2>Usage Analytics</h2>
        
        {/* Summary Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_BLUE}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Searches</h3>
            <p className="stat-number" style={{ fontSize: '28px', fontWeight: 'bold' }}>{localTracking.totalSearches}</p>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              {localTracking.userSearches > 0 && (
                <span>Users: {localTracking.userSearches} • </span>
              )}
              {localTracking.anonymousSearches > 0 && (
                <span>Anonymous: {localTracking.anonymousSearches}</span>
              )}
            </p>
            {localTracking.avgSearchesPerUser > 0 && (
              <p style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                Avg: {localTracking.avgSearchesPerUser} per logged-in user
              </p>
            )}
          </div>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_GREEN}`, padding: '15px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Pathfinding Routes</h3>
            <p className="stat-number" style={{ fontSize: '28px', fontWeight: 'bold' }}>{localTracking.totalPathfinding}</p>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              {localTracking.userPathfinding > 0 && (
                <span>Users: {localTracking.userPathfinding} • </span>
              )}
              {localTracking.anonymousPathfinding > 0 && (
                <span>Anonymous: {localTracking.anonymousPathfinding}</span>
              )}
            </p>
            {localTracking.avgPathfindingPerUser > 0 && (
              <p style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                Avg: {localTracking.avgPathfindingPerUser} per logged-in user
              </p>
            )}
          </div>
        </div>

        {/* Usage Trends Chart */}
        {usageTrends.length > 0 && (
          <div className="card" style={{ padding: '20px', marginTop: '20px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>Usage Trends (Last 7 Days)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageTrends}>
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CAMPUS_TRAILS_BLUE} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CAMPUS_TRAILS_BLUE} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPathfinding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CAMPUS_TRAILS_GREEN} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CAMPUS_TRAILS_GREEN} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: '12px', backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Searches" 
                    stroke={CAMPUS_TRAILS_BLUE} 
                    fillOpacity={1}
                    fill="url(#colorSearches)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="PathfindingRoutes" 
                    stroke={CAMPUS_TRAILS_GREEN} 
                    fillOpacity={1}
                    fill="url(#colorPathfinding)"
                    strokeWidth={2}
                    name="Pathfinding Routes"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Additional Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '20px' }}>
          <div className="stat-card" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_YELLOW}`, padding: '15px' }}>
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

      {/* Popular Routes */}
      {popularRoutes.length > 0 && (
        <div className="dashboard-section">
          <h2>Most Popular Routes (Point A → Point B)</h2>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gap: '10px' }}>
              {popularRoutes.slice(0, 10).map((route, index) => (
                <div key={index} style={{ 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '5px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px' }}>
                        {route.startPoint.title || route.startPoint.pinId} → {route.endPoint.title || route.endPoint.pinId}
                      </strong>
                      {route.startPoint.description && (
                        <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 0' }}>
                          {route.startPoint.description} → {route.endPoint.description}
                        </p>
                      )}
                    </div>
                    <div style={{ 
                      backgroundColor: CAMPUS_TRAILS_BLUE, 
                      color: 'white', 
                      padding: '4px 12px', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {route.count}x
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popular Searches */}
      {popularSearches.length > 0 && (
        <div className="dashboard-section">
          <h2>Most Popular Searches</h2>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gap: '10px' }}>
              {popularSearches.slice(0, 10).map((search, index) => (
                <div key={index} style={{ 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '5px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px' }}>"{search.query}"</span>
                  <span style={{ 
                    backgroundColor: CAMPUS_TRAILS_GREEN, 
                    color: 'white', 
                    padding: '4px 12px', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {search.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

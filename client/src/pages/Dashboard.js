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
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [detailedData, setDetailedData] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  const CAMPUS_TRAILS_GREEN = '#28a745';
  const CAMPUS_TRAILS_BLUE = '#007bff';
  const CAMPUS_TRAILS_RED = '#dc3545';
  const CAMPUS_TRAILS_YELLOW = '#ffc107';

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

  const handleCardClick = (metricType) => {
    setSelectedMetric(metricType);
    setSidePanelOpen(true);
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setSelectedMetric(null);
    setDetailedData(null);
  };

  useEffect(() => {
    fetchData();
    checkSystemHealth();
    // Refresh system health every 30 seconds
    const healthInterval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(healthInterval);
  }, [selectedCampus]);

  const fetchDetailedData = async (metricType) => {
    try {
      setDetailedLoading(true);
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      const campusQuery = selectedCampus !== 'all' ? `&campusId=${selectedCampus}` : '';

      switch (metricType) {
        case 'pins':
          const pinsRes = await fetch(`${baseUrl}/api/admin/pins?limit=1000&includeInvisible=true${campusQuery}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json());
          const pins = pinsRes.pins || pinsRes.data || [];
          
          // Group by category/type
          const pinsByType = {};
          pins.forEach(pin => {
            const type = pin.pinType || 'Uncategorized';
            pinsByType[type] = (pinsByType[type] || 0) + 1;
          });

          // Group by campus
          const pinsByCampus = {};
          pins.forEach(pin => {
            const campusName = pin.campusId?.name || 'Unknown Campus';
            pinsByCampus[campusName] = (pinsByCampus[campusName] || 0) + 1;
          });

          setDetailedData({
            total: pins.length,
            byType: pinsByType,
            byCampus: pinsByCampus,
            visible: pins.filter(p => p.visible !== false).length,
            invisible: pins.filter(p => p.visible === false).length
          });
          break;

        case 'users':
          const usersRes = await usersAPI.getAll({ limit: 10000 });
          const users = usersRes.data?.users || usersRes.data || [];

          // Group by registration date (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const recentUsers = users.filter(u => {
            const created = new Date(u.createdAt || u.dateJoined || 0);
            return created >= thirtyDaysAgo;
          });

          // Active users breakdown
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const activeUsers = users.filter(u => {
            if (!u.activity?.lastActiveDate) return false;
            const lastActive = new Date(u.activity.lastActiveDate);
            return lastActive >= sevenDaysAgo;
          });

          setDetailedData({
            total: users.length,
            recentUsers: recentUsers.length,
            activeUsers: activeUsers.length,
            usersWithActivity: users.filter(u => u.activity).length
          });
          break;

        case 'campuses':
          const campusesRes = await campusesAPI.getAll();
          const campusesData = campusesRes.data?.campuses || campusesRes.data || [];

          setDetailedData({
            total: campusesData.length,
            campuses: campusesData.map(c => ({
              name: c.name,
              id: c._id,
              location: c.location
            }))
          });
          break;

        case 'feedbacks':
          const [feedbacksUsersRes, suggestionsRes] = await Promise.all([
            usersAPI.getAll({ limit: 10000 }),
            suggestionsAndFeedbacksAPI.getAll({ limit: 1000 })
          ]);
          const allUsers = feedbacksUsersRes.data?.users || feedbacksUsersRes.data || [];
          const suggestions = suggestionsRes.data?.suggestions || suggestionsRes.data || [];

          const allFeedbackHistory = [];
          allUsers.forEach(user => {
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

          // Group by type
          const feedbacksByType = {};
          allFeedbackHistory.forEach(f => {
            const type = f.type || f.feedbackType || 'General';
            feedbacksByType[type] = (feedbacksByType[type] || 0) + 1;
          });

          // Recent feedbacks (last 7 days)
          const sevenDaysAgoFeedback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const recentFeedbacks = allFeedbackHistory.filter(f => {
            const date = new Date(f.date || f.createdAt || 0);
            return date >= sevenDaysAgoFeedback;
          });

          setDetailedData({
            total: allFeedbackHistory.length,
            byType: feedbacksByType,
            recent: recentFeedbacks.length,
            appFeedback: suggestions.length
          });
          break;

        case 'appFeedback':
          const appFeedbackRes = await suggestionsAndFeedbacksAPI.getAll({ limit: 1000 });
          const appFeedbacks = appFeedbackRes.data?.suggestions || appFeedbackRes.data || [];

          // Group by status
          const feedbacksByStatus = {};
          appFeedbacks.forEach(f => {
            const status = f.status || 'Pending';
            feedbacksByStatus[status] = (feedbacksByStatus[status] || 0) + 1;
          });

          // Recent feedbacks
          const sevenDaysAgoApp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const recentAppFeedbacks = appFeedbacks.filter(f => {
            const date = new Date(f.createdAt || 0);
            return date >= sevenDaysAgoApp;
          });

          setDetailedData({
            total: appFeedbacks.length,
            byStatus: feedbacksByStatus,
            recent: recentAppFeedbacks.length
          });
          break;

        case 'searches':
          const searchesUsersRes = await usersAPI.getAll({ limit: 10000 });
          const searchesUsers = searchesUsersRes.data?.users || searchesUsersRes.data || [];

          let totalSearches = 0;
          const searchesByUser = [];
          searchesUsers.forEach(user => {
            const count = user.activity?.searchCount || 0;
            if (count > 0) {
              totalSearches += count;
              searchesByUser.push({
                userId: user._id,
                email: user.email,
                count
              });
            }
          });
          searchesByUser.sort((a, b) => b.count - a.count);

          setDetailedData({
            total: totalSearches,
            usersWithSearches: searchesByUser.length,
            topUsers: searchesByUser.slice(0, 10),
            average: searchesUsers.length > 0 ? (totalSearches / searchesUsers.length).toFixed(1) : 0
          });
          break;

        case 'pathfinding':
          const pathfindingUsersRes = await usersAPI.getAll({ limit: 10000 });
          const pathfindingUsers = pathfindingUsersRes.data?.users || pathfindingUsersRes.data || [];

          let totalPathfinding = 0;
          const pathfindingByUser = [];
          pathfindingUsers.forEach(user => {
            const count = user.activity?.pathfindingCount || 0;
            if (count > 0) {
              totalPathfinding += count;
              pathfindingByUser.push({
                userId: user._id,
                email: user.email,
                count
              });
            }
          });
          pathfindingByUser.sort((a, b) => b.count - a.count);

          setDetailedData({
            total: totalPathfinding,
            usersWithPathfinding: pathfindingByUser.length,
            topUsers: pathfindingByUser.slice(0, 10),
            average: pathfindingUsers.length > 0 ? (totalPathfinding / pathfindingUsers.length).toFixed(1) : 0
          });
          break;

        case 'savedPins':
          const savedPinsUsersRes = await usersAPI.getAll({ limit: 10000 });
          const savedPinsUsers = savedPinsUsersRes.data?.users || savedPinsUsersRes.data || [];

          let totalSavedPins = 0;
          const savedPinsByUser = [];
          savedPinsUsers.forEach(user => {
            const count = user.activity?.savedPins?.length || 0;
            if (count > 0) {
              totalSavedPins += count;
              savedPinsByUser.push({
                userId: user._id,
                email: user.email,
                count
              });
            }
          });
          savedPinsByUser.sort((a, b) => b.count - a.count);

          setDetailedData({
            total: totalSavedPins,
            usersWithSavedPins: savedPinsByUser.length,
            topUsers: savedPinsByUser.slice(0, 10),
            average: savedPinsUsers.length > 0 ? (totalSavedPins / savedPinsUsers.length).toFixed(1) : 0
          });
          break;

        case 'activeUsers':
          const activeUsersRes = await usersAPI.getAll({ limit: 10000 });
          const activeUsersData = activeUsersRes.data?.users || activeUsersRes.data || [];

          const sevenDaysAgoActive = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const thirtyDaysAgoActive = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          const active7Days = activeUsersData.filter(u => {
            if (!u.activity?.lastActiveDate) return false;
            const lastActive = new Date(u.activity.lastActiveDate);
            return lastActive >= sevenDaysAgoActive;
          });

          const active30Days = activeUsersData.filter(u => {
            if (!u.activity?.lastActiveDate) return false;
            const lastActive = new Date(u.activity.lastActiveDate);
            return lastActive >= thirtyDaysAgoActive;
          });

          setDetailedData({
            active7Days: active7Days.length,
            active30Days: active30Days.length,
            totalUsers: activeUsersData.length,
            inactiveUsers: activeUsersData.length - active30Days.length
          });
          break;

        default:
          setDetailedData(null);
      }
    } catch (error) {
      console.error('Error fetching detailed data:', error);
      setDetailedData(null);
    } finally {
      setDetailedLoading(false);
    }
  };

  useEffect(() => {
    if (sidePanelOpen && selectedMetric) {
      fetchDetailedData(selectedMetric);
    }
  }, [sidePanelOpen, selectedMetric, selectedCampus]);

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

  const getMetricTitle = (metricType) => {
    const titles = {
      pins: 'Total Pins',
      users: 'Total Users',
      campuses: 'Campuses',
      feedbacks: 'Facility Reports',
      appFeedback: 'App Feedback',
      searches: 'Total Searches',
      pathfinding: 'Pathfinding Routes',
      savedPins: 'Total Saved Pins',
      activeUsers: 'Active Users (7 Days)'
    };
    return titles[metricType] || metricType;
  };

  const renderDetailedContent = () => {
    if (detailedLoading) {
      return (
        <div className="side-panel-loading">
          <div className="spinner"></div>
          <p>Loading detailed metrics...</p>
        </div>
      );
    }

    if (!detailedData) {
      return <p>No detailed data available.</p>;
    }

    switch (selectedMetric) {
      case 'pins':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>Overview</h3>
              <div className="metric-row">
                <span>Total Pins:</span>
                <strong>{detailedData.total}</strong>
              </div>
              <div className="metric-row">
                <span>Visible:</span>
                <strong>{detailedData.visible}</strong>
              </div>
              <div className="metric-row">
                <span>Invisible:</span>
                <strong>{detailedData.invisible}</strong>
              </div>
            </div>

            {Object.keys(detailedData.byType).length > 0 && (
              <div className="metric-section">
                <h3>By Type</h3>
                {Object.entries(detailedData.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="metric-row">
                      <span>{type}:</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            )}

            {Object.keys(detailedData.byCampus).length > 0 && (
              <div className="metric-section">
                <h3>By Campus</h3>
                {Object.entries(detailedData.byCampus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([campus, count]) => (
                    <div key={campus} className="metric-row">
                      <span>{campus}:</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );

      case 'users':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>Overview</h3>
              <div className="metric-row">
                <span>Total Users:</span>
                <strong>{detailedData.total}</strong>
              </div>
              <div className="metric-row">
                <span>Active (7 Days):</span>
                <strong>{detailedData.activeUsers}</strong>
              </div>
              <div className="metric-row">
                <span>Recent (30 Days):</span>
                <strong>{detailedData.recentUsers}</strong>
              </div>
              <div className="metric-row">
                <span>With Activity:</span>
                <strong>{detailedData.usersWithActivity}</strong>
              </div>
            </div>
          </div>
        );

      case 'campuses':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>Campuses ({detailedData.total})</h3>
              {detailedData.campuses.map(campus => (
                <div key={campus.id} className="campus-item">
                  <strong>{campus.name}</strong>
                  {campus.location && (
                    <span className="campus-location">{campus.location}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'feedbacks':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>Overview</h3>
              <div className="metric-row">
                <span>Total Reports:</span>
                <strong>{detailedData.total}</strong>
              </div>
              <div className="metric-row">
                <span>Recent (7 Days):</span>
                <strong>{detailedData.recent}</strong>
              </div>
              <div className="metric-row">
                <span>App Feedback:</span>
                <strong>{detailedData.appFeedback}</strong>
              </div>
            </div>

            {Object.keys(detailedData.byType).length > 0 && (
              <div className="metric-section">
                <h3>By Type</h3>
                {Object.entries(detailedData.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="metric-row">
                      <span>{type}:</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );

      case 'appFeedback':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>Overview</h3>
              <div className="metric-row">
                <span>Total Feedback:</span>
                <strong>{detailedData.total}</strong>
              </div>
              <div className="metric-row">
                <span>Recent (7 Days):</span>
                <strong>{detailedData.recent}</strong>
              </div>
            </div>

            {Object.keys(detailedData.byStatus).length > 0 && (
              <div className="metric-section">
                <h3>By Status</h3>
                {Object.entries(detailedData.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="metric-row">
                      <span>{status}:</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );

      case 'searches':
      case 'pathfinding':
      case 'savedPins':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>Overview</h3>
              <div className="metric-row">
                <span>Total:</span>
                <strong>{detailedData.total}</strong>
              </div>
              <div className="metric-row">
                <span>Users with Activity:</span>
                <strong>{detailedData.usersWithSearches || detailedData.usersWithPathfinding || detailedData.usersWithSavedPins}</strong>
              </div>
              <div className="metric-row">
                <span>Average per User:</span>
                <strong>{detailedData.average}</strong>
              </div>
            </div>

            {detailedData.topUsers && detailedData.topUsers.length > 0 && (
              <div className="metric-section">
                <h3>Top Users</h3>
                {detailedData.topUsers.map((user, idx) => (
                  <div key={user.userId || idx} className="metric-row">
                    <span>{user.email || 'Unknown'}:</span>
                    <strong>{user.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'activeUsers':
        return (
          <div className="detailed-metrics">
            <div className="metric-summary">
              <h3>User Activity</h3>
              <div className="metric-row">
                <span>Active (7 Days):</span>
                <strong>{detailedData.active7Days}</strong>
              </div>
              <div className="metric-row">
                <span>Active (30 Days):</span>
                <strong>{detailedData.active30Days}</strong>
              </div>
              <div className="metric-row">
                <span>Total Users:</span>
                <strong>{detailedData.totalUsers}</strong>
              </div>
              <div className="metric-row">
                <span>Inactive Users:</span>
                <strong>{detailedData.inactiveUsers}</strong>
              </div>
            </div>
          </div>
        );

      default:
        return <p>No detailed information available.</p>;
    }
  };

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
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_BLUE}`, padding: '15px' }} onClick={() => handleCardClick('pins')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Pins</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.pins}</p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_GREEN}`, padding: '15px' }} onClick={() => handleCardClick('users')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Users</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.users}</p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_YELLOW}`, padding: '15px' }} onClick={() => handleCardClick('campuses')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Campuses</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.campuses}</p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_RED}`, padding: '15px' }} onClick={() => handleCardClick('feedbacks')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Facility Reports</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.feedbacks}</p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid #6f42c1`, padding: '15px' }} onClick={() => handleCardClick('appFeedback')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>App Feedback</h3>
            <p className="stat-number" style={{ fontSize: '28px' }}>{stats.suggestionsAndFeedbacks}</p>
          </div>
        </div>
      </div>

      {/* Simple Local Tracking */}
      <div className="dashboard-section">
        <h2>Local Tracking Data</h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_BLUE}`, padding: '15px' }} onClick={() => handleCardClick('searches')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Searches</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.totalSearches}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Avg: {localTracking.avgSearchesPerUser} per user
            </p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_YELLOW}`, padding: '15px' }} onClick={() => handleCardClick('pathfinding')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Pathfinding Routes</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.totalPathfinding}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Avg: {localTracking.avgPathfindingPerUser} per user
            </p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid ${CAMPUS_TRAILS_GREEN}`, padding: '15px' }} onClick={() => handleCardClick('savedPins')}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Total Saved Pins</h3>
            <p className="stat-number" style={{ fontSize: '24px' }}>{localTracking.totalSavedPins}</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Avg: {localTracking.avgSavedPinsPerUser} per user
            </p>
          </div>
          <div className="stat-card clickable" style={{ borderTop: `4px solid #6f42c1`, padding: '15px' }} onClick={() => handleCardClick('activeUsers')}>
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

      {/* Side Panel */}
      {sidePanelOpen && (
        <>
          <div className="side-panel-overlay" onClick={closeSidePanel}></div>
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{getMetricTitle(selectedMetric)}</h2>
              <button className="side-panel-close" onClick={closeSidePanel}>×</button>
            </div>
            <div className="side-panel-content">
              {renderDetailedContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;

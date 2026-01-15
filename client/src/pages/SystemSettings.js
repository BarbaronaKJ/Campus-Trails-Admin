import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

function SystemSettings() {
  const [apiUrl, setApiUrl] = useState('');
  const [healthStatus, setHealthStatus] = useState({
    mongodb: 'checking',
    express: 'checking'
  });

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      
      // Check Express
      try {
        const expressRes = await fetch(`${baseUrl}/health`);
        setHealthStatus(prev => ({ ...prev, express: expressRes.ok ? 'online' : 'offline' }));
      } catch {
        setHealthStatus(prev => ({ ...prev, express: 'offline' }));
      }

      // Check MongoDB
      try {
        const token = localStorage.getItem('adminToken');
        const mongoRes = await fetch(`${baseUrl}/api/admin/pins?limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setHealthStatus(prev => ({ ...prev, mongodb: mongoRes.ok ? 'online' : 'offline' }));
      } catch {
        setHealthStatus(prev => ({ ...prev, mongodb: 'offline' }));
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
  };

  return (
    <div className="container">
      <h1>API Configuration</h1>
      <div className="card">
        <h2>Current Configuration</h2>
        <div className="form-group">
          <label>API Base URL</label>
          <input 
            type="text" 
            value={apiUrl} 
            readOnly
            className="form-group input"
            style={{ backgroundColor: '#f5f5f5' }}
          />
          <small>This is read-only. Update via environment variables.</small>
        </div>
      </div>

      <div className="card">
        <h2>Connection Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div className={`health-card ${healthStatus.mongodb === 'online' ? 'online' : 'offline'}`}>
            <div className="health-indicator"></div>
            <div>
              <h3>MongoDB Atlas</h3>
              <p>{healthStatus.mongodb === 'online' ? '✓ Connected' : '✗ Disconnected'}</p>
            </div>
          </div>
          <div className={`health-card ${healthStatus.express === 'online' ? 'online' : 'offline'}`}>
            <div className="health-indicator"></div>
            <div>
              <h3>Express Server</h3>
              <p>{healthStatus.express === 'online' ? '✓ Running' : '✗ Offline'}</p>
            </div>
          </div>
        </div>
        <button onClick={checkHealth} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Refresh Status
        </button>
      </div>
    </div>
  );
}

export default SystemSettings;

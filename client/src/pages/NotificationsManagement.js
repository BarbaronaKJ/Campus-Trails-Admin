import React, { useState } from 'react';
import { notificationsAPI } from '../services/api';

function NotificationsManagement() {
  const [formData, setFormData] = useState({ title: '', body: '', targetAudience: 'all' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState(null);

  const handleSend = async () => {
    try {
      if (!formData.title || !formData.body) {
        setMessage({ type: 'error', text: 'Please fill in both title and body' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        return;
      }

      if (formData.title.trim().length === 0 || formData.body.trim().length === 0) {
        setMessage({ type: 'error', text: 'Title and body cannot be empty' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        return;
      }

      setLoading(true);
      setMessage({ type: '', text: '' });
      setStats(null);

      console.log('Sending notification:', formData);
      const response = await notificationsAPI.send(formData);
      console.log('Notification response:', response);
      
      if (response.data.success) {
        const responseStats = response.data.stats || {};
        setStats(responseStats);
        setMessage({ 
          type: 'success', 
          text: `Notification sent successfully! Total: ${responseStats.total || 0}, Success: ${responseStats.success || 0}, Failed: ${responseStats.failed || 0}` 
        });
        setFormData({ title: '', body: '', targetAudience: 'all' });
        setTimeout(() => {
          setMessage({ type: '', text: '' });
          setStats(null);
        }, 10000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to send notification' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send notification';
      setMessage({ type: 'error', text: `Error: ${errorMessage}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Send Push Notifications</h1>
      
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
          {message.text}
        </div>
      )}

      {stats && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
          <h3>Delivery Statistics</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <strong>Total Recipients:</strong> {stats.total || 0}
            </div>
            <div style={{ color: '#28a745' }}>
              <strong>Success:</strong> {stats.success || 0}
            </div>
            <div style={{ color: '#dc3545' }}>
              <strong>Failed:</strong> {stats.failed || 0}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="form-group">
          <label>Title *</label>
          <input 
            type="text"
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
            placeholder="Enter notification title"
            disabled={loading}
            maxLength={100}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            {formData.title.length}/100 characters
          </small>
        </div>
        
        <div className="form-group">
          <label>Body *</label>
          <textarea 
            value={formData.body} 
            onChange={e => setFormData({ ...formData, body: e.target.value })} 
            placeholder="Enter notification message"
            rows={5}
            disabled={loading}
            maxLength={500}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            {formData.body.length}/500 characters
          </small>
        </div>
        
        <div className="form-group">
          <label>Target Audience</label>
          <select 
            value={formData.targetAudience} 
            onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
            disabled={loading}
          >
            <option value="all">All Users (with push tokens)</option>
            <option value="students">Students Only</option>
            <option value="admins">Admins Only</option>
          </select>
          <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
            Only users who have enabled push notifications and registered their devices will receive notifications.
          </small>
        </div>
        
        <button 
          onClick={handleSend} 
          className="btn btn-primary" 
          disabled={loading || !formData.title.trim() || !formData.body.trim()}
          style={{ opacity: (loading || !formData.title.trim() || !formData.body.trim()) ? 0.6 : 1 }}
        >
          {loading ? 'Sending...' : 'Send Notification'}
        </button>
      </div>

      <div className="card" style={{ marginTop: '20px', backgroundColor: '#f8f9fa' }}>
        <h3>📱 About Push Notifications</h3>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Notifications are sent to users who have enabled push notifications in the mobile app</li>
          <li>Users must have the app installed and have granted notification permissions</li>
          <li>Notifications are delivered via Expo Push Notification Service</li>
          <li>Delivery statistics show how many notifications were successfully sent</li>
        </ul>
      </div>
    </div>
  );
}

export default NotificationsManagement;

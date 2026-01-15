import React, { useState } from 'react';
import { notificationsAPI, usersAPI } from '../services/api';

function NotificationsManagement() {
  const [formData, setFormData] = useState({ title: '', body: '', targetAudience: 'all' });

  const handleSend = async () => {
    try {
      if (!formData.title || !formData.body) {
        alert('Please fill in both title and body');
        return;
      }

      console.log('Sending notification:', formData);
      const response = await notificationsAPI.send(formData);
      console.log('Notification response:', response);
      
      if (response.data.success) {
        const stats = response.data.stats || {};
        alert(`Notification sent successfully!\n\nTotal: ${stats.total || 0}\nSuccess: ${stats.success || 0}\nFailed: ${stats.failed || 0}`);
        setFormData({ title: '', body: '', targetAudience: 'all' });
      } else {
        alert(`Error: ${response.data.message || 'Failed to send notification'}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send notification';
      alert(`Error sending notification: ${errorMessage}`);
    }
  };

  return (
    <div className="container">
      <h1>Send Notifications</h1>
      <div className="card">
        <div className="form-group">
          <label>Title</label>
          <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Body</label>
          <textarea value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Target Audience</label>
          <select value={formData.targetAudience} onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}>
            <option value="all">All Users</option>
            <option value="students">Students Only</option>
            <option value="admins">Admins Only</option>
          </select>
        </div>
        <button onClick={handleSend} className="btn btn-primary">Send Notification</button>
      </div>
    </div>
  );
}

export default NotificationsManagement;

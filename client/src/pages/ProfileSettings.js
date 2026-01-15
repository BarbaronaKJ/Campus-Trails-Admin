import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';

function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Update form fields when user changes
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setUsername(user.username || '');
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await profileAPI.updateProfile({
        email,
        username,
        displayName
      });

      if (response.data.success) {
        // Update user in context
        setUser(response.data.user);
        // Update localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        localStorage.setItem('currentUser', JSON.stringify({
          ...currentUser,
          ...response.data.user
        }));
        
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validation
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      const response = await profileAPI.changePassword({
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to change password. Please check your current password and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Profile Settings</h1>
      
      {/* Message Display */}
      {message.text && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            padding: '15px'
          }}
        >
          {message.text}
        </div>
      )}
      
      <div className="card">
        <h2>Account Information</h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label>Email *</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="Optional"
            />
          </div>
          <div className="form-group">
            <label>Display Name</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              placeholder="Optional"
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password *</label>
            <input 
              type="password" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-group">
            <label>New Password *</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              required
              minLength={6}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Must be at least 6 characters
            </small>
          </div>
          <div className="form-group">
            <label>Confirm New Password *</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileSettings;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState({ type: '', text: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage({ type: '', text: '' });
    setForgotPasswordLoading(true);

    try {
      const response = await authAPI.forgotPassword(forgotPasswordEmail, false);
      if (response.data.success) {
        setForgotPasswordMessage({ 
          type: 'success', 
          text: response.data.message || 'Password reset email has been sent. Please check your inbox.' 
        });
        setForgotPasswordEmail('');
        // Hide form after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotPasswordMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to send password reset email. Please try again.' 
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Campus Trails Admin</h1>
        <p>Sign in to access the admin panel</p>
        
        {!showForgotPassword ? (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                Forgot Password?
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>Reset Password</h2>
            {forgotPasswordMessage.text && (
              <div className={`alert ${forgotPasswordMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {forgotPasswordMessage.text}
              </div>
            )}
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your admin email"
                  required
                  disabled={forgotPasswordLoading}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={forgotPasswordLoading}>
                {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setForgotPasswordMessage({ type: '', text: '' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;

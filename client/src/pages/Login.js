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
  const [forgotSecretQuestion, setForgotSecretQuestion] = useState('');
  const [forgotSecretAnswer, setForgotSecretAnswer] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
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

  const handleGetSecretQuestion = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage({ type: '', text: '' });
    setForgotPasswordLoading(true);

    try {
      const response = await authAPI.forgotPassword(forgotPasswordEmail);
      if (response.data.success && response.data.secretQuestion) {
        setForgotSecretQuestion(response.data.secretQuestion);
        setForgotPasswordMessage({ type: '', text: '' });
      } else {
        setForgotPasswordMessage({ 
          type: 'error', 
          text: response.data.message || 'Unable to reset password. Please contact support.' 
        });
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotPasswordMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to get secret question. Please try again.' 
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage({ type: '', text: '' });
    setForgotPasswordLoading(true);

    if (!forgotSecretAnswer || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotPasswordMessage({ type: 'error', text: 'Please fill in all fields' });
      setForgotPasswordLoading(false);
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setForgotPasswordLoading(false);
      return;
    }

    const hasCapital = /[A-Z]/.test(forgotNewPassword);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(forgotNewPassword);
    
    if (!hasCapital || !hasSymbol) {
      setForgotPasswordMessage({ type: 'error', text: 'Password must contain at least one capital letter and one symbol' });
      setForgotPasswordLoading(false);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      setForgotPasswordLoading(false);
      return;
    }

    try {
      const response = await authAPI.resetPassword({
        email: forgotPasswordEmail,
        secretAnswer: forgotSecretAnswer,
        newPassword: forgotNewPassword
      });
      if (response.data.success) {
        setForgotPasswordMessage({ 
          type: 'success', 
          text: 'Password has been reset successfully! You can now login with your new password.' 
        });
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordEmail('');
          setForgotSecretQuestion('');
          setForgotSecretAnswer('');
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setForgotPasswordMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setForgotPasswordMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to reset password. Please check your secret answer.' 
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
            {!forgotSecretQuestion ? (
              <form onSubmit={handleGetSecretQuestion}>
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
                  {forgotPasswordLoading ? 'Loading...' : 'Get Secret Question'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>Secret Question</label>
                  <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic', marginBottom: '10px' }}>
                    {forgotSecretQuestion}
                  </p>
                </div>
                <div className="form-group">
                  <label>Secret Answer</label>
                  <input
                    type="text"
                    value={forgotSecretAnswer}
                    onChange={(e) => setForgotSecretAnswer(e.target.value)}
                    placeholder="Enter your secret answer"
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 6 characters, 1 capital, 1 symbol"
                    required
                    disabled={forgotPasswordLoading}
                    minLength={6}
                  />
                  <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                    Must contain at least one capital letter and one symbol
                  </small>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={forgotPasswordLoading}>
                  {forgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSecretQuestion('');
                    setForgotSecretAnswer('');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                    setForgotPasswordMessage({ type: '', text: '' });
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: '10px', width: '100%' }}
                >
                  Back
                </button>
              </form>
            )}
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setForgotSecretQuestion('');
                  setForgotSecretAnswer('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
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

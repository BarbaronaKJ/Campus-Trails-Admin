import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI, suggestionsAndFeedbacksAPI } from '../services/api';

function FeedbacksManagement() {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'suggestions'
  const [feedbacks, setFeedbacks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both Facility Reports and User App Feedback simultaneously
      console.log('🔄 Fetching both Facility Reports and User App Feedback...');
      
      const [usersRes, suggestionsRes] = await Promise.allSettled([
        // Fetch all users and extract their feedbackHistory (Facility Reports)
        usersAPI.getAll({ limit: 10000 }),
        // Fetch suggestions and feedbacks (User App Feedback)
        suggestionsAndFeedbacksAPI.getAll({ limit: 1000 }).catch(err => {
          console.error('❌ Error fetching User App Feedback:', err);
          return { data: null, error: err };
        })
      ]);
      
      // Process Facility Reports
      if (usersRes.status === 'fulfilled') {
        try {
          const users = usersRes.value.data.users || [];
          
          // Flatten all feedbackHistory entries from all users
          const allFeedbacks = [];
          users.forEach(user => {
            if (user.activity && user.activity.feedbackHistory && Array.isArray(user.activity.feedbackHistory)) {
              user.activity.feedbackHistory.forEach(feedback => {
                allFeedbacks.push({
                  ...feedback,
                  userId: {
                    _id: user._id,
                    email: user.email,
                    username: user.username,
                    displayName: user.displayName
                  },
                  _id: feedback._id || feedback.id // Use feedback's _id or id as unique identifier
                });
              });
            }
          });
          
          // Sort by date (newest first)
          allFeedbacks.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateB - dateA;
          });
          
          setFeedbacks(allFeedbacks);
          console.log('✅ Facility Reports fetched:', allFeedbacks.length, 'items');
        } catch (error) {
          console.error('❌ Error processing Facility Reports:', error);
          setFeedbacks([]);
        }
      } else {
        console.error('❌ Error fetching Facility Reports:', usersRes.reason);
        setFeedbacks([]);
      }
      
      // Process User App Feedback
      if (suggestionsRes.status === 'fulfilled' && suggestionsRes.value && suggestionsRes.value.data) {
        try {
          const res = suggestionsRes.value;
          console.log('✅ Suggestions API response:', res);
          
          // Handle different response structures
          let suggestionsData = [];
          if (res && res.data) {
            if (res.data.suggestions) {
              suggestionsData = res.data.suggestions;
            } else if (res.data.success && res.data.suggestions) {
              suggestionsData = res.data.suggestions;
            } else if (Array.isArray(res.data)) {
              suggestionsData = res.data;
            }
          } else if (Array.isArray(res)) {
            suggestionsData = res;
          }
          
          console.log('✅ User App Feedback fetched:', suggestionsData.length, 'items');
          console.log('📋 Sample data:', suggestionsData.slice(0, 2));
          setSuggestions(suggestionsData);
          setError(''); // Clear any previous errors
        } catch (error) {
          console.error('❌ Error processing User App Feedback:', error);
          setSuggestions([]);
        }
      } else {
        // Handle error case
        const suggestionsError = suggestionsRes.status === 'rejected' ? suggestionsRes.reason : (suggestionsRes.value?.error);
        console.error('❌ Error fetching User App Feedback:', suggestionsError);
        console.error('❌ Error details:', suggestionsError?.response?.data || suggestionsError?.message);
        console.error('❌ Status code:', suggestionsError?.response?.status);
        setSuggestions([]);
        
        // Set error message
        if (suggestionsError?.response?.status === 404) {
          setError('Route not found. The backend needs to be redeployed with the suggestions_and_feedbacks route. Please trigger a manual deployment in Render.');
        } else {
          setError(`Error loading User App Feedback: ${suggestionsError?.message || 'Unknown error'}. Check console for details.`);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setFeedbacks([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []); // Remove activeTab dependency - fetch both always

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteFeedback = async (feedbackData) => {
    if (!window.confirm('Are you sure you want to delete this feedback/report?')) {
      return;
    }
    
    try {
      // Get the user to update
      const userId = feedbackData.userId._id;
      const feedbackId = feedbackData._id || feedbackData.id;
      
      // Fetch the user's current data
      const userRes = await usersAPI.getById(userId);
      const user = userRes.data.user;
      
      // Remove the feedback from the user's feedbackHistory
      const updatedFeedbackHistory = (user.activity?.feedbackHistory || []).filter(
        fb => (fb._id?.toString() !== feedbackId?.toString()) && (fb.id?.toString() !== feedbackId?.toString())
      );
      
      // Update the user with the modified activity
      await usersAPI.update(userId, {
        activity: {
          ...user.activity,
          feedbackHistory: updatedFeedbackHistory
        }
      });
      
      await fetchData();
      alert('Feedback deleted successfully');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const handleDeleteSuggestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this suggestion/feedback?')) {
      return;
    }
    try {
      await suggestionsAndFeedbacksAPI.delete(id);
      await fetchData();
      alert('Suggestion deleted successfully');
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      alert('Failed to delete suggestion');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await suggestionsAndFeedbacksAPI.update(id, { status });
      await fetchData();
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackData, newStatus) => {
    try {
      // Get the user to update
      const userId = feedbackData.userId._id;
      const feedbackId = feedbackData._id || feedbackData.id;
      
      // Fetch the user's current data
      const userRes = await usersAPI.getById(userId);
      const user = userRes.data.user;
      
      // Update the feedback status in the user's feedbackHistory
      const updatedFeedbackHistory = (user.activity?.feedbackHistory || []).map(fb => {
        if ((fb._id?.toString() === feedbackId?.toString()) || (fb.id?.toString() === feedbackId?.toString())) {
          return { ...fb, status: newStatus };
        }
        return fb;
      });
      
      // Update the user with the modified activity
      await usersAPI.update(userId, {
        activity: {
          ...user.activity,
          feedbackHistory: updatedFeedbackHistory
        }
      });
      
      await fetchData();
      // Don't show alert for status updates to avoid spam
    } catch (error) {
      console.error('Error updating feedback status:', error);
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>Feedbacks & Reports</h1>
      
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('reports')}
          className="btn"
          style={{
            padding: '12px 24px',
            background: activeTab === 'reports' ? '#007bff' : 'transparent',
            color: activeTab === 'reports' ? '#fff' : '#333',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid #007bff' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'reports' ? 'bold' : 'normal'
          }}
        >
          Facility Reports ({feedbacks.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className="btn"
          style={{
            padding: '12px 24px',
            background: activeTab === 'suggestions' ? '#007bff' : 'transparent',
            color: activeTab === 'suggestions' ? '#fff' : '#333',
            border: 'none',
            borderBottom: activeTab === 'suggestions' ? '3px solid #007bff' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'suggestions' ? 'bold' : 'normal'
          }}
        >
          User App Feedback ({suggestions.length})
        </button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Facility Reports</h2>
          {feedbacks.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No facility reports found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr style={{ fontSize: '12px' }}>
                    <th style={{ fontSize: '12px', padding: '8px' }}>User</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Building/Facility</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Type</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Comment</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Rating</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Status</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Date</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((f, index) => (
                    <tr key={f._id || f.id || `feedback-${index}`} style={{ fontSize: '12px' }}>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{f.userId?.email || f.userId?.username || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{f.pinTitle || f.pinId?.description || f.pinId?.title || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{f.feedbackType || 'report'}</td>
                      <td style={{ maxWidth: '250px', wordWrap: 'break-word', fontSize: '12px', padding: '8px' }}>
                        {f.comment || 'N/A'}
                      </td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{f.rating ? '⭐'.repeat(Math.min(f.rating, 5)) : 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>
                        <select
                          value={f.status || 'new'}
                          onChange={(e) => handleUpdateFeedbackStatus(f, e.target.value)}
                          style={{ 
                            padding: '4px 6px', 
                            fontSize: '11px', 
                            borderRadius: '4px', 
                            border: '1px solid #ddd',
                            width: '100px'
                          }}
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{new Date(f.date || f.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>
                        <button
                          onClick={() => handleDeleteFeedback(f)}
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>User App Feedback</h2>
          
          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '5px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>⚠️ Error:</strong> {error}
              <br />
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
          
          {suggestions.length === 0 && !error ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              No user app feedback found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr style={{ fontSize: '12px' }}>
                    <th style={{ fontSize: '12px', padding: '8px' }}>User</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Type</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Message</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Status</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Date</th>
                    <th style={{ fontSize: '12px', padding: '8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map(s => (
                    <tr key={s._id} style={{ fontSize: '12px' }}>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{s.userId?.email || s.userId?.username || 'N/A'}</td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{s.type || 'suggestion'}</td>
                      <td style={{ maxWidth: '250px', wordWrap: 'break-word', fontSize: '12px', padding: '8px' }}>
                        {s.message || s.feedback || 'N/A'}
                      </td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>
                        <select
                          value={s.status || 'new'}
                          onChange={(e) => handleUpdateStatus(s._id, e.target.value)}
                          style={{ 
                            padding: '4px 6px', 
                            fontSize: '11px', 
                            borderRadius: '4px', 
                            border: '1px solid #ddd',
                            width: '100px'
                          }}
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '12px', padding: '8px' }}>
                        <button
                          onClick={() => handleDeleteSuggestion(s._id)}
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FeedbacksManagement;

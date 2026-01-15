import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'admins', or 'superAdmins'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // Current logged-in admin

  useEffect(() => {
    fetchCurrentUser();
    fetchData();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      
      // Decode token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;
      
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch users (students)
      const usersRes = await usersAPI.getAll({ limit: 1000 });
      const allUsers = usersRes.data?.users || usersRes.data || [];
      
      // Separate users, admins, and super admins
      const students = allUsers.filter(u => u.role === 'student' || !u.role);
      const adminUsers = allUsers.filter(u => u.role === 'admin');
      const superAdminUsers = allUsers.filter(u => u.role === 'super_admin');
      
      setUsers(students);
      setAdmins(adminUsers);
      setSuperAdmins(superAdminUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, userType = 'user') => {
    // Check if current user is super_admin
    if (!currentUser || currentUser.role !== 'super_admin') {
      setError('Only super admins can delete admins');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this ${userType}?`)) return;
    
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      
      // Delete from users collection (all roles are in users collection)
      const endpoint = `${baseUrl}/api/admin/users/${id}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setSuccess(`${userType.charAt(0).toUpperCase() + userType.slice(1)} deleted successfully`);
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      setError(`Failed to delete ${userType}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleRoleChange = async (id, currentRole, newRole) => {
    // Check if trying to set super_admin role - only current super_admin can do this
    if (newRole === 'super_admin' && (!currentUser || currentUser.role !== 'super_admin')) {
      setError('Only super admins can assign super_admin role');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    // Check if trying to edit admin role - only super_admin can do this
    if (currentRole === 'admin' && (!currentUser || currentUser.role !== 'super_admin')) {
      setError('Only super admins can edit admin accounts');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${baseUrl}/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      setSuccess('Role updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
      fetchCurrentUser(); // Refresh current user in case role changed
    } catch (error) {
      console.error('Error updating role:', error);
      setError('Failed to update role');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>User Management</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tabs */}
      <div className="card">
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #28a745', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('users')}
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'users' ? '#28a745' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? 'bold' : 'normal',
              borderBottom: activeTab === 'users' ? '3px solid #28a745' : '3px solid transparent'
            }}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'admins' ? '#28a745' : 'transparent',
              color: activeTab === 'admins' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: activeTab === 'admins' ? 'bold' : 'normal',
              borderBottom: activeTab === 'admins' ? '3px solid #28a745' : '3px solid transparent'
            }}
          >
            Admins ({admins.length})
          </button>
          {currentUser && currentUser.role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('superAdmins')}
              className={`tab-button ${activeTab === 'superAdmins' ? 'active' : ''}`}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: activeTab === 'superAdmins' ? '#dc3545' : 'transparent',
                color: activeTab === 'superAdmins' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === 'superAdmins' ? 'bold' : 'normal',
                borderBottom: activeTab === 'superAdmins' ? '3px solid #dc3545' : '3px solid transparent'
              }}
            >
              Super Admins ({superAdmins.length})
            </button>
          )}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card">
            <h2>Students/Users</h2>
            {users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>{user.email}</td>
                      <td>{user.username || 'N/A'}</td>
                      <td>
                        <select
                          value={user.role || 'student'}
                          onChange={(e) => handleRoleChange(user._id, user.role, e.target.value)}
                          className="form-group select"
                          style={{ width: 'auto', margin: 0 }}
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                          {currentUser && currentUser.role === 'super_admin' && (
                            <option value="super_admin">Super Admin</option>
                          )}
                        </select>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button 
                          onClick={() => handleDelete(user._id, 'user')} 
                          className="btn btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div className="card">
            <h2>Administrators</h2>
            {admins.length === 0 ? (
              <p>No admins found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created At</th>
                    {currentUser && currentUser.role === 'super_admin' && (
                      <th>
                        <span style={{ marginRight: '8px' }}>Edit Role</span>
                        <span>Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin._id}>
                      <td>{admin.email}</td>
                      <td>{admin.username || 'N/A'}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#28a745', 
                          color: 'white', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {admin.role}
                        </span>
                      </td>
                      <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}</td>
                      {currentUser && currentUser.role === 'super_admin' && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={admin.role}
                              onChange={(e) => handleRoleChange(admin._id, admin.role, e.target.value)}
                              className="form-group select"
                              style={{ width: 'auto', margin: 0, padding: '4px 8px', fontSize: '12px' }}
                            >
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                            <button 
                              onClick={() => handleDelete(admin._id, 'admin')} 
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Super Admins Tab */}
        {activeTab === 'superAdmins' && currentUser && currentUser.role === 'super_admin' && (
          <div className="card">
            <h2>Super Administrators</h2>
            {superAdmins.length === 0 ? (
              <p>No super admins found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {superAdmins.map(superAdmin => (
                    <tr key={superAdmin._id}>
                      <td>{superAdmin.email}</td>
                      <td>{superAdmin.username || 'N/A'}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#dc3545', 
                          color: 'white', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {superAdmin.role}
                        </span>
                      </td>
                      <td>{superAdmin.createdAt ? new Date(superAdmin.createdAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersManagement;

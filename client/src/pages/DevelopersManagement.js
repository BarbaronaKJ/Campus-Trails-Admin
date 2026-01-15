import React, { useState, useEffect } from 'react';
import { developersAPI } from '../services/api';

function DevelopersManagement() {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', photo: '', role: 'Developer', order: 0 });

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const fetchDevelopers = async () => {
    try {
      const res = await developersAPI.getAll();
      setDevelopers(res.data.developers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (formData._id) {
        await developersAPI.update(formData._id, formData);
      } else {
        await developersAPI.create(formData);
      }
      setShowModal(false);
      fetchDevelopers();
    } catch (error) {
      alert('Error saving developer');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await developersAPI.delete(id);
      fetchDevelopers();
      alert('Developer deleted successfully');
    } catch (error) {
      console.error('Error deleting developer:', error);
      alert('Error deleting developer. Please try again.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container">
      <h1>Developers Management</h1>
      <button onClick={() => { 
        // Set order to next available number
        const maxOrder = developers.length > 0 ? Math.max(...developers.map(d => d.order || 0)) : 0;
        setFormData({ name: '', email: '', photo: '', role: 'Developer', order: maxOrder + 1 }); 
        setShowModal(true); 
      }} className="btn btn-primary">Create</button>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {developers.map(d => (
              <tr key={d._id}>
                <td>{d.order || 0}</td>
                <td>{d.name}</td>
                <td>{d.email}</td>
                <td>{d.role}</td>
                <td>
                  <button 
                    onClick={() => { setFormData(d); setShowModal(true); }} 
                    className="btn btn-secondary"
                    style={{ marginRight: '5px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(d._id, d.name)} 
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{formData._id ? 'Edit' : 'Create'} Developer</h2>
            <input placeholder="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <input placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <input placeholder="Photo URL" value={formData.photo} onChange={e => setFormData({ ...formData, photo: e.target.value })} />
            <input placeholder="Role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} />
            <input 
              type="number" 
              placeholder="Order (display order: 1, 2, 3...)" 
              value={formData.order || 0} 
              onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} 
            />
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
              Lower numbers appear first. Set order: 1=Kenth, 2=Cyle, 3=Rafael, 4=Christian, 5=Gwynnever
            </small>
            <button onClick={handleSave} className="btn btn-primary">Save</button>
            <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DevelopersManagement;

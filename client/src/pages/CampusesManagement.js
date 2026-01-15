import React, { useState, useEffect } from 'react';
import { campusesAPI } from '../services/api';

function CampusesManagement() {
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', mapImageUrl: '' });

  useEffect(() => {
    fetchCampuses();
  }, []);

  const fetchCampuses = async () => {
    try {
      const res = await campusesAPI.getAll();
      setCampuses(res.data.campuses);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (formData._id) {
        await campusesAPI.update(formData._id, formData);
      } else {
        await campusesAPI.create(formData);
      }
      setShowModal(false);
      fetchCampuses();
    } catch (error) {
      alert('Error saving campus');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await campusesAPI.delete(id);
      fetchCampuses();
      alert('Campus deleted successfully');
    } catch (error) {
      console.error('Error deleting campus:', error);
      alert('Error deleting campus. Please try again.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container">
      <h1>Campuses Management</h1>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Campuses List</h2>
          <button onClick={() => { setFormData({ name: '', mapImageUrl: '' }); setShowModal(true); }} className="btn btn-primary">Create Campus</button>
        </div>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Map Image</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {campuses.map(c => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.mapImageUrl ? 'Yes' : 'No'}</td>
                <td>
                  <button 
                    onClick={() => { setFormData(c); setShowModal(true); }} 
                    className="btn btn-secondary"
                    style={{ marginRight: '5px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(c._id, c.name)} 
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
            <h2>{formData._id ? 'Edit' : 'Create'} Campus</h2>
            <input placeholder="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <input placeholder="Map Image URL" value={formData.mapImageUrl} onChange={e => setFormData({ ...formData, mapImageUrl: e.target.value })} />
            <button onClick={handleSave} className="btn btn-primary">Save</button>
            <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampusesManagement;

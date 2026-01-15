import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';
import { campusesAPI } from '../services/api';
import './FloorPlans.css';

function FloorPlans() {
  const [pins, setPins] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedPin, setSelectedPin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingFloor, setAddingFloor] = useState(null); // { pinId }
  const [editingFloor, setEditingFloor] = useState(null); // { pinId, floorIndex }
  const [addingRoom, setAddingRoom] = useState(null); // { pinId, floorIndex }
  const [editingRoom, setEditingRoom] = useState(null); // { pinId, floorIndex, roomIndex }

  useEffect(() => {
    fetchData();
  }, [selectedCampus, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');

      if (!token) {
        setError('Please log in to access this page.');
        setLoading(false);
        return;
      }

      const [pinsResponse, campusesResponse] = await Promise.all([
        fetch(`${baseUrl}/api/admin/pins?limit=1000&includeInvisible=false`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        campusesAPI.getAll()
      ]);

      if (!pinsResponse.ok) {
        throw new Error('Failed to fetch pins');
      }

      const pinsData = await pinsResponse.json();
      let allPins = pinsData.pins || pinsData.data || [];
      
      // Filter by campus if selected
      if (selectedCampus !== 'all') {
        allPins = allPins.filter(pin => 
          pin.campusId?._id === selectedCampus || 
          pin.campusId === selectedCampus ||
          (typeof pin.campusId === 'object' && pin.campusId._id === selectedCampus)
        );
      }

      // Filter by search query
      if (searchQuery) {
        allPins = allPins.filter(pin =>
          pin.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pin.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setPins(allPins);

      const campusesData = campusesResponse.data?.campuses || campusesResponse.data || [];
      setCampuses(campusesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewFloor = (pinId, floorData) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin) return;

    const newFloor = {
      level: floorData.level !== undefined ? parseInt(floorData.level) : (pin.floors?.length || 0),
      floorPlan: floorData.floorPlan || '',
      rooms: []
    };

    const updatedFloors = [...(pin.floors || []), newFloor].sort((a, b) => a.level - b.level);
    setAddingFloor(null);
    updatePinFloors(pinId, updatedFloors);
  };

  const handleUpdateFloor = (pinId, floorIndex, updatedFloor) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin) return;

    const updatedFloors = [...(pin.floors || [])];
    updatedFloors[floorIndex] = { ...updatedFloors[floorIndex], ...updatedFloor };
    const sorted = updatedFloors.sort((a, b) => a.level - b.level);
    updatePinFloors(pinId, sorted);
  };

  const handleDeleteFloor = (pinId, floorIndex) => {
    if (!window.confirm('Are you sure you want to delete this floor? All rooms in this floor will also be deleted.')) {
      return;
    }

    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin) return;

    const updatedFloors = [...(pin.floors || [])];
    updatedFloors.splice(floorIndex, 1);
    updatePinFloors(pinId, updatedFloors);
  };

  const handleAddRoom = (pinId, floorIndex) => {
    setAddingRoom({ pinId, floorIndex });
  };

  const handleSaveNewRoom = (pinId, floorIndex, roomData) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex]) return;

    if (!roomData.name || !roomData.name.trim()) {
      alert('Room name is required');
      return;
    }

    const updatedFloors = [...pin.floors];
    updatedFloors[floorIndex] = {
      ...updatedFloors[floorIndex],
      rooms: [...(updatedFloors[floorIndex].rooms || []), {
        name: roomData.name.trim(),
        description: roomData.description || ''
      }]
    };

    setAddingRoom(null);
    updatePinFloors(pinId, updatedFloors);
  };

  const handleUpdateRoom = (pinId, floorIndex, roomIndex, updatedRoom) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex]) return;

    const updatedFloors = [...pin.floors];
    const updatedRooms = [...(updatedFloors[floorIndex].rooms || [])];
    // Remove image field if it exists in updatedRoom, keep only name and description
    const { image, ...roomUpdate } = updatedRoom;
    updatedRooms[roomIndex] = { ...updatedRooms[roomIndex], ...roomUpdate };
    // Ensure image is removed from the room
    delete updatedRooms[roomIndex].image;
    updatedFloors[floorIndex] = {
      ...updatedFloors[floorIndex],
      rooms: updatedRooms
    };

    updatePinFloors(pinId, updatedFloors);
  };

  const handleDeleteRoom = (pinId, floorIndex, roomIndex) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex]) return;

    const updatedFloors = [...pin.floors];
    const updatedRooms = [...(updatedFloors[floorIndex].rooms || [])];
    updatedRooms.splice(roomIndex, 1);
    updatedFloors[floorIndex] = {
      ...updatedFloors[floorIndex],
      rooms: updatedRooms
    };

    updatePinFloors(pinId, updatedFloors);
  };

  const updatePinFloors = async (pinId, floors) => {
    try {
      setError('');
      setSuccess('');
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`${baseUrl}/api/admin/pins/${pinId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ floors })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update pin');
      }

      setSuccess('Floor/room details updated successfully!');
      setEditingFloor(null);
      setEditingRoom(null);
      await fetchData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating pin:', err);
      setError(err.message || 'Failed to update pin');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getFloorName = (level) => {
    if (level === 0) return 'Ground Floor';
    const floorNumber = level + 1;
    const lastDigit = floorNumber % 10;
    const lastTwoDigits = floorNumber % 100;
    let suffix = 'th';
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      suffix = 'th';
    } else if (lastDigit === 1) {
      suffix = 'st';
    } else if (lastDigit === 2) {
      suffix = 'nd';
    } else if (lastDigit === 3) {
      suffix = 'rd';
    }
    return `${floorNumber}${suffix} Floor`;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading floor plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Floor Plans Management</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
            <label>Campus</label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="form-group select"
            >
              <option value="all">All Campuses</option>
              {campuses.map(campus => (
                <option key={campus._id} value={campus._id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
            <label>Search Pins</label>
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-group input"
            />
          </div>
        </div>
      </div>

      {/* Pins List */}
      <div className="card">
        <h2>Visible Pins ({pins.length})</h2>
        {pins.length === 0 ? (
          <p>No visible pins found.</p>
        ) : (
          <div className="pins-list">
            {pins.map(pin => {
              const pinId = pin._id || pin.id;
              const floors = (pin.floors || []).sort((a, b) => a.level - b.level);
              const isSelected = selectedPin === pinId;
              
              return (
                <div key={pinId} className="pin-card">
                  <div className="pin-header">
                    <div style={{ flex: 1 }}>
                      <h3>{pin.title}</h3>
                      <p className="pin-description">{pin.description}</p>
                      <p className="pin-meta">
                        Campus: {pin.campusId?.name || 'Unknown'} | 
                        Floors: {floors.length} | 
                        Total Rooms: {floors.reduce((sum, floor) => sum + (floor.rooms?.length || 0), 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPin(isSelected ? null : pinId);
                        setAddingFloor(null);
                        setEditingFloor(null);
                        setAddingRoom(null);
                        setEditingRoom(null);
                      }}
                      className="btn btn-primary"
                    >
                      {isSelected ? '▼ Hide Floors' : '▶ Manage Floors'}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="floors-section">
                      {/* Add Floor Section - Always Visible When Selected */}
                      {addingFloor === pinId ? (
                        <div className="add-floor-form">
                          <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}>➕ Add New Floor</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group">
                              <label>Floor Level *</label>
                              <input
                                type="number"
                                placeholder="0 for Ground Floor"
                                className="form-group input"
                                id={`new-floor-level-${pinId}`}
                                defaultValue={floors.length}
                              />
                              <small style={{ color: '#666', fontSize: '12px' }}>
                                0 = Ground Floor, 1 = 2nd Floor, etc.
                              </small>
                            </div>
                            <div className="form-group">
                              <label>Floor Plan Image URL</label>
                              <input
                                type="text"
                                placeholder="https://res.cloudinary.com/..."
                                className="form-group input"
                                id={`new-floor-plan-${pinId}`}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => {
                                const levelInput = document.getElementById(`new-floor-level-${pinId}`);
                                const planInput = document.getElementById(`new-floor-plan-${pinId}`);
                                
                                handleSaveNewFloor(pinId, {
                                  level: levelInput.value !== '' ? parseInt(levelInput.value) : floors.length,
                                  floorPlan: planInput.value
                                });
                                
                                levelInput.value = '';
                                planInput.value = '';
                              }}
                              className="btn btn-success"
                            >
                              ✓ Add Floor
                            </button>
                            <button
                              onClick={() => setAddingFloor(null)}
                              className="btn btn-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="add-floor-button-container">
                          <button
                            onClick={() => {
                              setAddingFloor(pinId);
                              setEditingFloor(null);
                              setAddingRoom(null);
                              setEditingRoom(null);
                            }}
                            className="btn btn-success btn-large"
                            style={{ 
                              width: '100%', 
                              padding: '15px',
                              fontSize: '16px',
                              fontWeight: '600'
                            }}
                          >
                            ➕ Add New Floor
                          </button>
                        </div>
                      )}

                      {/* Floors List */}
                      {floors.length === 0 ? (
                        <div className="no-floors-message">
                          <p>No floors added yet. Click "Add New Floor" above to get started.</p>
                        </div>
                      ) : (
                        <div className="floors-list">
                          {floors.map((floor, floorIndex) => {
                            const isEditing = editingFloor?.pinId === pinId && editingFloor?.floorIndex === floorIndex;
                            const roomCount = floor.rooms?.length || 0;
                            
                            return (
                              <div key={floorIndex} className="floor-card">
                                <div className="floor-card-header">
                                  <div className="floor-title-section">
                                    <div className="floor-number-badge">
                                      {getFloorName(floor.level)}
                                    </div>
                                    <div className="floor-info">
                                      <span className="floor-plan-status">
                                        {floor.floorPlan ? '📐 Has Floor Plan' : '📐 No Floor Plan'}
                                      </span>
                                      <span className="room-count-badge">
                                        {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="floor-actions">
                                    <button
                                      onClick={() => {
                                        if (isEditing) {
                                          setEditingFloor(null);
                                        } else {
                                          setEditingFloor({ pinId, floorIndex });
                                          setAddingRoom(null);
                                          setEditingRoom(null);
                                        }
                                      }}
                                      className="btn btn-secondary"
                                    >
                                      {isEditing ? 'Cancel' : '⚙️ Edit Floor'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFloor(pinId, floorIndex)}
                                      className="btn btn-danger"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="floor-edit-form">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                                      <div className="form-group">
                                        <label>Floor Level</label>
                                        <input
                                          type="number"
                                          value={floor.level}
                                          onChange={(e) => handleUpdateFloor(pinId, floorIndex, { level: parseInt(e.target.value) || 0 })}
                                          className="form-group input"
                                        />
                                      </div>
                                      <div className="form-group">
                                        <label>Floor Plan Image URL</label>
                                        <input
                                          type="text"
                                          value={floor.floorPlan || ''}
                                          onChange={(e) => handleUpdateFloor(pinId, floorIndex, { floorPlan: e.target.value })}
                                          placeholder="https://..."
                                          className="form-group input"
                                        />
                                      </div>
                                    </div>
                                    {floor.floorPlan && (
                                      <div style={{ marginTop: '15px' }}>
                                        <img
                                          src={floor.floorPlan}
                                          alt={`Floor ${floor.level} plan`}
                                          className="floor-plan-preview"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      </div>
                                    )}
                                    <div style={{ marginTop: '15px' }}>
                                      <button
                                        onClick={() => setEditingFloor(null)}
                                        className="btn btn-primary"
                                      >
                                        ✓ Done
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {floor.floorPlan && (
                                      <div className="floor-plan-display">
                                        <img
                                          src={floor.floorPlan}
                                          alt={`Floor ${floor.level} plan`}
                                          className="floor-plan-image"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Rooms Section */}
                                    <div className="rooms-section">
                                      <div className="rooms-header">
                                        <h6>Rooms on {getFloorName(floor.level)}</h6>
                                        {addingRoom?.pinId === pinId && addingRoom?.floorIndex === floorIndex ? (
                                          <button
                                            onClick={() => setAddingRoom(null)}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '12px' }}
                                          >
                                            Cancel
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setAddingRoom({ pinId, floorIndex });
                                              setEditingRoom(null);
                                            }}
                                            className="btn btn-success"
                                            style={{ fontSize: '12px' }}
                                          >
                                            ➕ Add Room
                                          </button>
                                        )}
                                      </div>

                                      {/* Add Room Form */}
                                      {addingRoom?.pinId === pinId && addingRoom?.floorIndex === floorIndex && (
                                        <div className="room-add-form">
                                          <div className="form-group">
                                            <label>Room Name *</label>
                                            <input
                                              type="text"
                                              placeholder="e.g., Room 101, Lab A, Office 1"
                                              className="form-group input"
                                              id={`new-room-name-${pinId}-${floorIndex}`}
                                            />
                                          </div>
                                          <div className="form-group">
                                            <label>Description</label>
                                            <textarea
                                              placeholder="Room description, features, capacity..."
                                              className="form-group textarea"
                                              rows="3"
                                              id={`new-room-desc-${pinId}-${floorIndex}`}
                                            />
                                          </div>
                                          <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                              onClick={() => {
                                                const nameInput = document.getElementById(`new-room-name-${pinId}-${floorIndex}`);
                                                const descInput = document.getElementById(`new-room-desc-${pinId}-${floorIndex}`);
                                                
                                                handleSaveNewRoom(pinId, floorIndex, {
                                                  name: nameInput.value,
                                                  description: descInput.value
                                                });
                                                
                                                nameInput.value = '';
                                                descInput.value = '';
                                              }}
                                              className="btn btn-primary"
                                            >
                                              ✓ Save Room
                                            </button>
                                            <button
                                              onClick={() => setAddingRoom(null)}
                                              className="btn btn-secondary"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Rooms List */}
                                      {floor.rooms && floor.rooms.length > 0 ? (
                                        <div className="rooms-list">
                                          {floor.rooms.map((room, roomIndex) => {
                                            const isEditingRoom = editingRoom?.pinId === pinId && 
                                                                 editingRoom?.floorIndex === floorIndex && 
                                                                 editingRoom?.roomIndex === roomIndex;
                                            
                                            return (
                                              <div key={roomIndex} className="room-card">
                                                {isEditingRoom ? (
                                                  <div className="room-edit-form">
                                                    <h6 style={{ margin: '0 0 15px 0', color: '#007bff' }}>Edit Room</h6>
                                                    <div className="form-group">
                                                      <label>Room Name *</label>
                                                      <input
                                                        type="text"
                                                        value={room.name}
                                                        onChange={(e) => handleUpdateRoom(pinId, floorIndex, roomIndex, { name: e.target.value })}
                                                        className="form-group input"
                                                        required
                                                      />
                                                    </div>
                                                    <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                        value={room.description || ''}
                                                        onChange={(e) => handleUpdateRoom(pinId, floorIndex, roomIndex, { description: e.target.value })}
                                                        className="form-group textarea"
                                                        rows="4"
                                                        placeholder="Room description, features, capacity..."
                                                      />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                      <button
                                                        onClick={() => setEditingRoom(null)}
                                                        className="btn btn-primary"
                                                      >
                                                        ✓ Save Changes
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          if (window.confirm('Delete this room?')) {
                                                            handleDeleteRoom(pinId, floorIndex, roomIndex);
                                                            setEditingRoom(null);
                                                          }
                                                        }}
                                                        className="btn btn-danger"
                                                      >
                                                        Delete
                                                      </button>
                                                      <button
                                                        onClick={() => setEditingRoom(null)}
                                                        className="btn btn-secondary"
                                                      >
                                                        Cancel
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="room-display-card">
                                                    <div className="room-display-content">
                                                      <div className="room-info" style={{ width: '100%' }}>
                                                        <h6>{room.name}</h6>
                                                        {room.description && (
                                                          <p>{room.description}</p>
                                                        )}
                                                        {!room.description && (
                                                          <p style={{ color: '#999', fontStyle: 'italic', fontSize: '12px' }}>
                                                            No description
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="room-actions">
                                                      <button
                                                        onClick={() => setEditingRoom({ pinId, floorIndex, roomIndex })}
                                                        className="btn btn-primary"
                                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                                      >
                                                        Edit
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteRoom(pinId, floorIndex, roomIndex)}
                                                        className="btn btn-danger"
                                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                                      >
                                                        Delete
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        !addingRoom && (
                                          <p className="no-rooms">No rooms on this floor. Click "+ Add Room" to add one.</p>
                                        )
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FloorPlans;

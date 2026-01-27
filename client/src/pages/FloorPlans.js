import React, { useState, useEffect, useCallback } from 'react';
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
  const [searchInput, setSearchInput] = useState(''); // Separate state for input field
  const [addingFloor, setAddingFloor] = useState(null); // { pinId }
  const [editingFloor, setEditingFloor] = useState(null); // { pinId, floorIndex }
  const [editingFloorData, setEditingFloorData] = useState(null); // Local state for floor being edited
  const [addingRoom, setAddingRoom] = useState(null); // { pinId, floorIndex }
  const [editingRoom, setEditingRoom] = useState(null); // { pinId, floorIndex, roomIndex }
  const [editingRoomData, setEditingRoomData] = useState(null); // Local state for room being edited

  const fetchData = useCallback(async () => {
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
      
      // IMPORTANT: Filter out invisible waypoints (client-side backup)
      // Only show pins that are explicitly visible (isVisible === true)
      allPins = allPins.filter(pin => pin.isVisible === true);
      
      // Filter by campus if selected
      if (selectedCampus !== 'all') {
        allPins = allPins.filter(pin => 
          pin.campusId?._id === selectedCampus || 
          pin.campusId === selectedCampus ||
          (typeof pin.campusId === 'object' && pin.campusId._id === selectedCampus)
        );
      }

      // Filter by search query (only when searchQuery is set, not on every keystroke)
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
  }, [selectedCampus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    // Update local editing state immediately for UI responsiveness
    setEditingFloorData({ ...editingFloorData, ...updatedFloor });
    
    // Also update the pin in local state for immediate UI feedback
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin) return;

    const updatedFloors = [...(pin.floors || [])];
    updatedFloors[floorIndex] = { ...updatedFloors[floorIndex], ...updatedFloor };
    const sorted = updatedFloors.sort((a, b) => a.level - b.level);
    
    // Update local state immediately
    setPins(pins.map(p => (p._id || p.id) === pinId ? { ...p, floors: sorted } : p));
    
    // Save to backend (this will also refresh data after save)
    updatePinFloors(pinId, sorted);
  };

  const handleSaveFloor = (pinId, floorIndex) => {
    // Since handleUpdateFloor now saves immediately, this function just ensures final save and closes edit mode
    if (editingFloorData) {
      const pin = pins.find(p => (p._id || p.id) === pinId);
      if (pin) {
        const updatedFloors = [...(pin.floors || [])];
        updatedFloors[floorIndex] = { ...updatedFloors[floorIndex], ...editingFloorData };
        const sorted = updatedFloors.sort((a, b) => a.level - b.level);
        updatePinFloors(pinId, sorted);
      }
    }
    setEditingFloorData(null);
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

  // Removed unused handleAddRoom function - using setAddingRoom directly

  const handleSaveNewRoom = (pinId, floorIndex, roomData) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex]) return;

    if (!roomData.name || !roomData.name.trim()) {
      alert('Room name is required');
      return;
    }

    const updatedFloors = [...pin.floors];
    const existingRooms = [...(updatedFloors[floorIndex].rooms || [])];
    
    // Determine the desired order (use provided order or calculate next available)
    let desiredOrder = roomData.order !== undefined ? roomData.order : undefined;
    if (desiredOrder === undefined) {
      const maxOrder = existingRooms.length > 0 
        ? Math.max(...existingRooms.map(r => (r.order !== undefined && r.order !== null) ? r.order : -1))
        : -1;
      desiredOrder = maxOrder + 1;
    }

    // If the desired order conflicts with an existing room, adjust other rooms
    // Find rooms with order >= desiredOrder and increment their order by 1
    const adjustedRooms = existingRooms.map(room => {
      if (room.order !== undefined && room.order !== null && room.order >= desiredOrder) {
        return { ...room, order: room.order + 1 };
      }
      return room;
    });

    updatedFloors[floorIndex] = {
      ...updatedFloors[floorIndex],
      rooms: [...adjustedRooms, {
        name: roomData.name.trim(),
        description: roomData.description || '',
        order: desiredOrder,
        qrCode: roomData.qrCode || null,
        besideRooms: roomData.besideRooms || [],
        image: roomData.image || null
      }]
    };

    setAddingRoom(null);
    updatePinFloors(pinId, updatedFloors);
  };

  const handleUpdateRoom = (pinId, floorIndex, roomIndex, updatedRoom) => {
    // Update local editing state immediately for UI responsiveness
    const currentEditingData = editingRoomData || {};
    setEditingRoomData({ ...currentEditingData, ...updatedRoom });
    
    // Also update the pin in local state for immediate UI feedback
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex]) return;

    const updatedFloors = [...pin.floors];
    const updatedRooms = [...(updatedFloors[floorIndex].rooms || [])];
    const existingRoom = updatedRooms[roomIndex] || {};
    
    // Merge changes with existing room data
    const finalRoomData = {
      ...existingRoom,
      ...updatedRoom,
      name: updatedRoom.name !== undefined ? updatedRoom.name : existingRoom.name,
      description: updatedRoom.description !== undefined ? updatedRoom.description : (existingRoom.description || ''),
      order: updatedRoom.order !== undefined ? updatedRoom.order : (existingRoom.order !== undefined ? existingRoom.order : roomIndex),
      qrCode: updatedRoom.qrCode !== undefined ? updatedRoom.qrCode : (existingRoom.qrCode || null),
      besideRooms: updatedRoom.besideRooms !== undefined ? updatedRoom.besideRooms : (existingRoom.besideRooms || []),
      image: updatedRoom.image !== undefined ? updatedRoom.image : (existingRoom.image || null)
    };
    
    updatedRooms[roomIndex] = finalRoomData;
    updatedFloors[floorIndex] = {
      ...updatedFloors[floorIndex],
      rooms: updatedRooms
    };

    // Update local state immediately
    setPins(pins.map(p => (p._id || p.id) === pinId ? { ...p, floors: updatedFloors } : p));
    
    // Save to backend (this will also refresh data after save)
    updatePinFloors(pinId, updatedFloors);
  };

  const handleSaveRoom = (pinId, floorIndex, roomIndex) => {
    // Since handleUpdateRoom now saves immediately, this function just ensures final save and closes edit mode
    if (editingRoomData) {
      // Final save with any remaining changes
      const pin = pins.find(p => (p._id || p.id) === pinId);
      if (pin && pin.floors && pin.floors[floorIndex]) {
        const updatedFloors = [...pin.floors];
        const updatedRooms = [...(updatedFloors[floorIndex].rooms || [])];
        const existingRoom = updatedRooms[roomIndex] || {};
        
        const finalRoomData = {
          ...existingRoom,
          ...editingRoomData,
          name: editingRoomData.name !== undefined ? editingRoomData.name : existingRoom.name,
          description: editingRoomData.description !== undefined ? editingRoomData.description : (existingRoom.description || ''),
          order: editingRoomData.order !== undefined ? editingRoomData.order : (existingRoom.order !== undefined ? existingRoom.order : roomIndex),
          qrCode: editingRoomData.qrCode !== undefined ? editingRoomData.qrCode : (existingRoom.qrCode || null),
          besideRooms: editingRoomData.besideRooms !== undefined ? editingRoomData.besideRooms : (existingRoom.besideRooms || []),
          image: editingRoomData.image !== undefined ? editingRoomData.image : (existingRoom.image || null)
        };
        
        updatedRooms[roomIndex] = finalRoomData;
        updatedFloors[floorIndex] = {
          ...updatedFloors[floorIndex],
          rooms: updatedRooms
        };
        
        updatePinFloors(pinId, updatedFloors);
      }
    }
    setEditingRoomData(null);
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

  const handleReorderFloors = (pinId, sourceIndex, destinationIndex) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors) return;

    const updatedFloors = [...pin.floors];
    
    // Remove from source and insert at destination
    const [movedFloor] = updatedFloors.splice(sourceIndex, 1);
    updatedFloors.splice(destinationIndex, 0, movedFloor);
    
    // Update floor levels to match new order (optional - you might want to keep original levels)
    // For now, we'll keep the original levels but reorder the array
    
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                  }
                }}
                className="form-group input"
                style={{ flex: 1 }}
              />
              <button
                onClick={() => setSearchQuery(searchInput)}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Search
              </button>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Clear
                </button>
              )}
            </div>
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
                              <div 
                                key={floorIndex} 
                                className="floor-card"
                              >
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
                                          setEditingFloorData(null);
                                        } else {
                                          setEditingFloor({ pinId, floorIndex });
                                          setEditingFloorData({ ...floor }); // Initialize with current floor data
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
                                          value={editingFloorData?.level !== undefined ? editingFloorData.level : floor.level}
                                          onChange={(e) => handleUpdateFloor(pinId, floorIndex, { level: parseInt(e.target.value) || 0 })}
                                          className="form-group input"
                                        />
                                      </div>
                                      <div className="form-group">
                                        <label>Floor Plan Image URL</label>
                                        <input
                                          type="text"
                                          value={editingFloorData?.floorPlan !== undefined ? editingFloorData.floorPlan : (floor.floorPlan || '')}
                                          onChange={(e) => handleUpdateFloor(pinId, floorIndex, { floorPlan: e.target.value })}
                                          placeholder="https://..."
                                          className="form-group input"
                                        />
                                      </div>
                                    </div>
                                    {(editingFloorData?.floorPlan || floor.floorPlan) && (
                                      <div style={{ marginTop: '15px' }}>
                                        <img
                                          src={editingFloorData?.floorPlan || floor.floorPlan}
                                          alt={`Floor ${editingFloorData?.level !== undefined ? editingFloorData.level : floor.level} plan`}
                                          className="floor-plan-preview"
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                      </div>
                                    )}
                                    <div style={{ marginTop: '15px' }}>
                                      <button
                                        onClick={() => {
                                          handleSaveFloor(pinId, floorIndex);
                                          setEditingFloor(null);
                                        }}
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
                                          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px' }}>
                                            <div className="form-group">
                                              <label>Order *</label>
                                              <input
                                                type="number"
                                                placeholder="1, 2, 3..."
                                                className="form-group input"
                                                id={`new-room-order-${pinId}-${floorIndex}`}
                                                min="0"
                                              />
                                              <small style={{ color: '#666', fontSize: '11px' }}>
                                                Display order (1, 2, 3...)
                                              </small>
                                            </div>
                                            <div className="form-group">
                                              <label>Room Name *</label>
                                              <input
                                                type="text"
                                                placeholder="e.g., Room 101, Lab A, Office 1"
                                                className="form-group input"
                                                id={`new-room-name-${pinId}-${floorIndex}`}
                                              />
                                            </div>
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
                                                const orderInput = document.getElementById(`new-room-order-${pinId}-${floorIndex}`);
                                                
                                                handleSaveNewRoom(pinId, floorIndex, {
                                                  name: nameInput.value,
                                                  description: descInput.value,
                                                  order: orderInput.value ? parseInt(orderInput.value) : undefined
                                                });
                                                
                                                nameInput.value = '';
                                                descInput.value = '';
                                                orderInput.value = '';
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
                                          {/* Sort rooms by order (ascending), then by name if order is same or both undefined */}
                                          {[...(floor.rooms || [])].sort((a, b) => {
                                            // Get order values, use Infinity for undefined (pushes to end) or use a very large number
                                            const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : Infinity;
                                            const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : Infinity;
                                            
                                            // First sort by order
                                            if (orderA !== orderB) {
                                              return orderA - orderB;
                                            }
                                            
                                            // If order is the same (or both are undefined), sort by name
                                            return (a.name || '').localeCompare(b.name || '');
                                          }).map((room, sortedIndex) => {
                                            // Find the original index in the unsorted array
                                            const originalIndex = floor.rooms.findIndex(r => r === room);
                                            // Display order based on position in sorted array (1-based)
                                            const displayOrder = sortedIndex + 1;
                                            const isEditingRoom = editingRoom?.pinId === pinId && 
                                                                 editingRoom?.floorIndex === floorIndex && 
                                                                 editingRoom?.roomIndex === originalIndex;
                                            
                                            return (
                                              <div 
                                                key={`${sortedIndex}-${originalIndex}`} 
                                                className="room-card"
                                              >
                                                {isEditingRoom ? (
                                                  <div className="room-edit-form">
                                                    <h6 style={{ margin: '0 0 15px 0', color: '#007bff' }}>Edit Room</h6>
                                                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px' }}>
                                                      <div className="form-group">
                                                        <label>Order *</label>
                                                        <input
                                                          type="number"
                                                          value={editingRoomData?.order !== undefined && editingRoomData.order !== null ? editingRoomData.order : (room.order !== undefined && room.order !== null ? room.order : '')}
                                                          onChange={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const value = e.target.value;
                                                            const orderValue = value === '' ? undefined : (value === '-' ? undefined : parseInt(value, 10));
                                                            if (!isNaN(orderValue) || orderValue === undefined) {
                                                              handleUpdateRoom(pinId, floorIndex, originalIndex, { order: orderValue });
                                                            }
                                                          }}
                                                          onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                              e.preventDefault();
                                                              e.stopPropagation();
                                                            }
                                                          }}
                                                          className="form-group input"
                                                          min="0"
                                                          required
                                                        />
                                                        <small style={{ color: '#666', fontSize: '11px' }}>
                                                          Display order (1, 2, 3...)
                                                        </small>
                                                      </div>
                                                      <div className="form-group">
                                                        <label>Room Name *</label>
                                                        <input
                                                          type="text"
                                                          value={editingRoomData?.name !== undefined ? editingRoomData.name : room.name}
                                                          onChange={(e) => handleUpdateRoom(pinId, floorIndex, originalIndex, { name: e.target.value })}
                                                          className="form-group input"
                                                          required
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                        value={editingRoomData?.description !== undefined ? editingRoomData.description : (room.description || '')}
                                                        onChange={(e) => handleUpdateRoom(pinId, floorIndex, originalIndex, { description: e.target.value })}
                                                        className="form-group textarea"
                                                        rows="4"
                                                        placeholder="Room description, features, capacity..."
                                                      />
                                                    </div>
                                                    {/* Beside Rooms Selection (for Elevator/Stairs) */}
                                                    <div className="form-group">
                                                      <label>Rooms Beside This (for Elevator/Stairs)</label>
                                                      <div style={{ 
                                                        border: '1px solid #ddd', 
                                                        borderRadius: '5px', 
                                                        padding: '12px 10px', 
                                                        backgroundColor: '#f9f9f9',
                                                        maxHeight: '150px',
                                                        overflowY: 'auto'
                                                      }}>
                                                        {floor.rooms && floor.rooms.length > 0 ? (
                                                          floor.rooms
                                                            .filter(r => r.name !== room.name) // Exclude current room
                                                            .map((otherRoom, idx) => {
                                                              const currentBesideRooms = Array.isArray(editingRoomData?.besideRooms) 
                                                                ? editingRoomData.besideRooms 
                                                                : (Array.isArray(room.besideRooms) ? room.besideRooms : []);
                                                              const isSelected = currentBesideRooms.includes(otherRoom.name || otherRoom._id);
                                                              
                                                              return (
                                                                <label 
                                                                  key={idx} 
                                                                  style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    marginBottom: idx === floor.rooms.filter(r => r.name !== room.name).length - 1 ? '0' : '8px',
                                                                    cursor: 'pointer',
                                                                    lineHeight: '1.5',
                                                                    minHeight: '24px'
                                                                  }}
                                                                >
                                                                  <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                      const updatedBesideRooms = e.target.checked
                                                                        ? [...currentBesideRooms, otherRoom.name || otherRoom._id]
                                                                        : currentBesideRooms.filter(id => id !== (otherRoom.name || otherRoom._id));
                                                                      handleUpdateRoom(pinId, floorIndex, originalIndex, { besideRooms: updatedBesideRooms });
                                                                    }}
                                                                    style={{ 
                                                                      marginRight: '10px',
                                                                      cursor: 'pointer',
                                                                      flexShrink: 0,
                                                                      width: '18px',
                                                                      height: '18px'
                                                                    }}
                                                                  />
                                                                  <span style={{ 
                                                                    display: 'inline-block',
                                                                    verticalAlign: 'middle',
                                                                    lineHeight: '1.5'
                                                                  }}>
                                                                    {otherRoom.name} {otherRoom.description ? `- ${otherRoom.description}` : ''}
                                                                  </span>
                                                                </label>
                                                              );
                                                            })
                                                        ) : (
                                                          <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>
                                                            No other rooms on this floor
                                                          </p>
                                                        )}
                                                      </div>
                                                      <small style={{ color: '#666', fontSize: '11px' }}>
                                                        Select rooms that are beside this room (used for elevator/stairs route instructions)
                                                      </small>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          handleSaveRoom(pinId, floorIndex, originalIndex);
                                                          setEditingRoom(null);
                                                        }}
                                                        className="btn btn-primary"
                                                      >
                                                        ✓ Save Changes
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          if (window.confirm('Delete this room?')) {
                                                            handleDeleteRoom(pinId, floorIndex, originalIndex);
                                                            setEditingRoom(null);
                                                          }
                                                        }}
                                                        className="btn btn-danger"
                                                      >
                                                        Delete
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          setEditingRoom(null);
                                                          setEditingRoomData(null);
                                                        }}
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                          <span style={{
                                                            backgroundColor: '#007bff',
                                                            color: 'white',
                                                            borderRadius: '12px',
                                                            padding: '2px 8px',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            minWidth: '24px',
                                                            textAlign: 'center'
                                                          }}>
                                                            {displayOrder}
                                                          </span>
                                                          <h6 style={{ margin: 0, flex: 1 }}>{room.name}</h6>
                                                        </div>
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
                                                        onClick={() => {
                                                          setEditingRoom({ pinId, floorIndex, roomIndex: originalIndex });
                                                          setEditingRoomData({ ...room }); // Initialize with current room data
                                                          setEditingRoomData({ ...room }); // Initialize with current room data
                                                        }}
                                                        className="btn btn-primary"
                                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                                      >
                                                        Edit
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteRoom(pinId, floorIndex, originalIndex)}
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

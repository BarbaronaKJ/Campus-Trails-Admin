import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';
import { campusesAPI } from '../services/api';
import { matchesFlexible } from '../utils/fuzzySearch';
import './MapDataManager.css';

function ElevatorStairsManagement() {
  const [pins, setPins] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingElevatorStairs, setEditingElevatorStairs] = useState(null); // { pinId, floorIndex, roomIndex, type: 'elevator' | 'stairs' }

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
      
      allPins = allPins.filter(pin => pin.isVisible === true);
      
      if (selectedCampus !== 'all') {
        allPins = allPins.filter(pin => 
          pin.campusId?._id === selectedCampus || 
          pin.campusId === selectedCampus ||
          (typeof pin.campusId === 'object' && pin.campusId._id === selectedCampus)
        );
      }

      if (searchQuery.trim()) {
        allPins = allPins.filter(pin =>
          matchesFlexible(searchQuery, pin.title || '') ||
          matchesFlexible(searchQuery, pin.description || '')
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

  const updatePinFloors = async (pinId, updatedFloors) => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${baseUrl}/api/admin/pins/${pinId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ floors: updatedFloors })
      });

      if (!response.ok) {
        throw new Error('Failed to update floors');
      }

      setSuccess('Elevator/Stairs configuration updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await fetchData();
    } catch (err) {
      console.error('Error updating floors:', err);
      setError(err.message || 'Failed to update configuration');
      setTimeout(() => setError(''), 5000);
    }
  };

  const isElevatorOrStairs = (room) => {
    const roomName = (room.name || '').toUpperCase();
    const roomDesc = (room.description || '').toUpperCase();
    return {
      isElevator: roomName.includes('ELEVATOR') || roomName.startsWith('E ') || roomName === 'E' || roomDesc.includes('ELEVATOR'),
      isStairs: roomName.includes('STAIRS') || roomName.includes('STAIR') || roomName.startsWith('S ') || roomName === 'S' || roomDesc.includes('STAIRS') || roomDesc.includes('STAIR')
    };
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

  const handleEditBesideRooms = (pinId, floorIndex, roomIndex, type) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex] || !pin.floors[floorIndex].rooms) return;
    
    const room = pin.floors[floorIndex].rooms[roomIndex];
    setEditingElevatorStairs({ pinId, floorIndex, roomIndex, type, room, currentBesideRooms: room.besideRooms || [] });
    setSelectedPin(pin);
    setSelectedFloor(pin.floors[floorIndex]);
  };

  const handleSaveBesideRooms = (pinId, floorIndex, roomIndex, besideRooms) => {
    const pin = pins.find(p => (p._id || p.id) === pinId);
    if (!pin || !pin.floors || !pin.floors[floorIndex]) return;

    // Deep clone to ensure we're working with a fresh copy
    const updatedFloors = JSON.parse(JSON.stringify(pin.floors));
    const updatedRooms = [...updatedFloors[floorIndex].rooms];
    
    // Ensure we preserve all existing room properties when updating besideRooms
    const existingRoom = updatedRooms[roomIndex];
    updatedRooms[roomIndex] = {
      ...existingRoom,
      besideRooms: Array.isArray(besideRooms) ? [...besideRooms] : [] // Ensure it's a new array
    };
    
    updatedFloors[floorIndex] = {
      ...updatedFloors[floorIndex],
      rooms: updatedRooms
    };

    setEditingElevatorStairs(null);
    updatePinFloors(pinId, updatedFloors);
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  // Filter pins to only show those with elevators or stairs
  const pinsWithElevatorStairs = pins.filter(pin => {
    if (!pin.floors || !Array.isArray(pin.floors)) return false;
    return pin.floors.some(floor => {
      if (!floor.rooms || !Array.isArray(floor.rooms)) return false;
      return floor.rooms.some(room => {
        const { isElevator, isStairs } = isElevatorOrStairs(room);
        return isElevator || isStairs;
      });
    });
  });

  return (
    <div className="container">
      <h1>Elevator/Stairs Management</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Configure beside rooms for elevators and stairs to improve pathfinding instructions.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Search and Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="control-group">
          <label className="label">Search Buildings</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input"
              placeholder="Search by building name or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setSearchQuery(searchInput);
                }
              }}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => setSearchQuery(searchInput)}
              className="button button-primary"
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
                className="button button-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="control-group">
          <label className="label">Campus</label>
          <select
            className="input"
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          >
            <option value="all">All Campuses</option>
            {campuses.map(campus => (
              <option key={campus._id} value={campus._id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Buildings with Elevators/Stairs */}
      <div className="card">
        <h2>Buildings with Elevators/Stairs ({pinsWithElevatorStairs.length})</h2>
        
        {pinsWithElevatorStairs.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No buildings with elevators or stairs found{searchQuery && ` matching "${searchQuery}"`}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pinsWithElevatorStairs.map(pin => (
              <div key={pin._id || pin.id} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '20px',
                backgroundColor: '#f9f9f9'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
                  {pin.description || pin.title}
                </h3>
                
                {pin.floors && pin.floors.map((floor, floorIndex) => {
                  // Get all elevator/stairs rooms with their original indices
                  const elevatorStairsRooms = floor.rooms?.map((room, idx) => {
                    const { isElevator, isStairs } = isElevatorOrStairs(room);
                    if (isElevator || isStairs) {
                      return { room, originalIndex: idx, isElevator, isStairs };
                    }
                    return null;
                  }).filter(item => item !== null) || [];

                  if (elevatorStairsRooms.length === 0) return null;

                  return (
                    <div key={floorIndex} style={{ 
                      marginBottom: '20px',
                      padding: '15px',
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#666' }}>
                        {getFloorName(floor.level)}
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {elevatorStairsRooms.map((item, roomIndex) => {
                          const { room, originalIndex, isElevator, isStairs } = item;
                          
                          return (
                            <div key={`${floorIndex}-${originalIndex}-${roomIndex}`} style={{
                              padding: '12px',
                              backgroundColor: isElevator ? '#e3f2fd' : '#fff3e0',
                              borderRadius: '6px',
                              border: `1px solid ${isElevator ? '#2196f3' : '#ff9800'}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div>
                                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: isElevator ? '#1976d2' : '#f57c00' }}>
                                    {isElevator ? 'ELEVATOR' : 'STAIRS'}
                                  </span>
                                  {room.description && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                                      {room.description}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleEditBesideRooms(pin._id || pin.id, floorIndex, originalIndex, isElevator ? 'elevator' : 'stairs')}
                                  className="button button-primary button-small"
                                >
                                  Configure Beside Rooms
                                </button>
                              </div>
                              
                              {room.besideRooms && Array.isArray(room.besideRooms) && room.besideRooms.length > 0 ? (
                                <div style={{ marginTop: '10px' }}>
                                  <span style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                                    Currently beside:
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {room.besideRooms.map((besideRoomName, idx) => {
                                      // Match by room.name first (primary identifier like "9-E1", "9-S1")
                                      const besideRoom = floor.rooms?.find(r => {
                                        const rName = String(r.name || '').trim();
                                        const rId = String(r.id || '').trim();
                                        const searchId = String(besideRoomName || '').trim();
                                        return rName === searchId || 
                                               rName.toLowerCase() === searchId.toLowerCase() ||
                                               rId === searchId;
                                      });
                                      const displayName = besideRoom 
                                        ? (besideRoom.name ? `${besideRoom.name}${besideRoom.description ? ` | ${besideRoom.description}` : ''}` : (besideRoom.description || besideRoomName))
                                        : besideRoomName;
                                      return (
                                        <span key={idx} style={{
                                          padding: '4px 8px',
                                          backgroundColor: '#f0f0f0',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          color: '#333'
                                        }}>
                                          {displayName}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ marginTop: '10px' }}>
                                  <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                    No beside rooms configured. Click "Configure Beside Rooms" to set up.
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Beside Rooms Modal */}
      {editingElevatorStairs && selectedPin && selectedFloor && (
        <div className="modal-overlay" onClick={() => setEditingElevatorStairs(null)}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Configure Beside Rooms - {editingElevatorStairs.type === 'elevator' ? 'ELEVATOR' : 'STAIRS'}
              </h2>
              <button 
                className="close-button"
                onClick={() => setEditingElevatorStairs(null)}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                <strong>Building:</strong> {selectedPin.description || selectedPin.title}
              </p>
              <p style={{ margin: '0', color: '#666' }}>
                <strong>Floor:</strong> {getFloorName(selectedFloor.level)}
              </p>
            </div>

            <div className="form-group">
              <label className="label">Rooms Beside This {editingElevatorStairs.type === 'elevator' ? 'Elevator' : 'Stairs'}</label>
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '5px', 
                padding: '10px', 
                backgroundColor: '#f9f9f9',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {selectedFloor.rooms?.filter(r => {
                  // Exclude the current elevator/stairs room
                  const roomKey = String(r.name || r.id || '').trim();
                  const currentRoomKey = String(editingElevatorStairs.room.name || editingElevatorStairs.room.id || '').trim();
                  return roomKey !== currentRoomKey && roomKey !== '';
                }).map((otherRoom, idx) => {
                  // Use room.name as the primary identifier (e.g., "9-E1", "9-S1", "9-S2")
                  const otherRoomName = String(otherRoom.name || '').trim();
                  const isSelected = Array.isArray(editingElevatorStairs.currentBesideRooms) 
                    ? editingElevatorStairs.currentBesideRooms.some(besideId => {
                        const besideKey = String(besideId || '').trim();
                        // Match by room name primarily
                        return besideKey === otherRoomName || 
                               besideKey.toLowerCase() === otherRoomName.toLowerCase() ||
                               besideKey === String(otherRoom.id || '').trim();
                      })
                    : false;
                  return (
                    <label key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const currentBesideRooms = Array.isArray(editingElevatorStairs.currentBesideRooms) 
                            ? [...editingElevatorStairs.currentBesideRooms]
                            : [];
                          // Always use room.name as the identifier (e.g., "9-E1", "9-S1")
                          const roomNameToStore = otherRoom.name || otherRoom.id;
                          if (e.target.checked) {
                            // Add room name if not already present
                            if (roomNameToStore && !currentBesideRooms.some(b => 
                              String(b || '').trim() === String(roomNameToStore || '').trim()
                            )) {
                              editingElevatorStairs.currentBesideRooms = [...currentBesideRooms, roomNameToStore];
                            }
                          } else {
                            // Remove room name
                            editingElevatorStairs.currentBesideRooms = currentBesideRooms.filter(r => 
                              String(r || '').trim() !== String(roomNameToStore || '').trim()
                            );
                          }
                          setEditingElevatorStairs({ ...editingElevatorStairs });
                        }}
                        style={{ marginRight: '10px', width: '18px', height: '18px', flexShrink: 0 }}
                      />
                      <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        {otherRoom.name ? `${otherRoom.name}${otherRoom.description ? ` | ${otherRoom.description}` : ''}` : (otherRoom.description || 'Unnamed Room')}
                      </span>
                    </label>
                  );
                })}
              </div>
              <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '8px' }}>
                Select rooms that are physically next to this {editingElevatorStairs.type === 'elevator' ? 'elevator' : 'stairs'} (used in pathfinding instructions).
              </small>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setEditingElevatorStairs(null)}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveBesideRooms(
                    editingElevatorStairs.pinId,
                    editingElevatorStairs.floorIndex,
                    editingElevatorStairs.roomIndex,
                    editingElevatorStairs.currentBesideRooms || []
                  );
                }}
                className="button button-primary"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ElevatorStairsManagement;

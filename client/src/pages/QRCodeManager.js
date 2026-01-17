import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';
import QRCode from 'qrcode.react';
import './MapDataManager.css'; // Reuse styles

function QRCodeManager() {
  const [pins, setPins] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [generatingQRCode, setGeneratingQRCode] = useState(null);
  const [roomQRCodes, setRoomQRCodes] = useState({}); // { pinId_floorLevel_roomName: qrCode }

  useEffect(() => {
    fetchData();
  }, [selectedCampus]);

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
        fetch(`${baseUrl}/api/campuses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
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

      setPins(allPins);

      const campusesData = await campusesResponse.json();
      setCampuses(campusesData.data?.campuses || campusesData.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const generateRoomQRCode = async (pin, floorIndex, roomIndex, room) => {
    try {
      setGeneratingQRCode(`${pin._id || pin.id}_${floorIndex}_${roomIndex}`);
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');

      // Generate a unique QR code identifier
      const qrCodeId = `ROOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      // Update pin with new QR code
      const updatedFloors = JSON.parse(JSON.stringify(pin.floors || []));
      if (!updatedFloors[floorIndex]) updatedFloors[floorIndex] = { rooms: [] };
      if (!updatedFloors[floorIndex].rooms) updatedFloors[floorIndex].rooms = [];
      if (updatedFloors[floorIndex].rooms[roomIndex]) {
        updatedFloors[floorIndex].rooms[roomIndex].qrCode = qrCodeId;
      }

      const response = await fetch(`${baseUrl}/api/admin/pins/${pin._id || pin.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          floors: updatedFloors
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      setSuccess(`QR Code generated for ${room.name}: ${qrCodeId}`);
      setTimeout(() => setSuccess(''), 3000);

      // Update room QR codes state
      setRoomQRCodes(prev => ({
        ...prev,
        [`${pin._id || pin.id}_${floorIndex}_${roomIndex}`]: qrCodeId
      }));

      // Refresh pins
      fetchData();
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setGeneratingQRCode(null);
    }
  };

  const generateRoomDeepLink = (roomQRCode, isProduction = true) => {
    if (isProduction) {
      return `campustrails://qr/${roomQRCode}`;
    } else {
      const expoUrl = process.env.EXPO_URL || 'exp://192.168.1.100:8081';
      return `${expoUrl}/--/qr/${roomQRCode}`;
    }
  };

  const downloadQRCode = (roomName, qrCodeRef) => {
    if (qrCodeRef) {
      const element = qrCodeRef.querySelector('canvas');
      if (element) {
        const url = element.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${roomName}_qrcode.png`;
        link.href = url;
        link.click();
      }
    }
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  const pinsWithRooms = pins.filter(pin => pin.floors && pin.floors.some(f => f.rooms && f.rooms.length > 0));

  return (
    <div className="container">
      <div className="header-section">
        <h1>🏷️ QR Code Manager - Room QR Codes</h1>
        <p>Generate and manage QR codes for building rooms</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filter and Search */}
      <div className="filter-section" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
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

          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search buildings or rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Room QR Codes List */}
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>
          Rooms with QR Codes ({pinsWithRooms.length} buildings)
        </h2>

        {pinsWithRooms.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
            No buildings with rooms found. Add rooms in the Floor Plans section first.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {pinsWithRooms.map(pin => (
              <div key={pin._id || pin.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>{pin.title || 'Building'}</h3>

                {pin.floors && pin.floors.map((floor, floorIndex) => (
                  floor.rooms && floor.rooms.length > 0 && (
                    <div key={`floor-${floorIndex}`} style={{ marginBottom: '15px' }}>
                      <h4 style={{ margin: '10px 0', color: '#34495e', fontSize: '14px' }}>
                        Floor {floor.level}
                      </h4>

                      {floor.rooms.map((room, roomIndex) => {
                        const key = `${pin._id || pin.id}_${floorIndex}_${roomIndex}`;
                        const qrCode = room.qrCode;

                        return (
                          <div
                            key={key}
                            style={{
                              marginBottom: '12px',
                              padding: '10px',
                              backgroundColor: qrCode ? '#e8f5e9' : '#fff3cd',
                              border: `2px solid ${qrCode ? '#4caf50' : '#ffc107'}`,
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <strong>{room.name}</strong>
                              {room.description && (
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {room.description}
                                </div>
                              )}
                              {qrCode && (
                                <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '5px' }}>
                                  ✅ QR Code: {qrCode}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '5px' }}>
                              {!qrCode ? (
                                <button
                                  className="button button-small button-primary"
                                  onClick={() => generateRoomQRCode(pin, floorIndex, roomIndex, room)}
                                  disabled={generatingQRCode === key}
                                >
                                  {generatingQRCode === key ? '⏳' : '🏷️'} Generate
                                </button>
                              ) : (
                                <button
                                  className="button button-small button-secondary"
                                  onClick={() => setSelectedRoom({ pin, floorIndex, roomIndex, room, qrCode })}
                                >
                                  📋 View
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Viewer Modal */}
      {selectedRoom && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedRoom(null)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <h2>🏷️ Room QR Code</h2>
              <button
                className="close-button"
                onClick={() => setSelectedRoom(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h3>{selectedRoom.room.name}</h3>
              {selectedRoom.room.description && (
                <p style={{ color: '#666', marginBottom: '15px' }}>
                  {selectedRoom.room.description}
                </p>
              )}

              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                  Building: {selectedRoom.pin.title} | Floor {selectedRoom.pin.floors[selectedRoom.floorIndex].level}
                </p>
              </div>

              {/* QR Code */}
              <div
                ref={(ref) => {
                  if (ref && selectedRoom.qrCode) {
                    const canvasElement = ref.querySelector('canvas');
                    if (canvasElement) {
                      selectedRoom.qrCodeCanvas = canvasElement;
                    }
                  }
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  padding: '20px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px'
                }}
              >
                <QRCode
                  value={generateRoomDeepLink(selectedRoom.qrCode, true)}
                  level="H"
                  size={300}
                  includeMargin={true}
                />
              </div>

              {/* QR Code Details */}
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '12px'
              }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>QR Code ID:</strong> {selectedRoom.qrCode}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Deep Link:</strong>
                </p>
                <code style={{
                  display: 'block',
                  padding: '8px',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  wordBreak: 'break-all',
                  border: '1px solid #ddd'
                }}>
                  {generateRoomDeepLink(selectedRoom.qrCode, true)}
                </code>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="button button-primary"
                  onClick={() => {
                    const element = document.querySelector('.qrcode-download-ref');
                    downloadQRCode(selectedRoom.room.name, element);
                  }}
                >
                  ⬇️ Download PNG
                </button>

                <button
                  className="button button-secondary"
                  onClick={() => {
                    const link = generateRoomDeepLink(selectedRoom.qrCode, true);
                    const qrElement = document.querySelector('canvas');
                    if (qrElement) {
                      const url = qrElement.toDataURL('image/png');
                      const shareText = `Scan this QR code to visit ${selectedRoom.room.name} in Campus Trails!\n${link}`;
                      if (navigator.share) {
                        navigator.share({
                          title: selectedRoom.room.name,
                          text: shareText
                        });
                      } else {
                        alert(shareText);
                      }
                    }
                  }}
                >
                  📤 Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="qrcode-download-ref" style={{ display: 'none' }}>
        {selectedRoom && (
          <QRCode
            value={generateRoomDeepLink(selectedRoom.qrCode, true)}
            level="H"
            size={300}
            includeMargin={true}
          />
        )}
      </div>
    </div>
  );
}

export default QRCodeManager;

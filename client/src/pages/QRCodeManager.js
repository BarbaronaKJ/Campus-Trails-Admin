import React, { useState, useEffect, useRef } from 'react';
import { pinsAPI, campusesAPI } from '../services/api';

function QRCodeManager() {
  const [pins, setPins] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedCampus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [pinsRes, campusesRes] = await Promise.all([
        pinsAPI.getAll({ limit: 1000, includeInvisible: false }),
        campusesAPI.getAll()
      ]);

      // Handle pins response
      let pinsData = [];
      if (pinsRes.data) {
        if (pinsRes.data.pins) {
          pinsData = pinsRes.data.pins;
        } else if (Array.isArray(pinsRes.data)) {
          pinsData = pinsRes.data;
        }
      } else if (Array.isArray(pinsRes)) {
        pinsData = pinsRes;
      }

      // Handle campuses response
      let campusesData = [];
      if (campusesRes.data) {
        if (campusesRes.data.campuses) {
          campusesData = campusesRes.data.campuses;
        } else if (Array.isArray(campusesRes.data)) {
          campusesData = campusesRes.data;
        }
      } else if (Array.isArray(campusesRes)) {
        campusesData = campusesRes;
      }

      // Filter pins with QR codes and by campus
      let filteredPins = pinsData.filter(pin => pin.qrCode && pin.isVisible !== false);
      
      if (selectedCampus !== 'all') {
        filteredPins = filteredPins.filter(pin => {
          const campusId = pin.campusId?._id || pin.campusId;
          return campusId === selectedCampus || campusId?.toString() === selectedCampus;
        });
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredPins = filteredPins.filter(pin => {
          const title = (pin.title || '').toLowerCase();
          const description = (pin.description || '').toLowerCase();
          const qrCode = (pin.qrCode || '').toLowerCase();
          return title.includes(query) || description.includes(query) || qrCode.includes(query);
        });
      }

      setPins(filteredPins);
      setCampuses(campusesData);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      setError('Failed to fetch QR codes');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = async (pin, qrCodeValue) => {
    try {
      // Use qrcode library to generate data URL
      const QRCode = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(qrCodeValue, { width: 300, margin: 2 });
      const link = document.createElement('a');
      link.download = `qr-code-${(pin.title || pin.id || 'pin').toString().replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to download QR code');
    }
  };

  const copyDeepLink = (qrCode) => {
    navigator.clipboard.writeText(qrCode).then(() => {
      alert('Deep link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy deep link');
    });
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>QR Code Manager</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {/* Filters */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className="label">Filter by Campus</label>
            <select
              className="input"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
            >
              <option value="all">All Campuses</option>
              {campuses.map(campus => (
                <option key={campus._id || campus.id} value={campus._id || campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search by title, description, or QR code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* QR Codes Grid */}
        {pins.length === 0 ? (
          <p>No QR codes found. Pins with QR codes will appear here.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '20px',
            marginTop: '20px'
          }}>
            {pins.map(pin => {
              const qrCodeValue = pin.qrCode || `campustrails://pin/${pin.id}`;
              return (
                <div 
                  key={pin._id || pin.id} 
                  className="card"
                  style={{ 
                    padding: '20px', 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                    {pin.description || pin.title}
                  </h3>
                  <QRCodeDisplay value={qrCodeValue} pinId={pin._id || pin.id} />
                  <div style={{ fontSize: '12px', color: '#666', wordBreak: 'break-all', marginTop: '5px' }}>
                    {qrCodeValue}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                      onClick={() => downloadQRCode(pin, qrCodeValue)}
                    >
                      Download
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                      onClick={() => copyDeepLink(qrCodeValue)}
                    >
                      Copy Link
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                    Campus: {pin.campusId?.name || 'N/A'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// QR Code Display Component using canvas
const QRCodeDisplay = ({ value, pinId }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = await import('qrcode');
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, value, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQR();
  }, [value]);

  return (
    <div style={{ 
      padding: '10px', 
      backgroundColor: 'white', 
      borderRadius: '8px',
      display: 'inline-block'
    }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default QRCodeManager;

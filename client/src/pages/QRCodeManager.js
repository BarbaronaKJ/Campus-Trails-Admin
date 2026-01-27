import React, { useState, useEffect, useCallback } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'
// Use qrcode library (not qrcode.react) - this is a Node.js library that works in browser
// Import the default export explicitly
import QRCodeLib from 'qrcode'
import { matchesFlexible } from '../utils/fuzzySearch'
import './MapDataManager.css'

function QRCodeManager() {
  const [buildings, setBuildings] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('buildings') // 'buildings' or 'rooms'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null) // For QR code preview modal
  const [qrCodeImages, setQrCodeImages] = useState({}) // Cache QR code images

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate QR code images for all items
  useEffect(() => {
    const generateQRImages = async () => {
      const images = {}
      
      // Generate for buildings
      for (const building of buildings) {
        if (building.qrCode) {
          try {
            const dataUrl = await QRCodeLib.toDataURL(building.qrCode, { width: 200, margin: 1 })
            images[`building-${building._id}`] = dataUrl
          } catch (err) {
            console.error('Error generating QR code for building:', building._id, err)
          }
        }
      }
      
      // Generate for rooms
      for (const room of rooms) {
        if (room.qrCode) {
          try {
            const key = `room-${room.buildingId}-${room.floorLevel}-${room.name}`
            const dataUrl = await QRCodeLib.toDataURL(room.qrCode, { width: 200, margin: 1 })
            images[key] = dataUrl
          } catch (err) {
            console.error('Error generating QR code for room:', room.name, err)
          }
        }
      }
      
      setQrCodeImages(images)
    }
    
    if (buildings.length > 0 || rooms.length > 0) {
      generateQRImages()
    }
  }, [buildings, rooms])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const baseUrl = getApiBaseUrl()
      const token = localStorage.getItem('adminToken')
      
      if (!token) {
        setError('Please log in to access this page.')
        setLoading(false)
        return
      }

      const response = await fetch(`${baseUrl}/api/admin/pins?includeInvisible=false&limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch pins: ${response.status}`)
      }

      const data = await response.json()
      const pins = data.success ? data.pins : (data.data || [])

      // Separate buildings and rooms
      const buildingList = []
      const roomList = []

      pins.forEach(pin => {
        // Add building if it has a QR code or is visible
        if (pin.isVisible && pin.pinType === 'facility') {
          buildingList.push({
            ...pin,
            type: 'building',
            displayName: pin.description || pin.title,
            qrCode: pin.qrCode || generateBuildingQRCode(pin.id)
          })
        }

        // Extract rooms from floors
        if (pin.floors && Array.isArray(pin.floors)) {
          pin.floors.forEach(floor => {
            if (floor.rooms && Array.isArray(floor.rooms)) {
              floor.rooms.forEach(room => {
                roomList.push({
                  ...room,
                  type: 'room',
                  buildingId: pin.id,
                  buildingName: pin.description || pin.title,
                  buildingNumber: pin.buildingNumber,
                  floorLevel: floor.level,
                  floorName: getFloorName(floor.level),
                  displayName: room.name,
                  qrCode: room.qrCode || generateRoomQRCode(pin.id, floor.level, room.name)
                })
              })
            }
          })
        }
      })

      setBuildings(buildingList)
      setRooms(roomList)
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to fetch data')
      setLoading(false)
    }
  }, [])

  const getFloorName = (level) => {
    if (level === 0) return 'Ground Floor'
    const floorNumber = level + 1
    const lastDigit = floorNumber % 10
    const lastTwoDigits = floorNumber % 100
    let suffix = 'th'
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      suffix = 'th'
    } else if (lastDigit === 1) {
      suffix = 'st'
    } else if (lastDigit === 2) {
      suffix = 'nd'
    } else if (lastDigit === 3) {
      suffix = 'rd'
    }
    return `${floorNumber}${suffix} Floor`
  }

  const generateBuildingQRCode = (pinId) => {
    return `campustrails://pin/${pinId}`
  }

  const generateRoomQRCode = (buildingId, floorLevel, roomName) => {
    // Generate a unique identifier for the room
    const roomId = `${buildingId}_f${floorLevel}_${roomName.replace(/\s+/g, '_')}`
    return `campustrails://room/${roomId}`
  }

  const handleGenerateQRCode = async (item) => {
    try {
      const baseUrl = getApiBaseUrl()
      const token = localStorage.getItem('adminToken')

      if (item.type === 'building') {
        // Update building QR code
        const qrCode = generateBuildingQRCode(item.id)
        const response = await fetch(`${baseUrl}/api/admin/pins/${item._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ qrCode })
        })

        if (!response.ok) {
          throw new Error('Failed to update building QR code')
        }

        // Update local state
        setBuildings(prev => prev.map(b => 
          b._id === item._id ? { ...b, qrCode } : b
        ))
      } else if (item.type === 'room') {
        // Update room QR code in building
        const response = await fetch(`${baseUrl}/api/admin/pins/${item.buildingId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch building data')
        }

        const buildingData = await response.json()
        const building = buildingData.success ? buildingData.pin : buildingData.data

        // Find and update the room
        const updatedFloors = building.floors.map(floor => {
          if (floor.level === item.floorLevel) {
            const updatedRooms = floor.rooms.map(room => {
              if (room.name === item.name) {
                return { ...room, qrCode: generateRoomQRCode(item.buildingId, item.floorLevel, item.name) }
              }
              return room
            })
            return { ...floor, rooms: updatedRooms }
          }
          return floor
        })

        // Update building with new room QR code
        const updateResponse = await fetch(`${baseUrl}/api/admin/pins/${building._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ floors: updatedFloors })
        })

        if (!updateResponse.ok) {
          throw new Error('Failed to update room QR code')
        }

        // Update local state
        const newQrCode = generateRoomQRCode(item.buildingId, item.floorLevel, item.name)
        setRooms(prev => prev.map(r => 
          r.buildingId === item.buildingId && 
          r.floorLevel === item.floorLevel && 
          r.name === item.name 
            ? { ...r, qrCode: newQrCode } 
            : r
        ))
      }

      alert('QR code generated successfully!')
    } catch (err) {
      console.error('Generate QR code error:', err)
      alert('Failed to generate QR code: ' + err.message)
    }
  }

  const downloadQRCode = async (item) => {
    try {
      const key = item.type === 'building' 
        ? `building-${item._id}`
        : `room-${item.buildingId}-${item.floorLevel}-${item.name}`
      
      const dataUrl = qrCodeImages[key] || await QRCodeLib.toDataURL(item.qrCode, { width: 300, margin: 1 })
      
      const link = document.createElement('a')
      link.download = `${item.displayName.replace(/\s+/g, '_')}_QR.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error downloading QR code:', err)
      alert('Failed to download QR code')
    }
  }

  const filteredItems = selectedCategory === 'buildings' 
    ? buildings.filter(b => {
        if (!searchQuery.trim()) return true;
        return matchesFlexible(searchQuery, b.displayName || '') ||
               (b.qrCode && matchesFlexible(searchQuery, b.qrCode));
      })
    : rooms.filter(r => {
        if (!searchQuery.trim()) return true;
        return matchesFlexible(searchQuery, r.displayName || '') ||
               matchesFlexible(searchQuery, r.buildingName || '') ||
               (r.qrCode && matchesFlexible(searchQuery, r.qrCode));
      })

  // Group rooms by building for Rooms tab
  const groupedRoomsByBuilding = React.useMemo(() => {
    if (selectedCategory !== 'rooms') return {}
    
    const grouped = {}
    filteredItems.forEach(room => {
      const buildingKey = room.buildingId || 'Unknown'
      if (!grouped[buildingKey]) {
        grouped[buildingKey] = {
          buildingId: room.buildingId,
          buildingName: room.buildingName || 'Unknown Building',
          rooms: []
        }
      }
      grouped[buildingKey].rooms.push(room)
    })
    
    // Sort rooms within each building by floor level, then by name
    Object.keys(grouped).forEach(buildingKey => {
      grouped[buildingKey].rooms.sort((a, b) => {
        if (a.floorLevel !== b.floorLevel) {
          return a.floorLevel - b.floorLevel
        }
        return (a.displayName || '').localeCompare(b.displayName || '')
      })
    })
    
    return grouped
  }, [filteredItems, selectedCategory])

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading QR codes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
        <button onClick={fetchData}>Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>QR Code Manager</h1>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setSelectedCategory('buildings')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: selectedCategory === 'buildings' ? '#007bff' : 'transparent',
            color: selectedCategory === 'buildings' ? 'white' : '#333',
            cursor: 'pointer',
            borderBottom: selectedCategory === 'buildings' ? '3px solid #007bff' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Buildings ({buildings.length})
        </button>
        <button
          onClick={() => setSelectedCategory('rooms')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: selectedCategory === 'rooms' ? '#007bff' : 'transparent',
            color: selectedCategory === 'rooms' ? 'white' : '#333',
            cursor: 'pointer',
            borderBottom: selectedCategory === 'rooms' ? '3px solid #007bff' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Rooms ({rooms.length})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={`Search ${selectedCategory}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Items Grid */}
      {selectedCategory === 'buildings' ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredItems.map((item, index) => (
          <div 
            key={item._id || `${item.buildingId}-${item.floorLevel}-${item.name}`}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
              {item.displayName}
            </h3>
            
            {item.type === 'room' && (
              <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                <div><strong>Building:</strong> {item.buildingName}</div>
                <div><strong>Floor:</strong> {item.floorName}</div>
              </div>
            )}

            {item.qrCode ? (
              <>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  padding: '20px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <img
                    src={qrCodeImages[item.type === 'building' 
                      ? `building-${item._id}`
                      : `room-${item.buildingId}-${item.floorLevel}-${item.name}`] || ''}
                    alt={`QR Code for ${item.displayName}`}
                    style={{ width: '200px', height: '200px' }}
                    onError={async (e) => {
                      // Generate on error if not in cache
                      try {
                        const dataUrl = await QRCodeLib.toDataURL(item.qrCode, { width: 200, margin: 1 })
                        e.target.src = dataUrl
                        const key = item.type === 'building' 
                          ? `building-${item._id}`
                          : `room-${item.buildingId}-${item.floorLevel}-${item.name}`
                        setQrCodeImages(prev => ({ ...prev, [key]: dataUrl }))
                      } catch (err) {
                        console.error('Error generating QR code:', err)
                      }
                    }}
                  />
                </div>
                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                  <strong>QR Code:</strong> {item.qrCode}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => downloadQRCode(item)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Download
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#666', marginBottom: '15px' }}>No QR code generated</p>
                <button
                  onClick={() => handleGenerateQRCode(item)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Generate QR Code
                </button>
              </div>
            )}
          </div>
          ))}
        </div>
      ) : (
        /* Rooms categorized by building */
        <div>
          {Object.keys(groupedRoomsByBuilding).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No rooms found{searchQuery && ` matching "${searchQuery}"`}</p>
            </div>
          ) : (
            Object.keys(groupedRoomsByBuilding).map(buildingKey => {
              const buildingGroup = groupedRoomsByBuilding[buildingKey]
              return (
                <div key={buildingKey} style={{ marginBottom: '40px' }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: '2px solid #007bff',
                    color: '#333'
                  }}>
                    {buildingGroup.buildingName} ({buildingGroup.rooms.length} {buildingGroup.rooms.length === 1 ? 'room' : 'rooms'})
                  </h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '20px' 
                  }}>
                    {buildingGroup.rooms.map((item) => (
                      <div 
                        key={item._id || `${item.buildingId}-${item.floorLevel}-${item.name}`}
                        style={{
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                          {item.displayName}
                        </h3>
                        
                        <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                          <div><strong>Floor:</strong> {item.floorName}</div>
                        </div>

                        {item.qrCode ? (
                          <>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'center', 
                              padding: '20px',
                              backgroundColor: '#f9f9f9',
                              borderRadius: '4px',
                              marginBottom: '15px'
                            }}>
                              <img
                                src={qrCodeImages[`room-${item.buildingId}-${item.floorLevel}-${item.name}`] || ''}
                                alt={`QR Code for ${item.displayName}`}
                                style={{ width: '200px', height: '200px' }}
                                onError={async (e) => {
                                  try {
                                    const dataUrl = await QRCodeLib.toDataURL(item.qrCode, { width: 200, margin: 1 })
                                    e.target.src = dataUrl
                                    const key = `room-${item.buildingId}-${item.floorLevel}-${item.name}`
                                    setQrCodeImages(prev => ({ ...prev, [key]: dataUrl }))
                                  } catch (err) {
                                    console.error('Error generating QR code:', err)
                                  }
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
                              <strong>QR Code:</strong> {item.qrCode}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => setSelectedItem(item)}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                View
                              </button>
                              <button
                                onClick={() => downloadQRCode(item)}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Download
                              </button>
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <p style={{ color: '#666', marginBottom: '15px' }}>No QR code generated</p>
                            <button
                              onClick={() => handleGenerateQRCode(item)}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Generate QR Code
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* QR Code Preview Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '90%',
              maxHeight: '90%',
              overflow: 'auto',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{selectedItem.displayName}</h2>
            {selectedItem.type === 'room' && (
              <div style={{ marginBottom: '20px', color: '#666' }}>
                <div><strong>Building:</strong> {selectedItem.buildingName}</div>
                <div><strong>Floor:</strong> {selectedItem.floorName}</div>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              padding: '20px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <img
                src={qrCodeImages[selectedItem.type === 'building' 
                  ? `building-${selectedItem._id}`
                  : `room-${selectedItem.buildingId}-${selectedItem.floorLevel}-${selectedItem.name}`] || ''}
                alt={`QR Code for ${selectedItem.displayName}`}
                style={{ width: '300px', height: '300px' }}
                onError={async (e) => {
                  // Generate on error if not in cache
                  try {
                    const dataUrl = await QRCodeLib.toDataURL(selectedItem.qrCode, { width: 300, margin: 1 })
                    e.target.src = dataUrl
                    const key = selectedItem.type === 'building' 
                      ? `building-${selectedItem._id}`
                      : `room-${selectedItem.buildingId}-${selectedItem.floorLevel}-${selectedItem.name}`
                    setQrCodeImages(prev => ({ ...prev, [key]: dataUrl }))
                  } catch (err) {
                    console.error('Error generating QR code:', err)
                  }
                }}
              />
            </div>
            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666', wordBreak: 'break-all' }}>
              <strong>QR Code:</strong> {selectedItem.qrCode}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => downloadQRCode(selectedItem)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Download
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QRCodeManager

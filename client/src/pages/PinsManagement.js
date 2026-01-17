import { useState, useEffect } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'
import { pinsAPI, campusesAPI } from '../services/api'
import './MapDataManager.css'

function PinsManagement() {
  const [pins, setPins] = useState([])
  const [selectedPin, setSelectedPin] = useState(null)
  const [campuses, setCampuses] = useState([])
  const [selectedCampus, setSelectedCampus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState('all') // all, visible, waypoints
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // New pin form
  const [showNewPinForm, setShowNewPinForm] = useState(false)
  const [newPinData, setNewPinData] = useState({
    title: '',
    description: '',
    category: 'Other',
    campusId: '',
    x: 0,
    y: 0,
    isVisible: true,
    neighbors: []
  })

  // Edit pin form
  const [showEditPinForm, setShowEditPinForm] = useState(false)
  const [editPinData, setEditPinData] = useState(null)

  // Map viewer state
  const [showMapViewer, setShowMapViewer] = useState(true)
  const [hoveredPin, setHoveredPin] = useState(null)
  
  // Pin list collapsible state
  const [showPinList, setShowPinList] = useState(true)
  
  // Pin selection modal state (when clicking a pin on map)
  const [pinSelectionSearch, setPinSelectionSearch] = useState('')
  const [pinSelectionViewMode, setPinSelectionViewMode] = useState('all') // all, visible, waypoints
  
  // Map click mode for adding new pin or moving existing pin
  const [mapClickMode, setMapClickMode] = useState(false) // true when waiting for map click to set coordinates
  const [pinBeingMoved, setPinBeingMoved] = useState(null) // the pin being moved (if any)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
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

      const [pinsResponse, campusesResponse] = await Promise.all([
        fetch(`${baseUrl}/api/admin/pins?includeInvisible=true&limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => {
          console.error('Pins fetch error:', err)
          throw new Error('Failed to fetch pins. Please check your connection.')
        }),
        campusesAPI.getAll().catch(err => {
          console.error('Campuses fetch error:', err)
          throw new Error('Failed to fetch campuses. Please check your connection.')
        })
      ])

      if (!pinsResponse.ok) {
        const errorText = await pinsResponse.text()
        console.error('Pins API error:', errorText)
        setError(`Failed to fetch pins: ${pinsResponse.status} ${pinsResponse.statusText}`)
        setLoading(false)
        return
      }

      const pinsData = await pinsResponse.json()
      
      // Handle different response structures
      let pins = []
      if (pinsData.success && pinsData.pins) {
        pins = pinsData.pins
      } else if (pinsData.data) {
        pins = Array.isArray(pinsData.data) ? pinsData.data : []
      } else if (Array.isArray(pinsData)) {
        pins = pinsData
      }

      // Handle campuses response
      let campuses = []
      if (campusesResponse && campusesResponse.data) {
        const campusesData = campusesResponse.data
        campuses = Array.isArray(campusesData) ? campusesData : (campusesData.campuses || campusesData.data || [])
      } else if (Array.isArray(campusesResponse)) {
        campuses = campusesResponse
      }
      
      console.log(`✅ Loaded ${pins.length} pins (total: ${pinsData.pagination?.total || pins.length})`)
      console.log(`✅ Loaded ${campuses.length} campuses`)
      
      setPins(pins)
      setCampuses(campuses)
      setSuccess('')
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Check if selected campus is USTP-CDO (for map display)
  const selectedCampusObj = campuses.find(c => c._id === selectedCampus || c._id === selectedCampus?._id)
  const isUSTPCDO = selectedCampus === 'all' || (selectedCampusObj && selectedCampusObj.name && selectedCampusObj.name.toLowerCase().includes('ustp') && selectedCampusObj.name.toLowerCase().includes('cdo'))
  
  const filteredPins = pins.filter(pin => {
    if (selectedCampus !== 'all' && pin.campusId !== selectedCampus && pin.campusId?._id !== selectedCampus) {
      return false
    }
    if (viewMode === 'visible' && pin.isVisible === false) {
      return false
    }
    if (viewMode === 'waypoints' && pin.isVisible !== false) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const title = (pin.title || '').toLowerCase()
      const category = (pin.category || '').toLowerCase()
      const id = String(pin._id || pin.id).toLowerCase()
      if (!title.includes(query) && !category.includes(query) && !id.includes(query)) {
        return false
      }
    }
    return true
  })
  
  // Filtered pins for pin selection modal
  const filteredPinsForSelection = pins.filter(pin => {
    if (pinSelectionViewMode === 'visible' && pin.isVisible === false) {
      return false
    }
    if (pinSelectionViewMode === 'waypoints' && pin.isVisible !== false) {
      return false
    }
    if (pinSelectionSearch) {
      const query = pinSelectionSearch.toLowerCase()
      const title = (pin.title || '').toLowerCase()
      const category = (pin.category || '').toLowerCase()
      const id = String(pin._id || pin.id).toLowerCase()
      if (!title.includes(query) && !category.includes(query) && !id.includes(query)) {
        return false
      }
    }
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPins.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPins = filteredPins.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCampus, viewMode])
  
  // Show pin list when searching
  useEffect(() => {
    if (searchQuery) {
      setShowPinList(true)
    }
  }, [searchQuery])

  const handleCreatePin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate required fields
    if (!newPinData.campusId) {
      setError('Please select a campus')
      return
    }

    try {
      const response = await pinsAPI.create(newPinData)

      if (response.data && (response.data.success || response.data.pin)) {
        const createdPin = response.data.pin || response.data.data || response.data
        setSuccess('Pin created successfully!')
        setShowNewPinForm(false)
        setNewPinData({
          title: '',
          description: '',
          category: 'Other',
          campusId: '',
          x: 0,
          y: 0,
          isVisible: true,
          neighbors: [],
          floors: []
        })
        setTimeout(() => setSuccess(''), 3000)
        // Refresh data immediately to reflect changes
        await fetchData()
      } else {
        setError(response.data?.message || 'Failed to create pin')
      }
    } catch (error) {
      console.error('Error creating pin:', error)
      setError(error.response?.data?.message || 'Network error. Please try again.')
    }
  }

  const handleUpdateNeighbors = async (pinId, neighbors) => {
    setError('')
    setSuccess('')
    try {
      const baseUrl = getApiBaseUrl()
      const token = localStorage.getItem('adminToken')
      
      if (!token) {
        setError('Please log in to update connections.')
        return
      }

      // Ensure pinId is a string
      const pinIdStr = String(pinId)
      
      // Normalize neighbors array - ensure all values are properly formatted
      // IMPORTANT: Use pin.id (not _id) for pathfinding connections
      const normalizedNeighbors = Array.isArray(neighbors) 
        ? neighbors.map(n => {
            // If neighbor is an object, extract the id field (not _id)
            if (typeof n === 'object' && n !== null) {
              return n.id || n._id || n
            }
            return n
          })
        : []

      console.log('Updating neighbors for pin:', pinIdStr, 'Neighbors:', normalizedNeighbors)

      const response = await fetch(`${baseUrl}/api/admin/pins/${pinIdStr}/neighbors`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ neighbors: normalizedNeighbors })
      })

      const responseText = await response.text()
      console.log('Neighbors update response:', response.status, responseText)

      if (response.ok) {
        try {
          const data = JSON.parse(responseText)
          if (data.success) {
            setSuccess('Connections updated successfully!')
            setTimeout(() => setSuccess(''), 3000)
            // Refresh data immediately to reflect changes
            await fetchData()
            // Update selectedPin to reflect new neighbors
            if (selectedPin && (String(selectedPin._id || selectedPin.id) === pinIdStr)) {
              const updatedPin = data.pin || { ...selectedPin, neighbors: normalizedNeighbors }
              setSelectedPin(updatedPin)
            }
          } else {
            setError(data.message || 'Failed to update connections')
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
          setError('Invalid response from server')
        }
      } else {
        try {
          const errorData = JSON.parse(responseText)
          setError(errorData.message || `Failed to update connections: ${response.status} ${response.statusText}`)
        } catch (parseError) {
          setError(`Failed to update connections: ${response.status} ${response.statusText}`)
        }
      }
    } catch (error) {
      console.error('Error updating neighbors:', error)
      setError(error.message || 'Network error. Please try again.')
    }
  }

  const handleDeletePin = async (pinId) => {
    if (!window.confirm('Are you sure you want to delete this pin? This will also remove it from all neighbor connections. This action cannot be undone.')) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await pinsAPI.delete(pinId)
      setSuccess('Pin deleted successfully!')
      setSelectedPin(null)
      setTimeout(() => setSuccess(''), 3000)
      // Refresh data immediately to reflect changes
      await fetchData()
    } catch (error) {
      console.error('Error deleting pin:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete pin'
      setError(errorMessage)
    }
  }

  const handleUpdatePin = async (pinId, updateData) => {
    setError('')
    setSuccess('')
    try {
      // Ensure campusId is a valid ObjectId string if it's an object
      const dataToSend = {
        ...updateData,
        campusId: typeof updateData.campusId === 'object' ? updateData.campusId._id || updateData.campusId : updateData.campusId,
        x: Number(updateData.x) || 0,
        y: Number(updateData.y) || 0,
        isVisible: updateData.isVisible !== false
      }

      const response = await pinsAPI.update(pinId, dataToSend)

      if (response.data && (response.data.success || response.data.pin || response.data.data)) {
        setSuccess('Pin updated successfully!')
        setShowEditPinForm(false)
        setSelectedPin(null)
        setTimeout(() => setSuccess(''), 3000)
        // Refresh data immediately to reflect changes
        await fetchData()
      } else {
        setError(response.data?.message || 'Failed to update pin')
      }
    } catch (error) {
      console.error('Error updating pin:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Network error. Please try again.'
      setError(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Map Data Manager</h1>
          <p>Manage pins, waypoints, and pathfinding connections</p>
        </div>
      </div>

      {error && <div className="error card">{error}</div>}
      {success && <div className="success card">{success}</div>}

      {/* 1. Search Pins Options - FIRST */}
      <div className="map-controls card">
        <div className="control-group">
          <label className="label">Search Pins</label>
          <input
            type="text"
            className="input"
            placeholder="Search by title, category, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

        <div className="control-group">
          <label className="label">View Mode</label>
          <div className="view-mode-buttons">
            <button 
              className={`button ${viewMode === 'all' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setViewMode('all')}
            >
              All ({pins.length})
            </button>
            <button 
              className={`button ${viewMode === 'visible' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setViewMode('visible')}
            >
              Visible ({pins.filter(p => p.isVisible !== false).length})
            </button>
            <button 
              className={`button ${viewMode === 'waypoints' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setViewMode('waypoints')}
            >
              Waypoints ({pins.filter(p => p.isVisible === false).length})
            </button>
          </div>
        </div>

        {(searchQuery || selectedCampus !== 'all' || viewMode !== 'all') && (
          <div className="control-group">
            <button 
              className="button button-secondary button-small"
              onClick={() => {
                setSearchQuery('')
                setSelectedCampus('all')
                setViewMode('all')
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* 2. Pin Lists - SECOND (collapsible, above map) */}
      <div className="pins-table-container card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Pins List</h2>
            <span style={{ color: '#7f8c8d', fontSize: '14px' }}>
              ({filteredPins.length} of {pins.length} pins)
            </span>
          </div>
          <button 
            className="button button-secondary button-small"
            onClick={() => setShowPinList(!showPinList)}
          >
            {showPinList ? '▼ Collapse' : '▶ Expand'}
          </button>
        </div>
        
        {showPinList && (
          <>
            <table className="pins-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Coordinates</th>
                  <th>Neighbors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPins.map(pin => (
                  <tr key={pin._id || pin.id}>
                    <td className="pin-id">{String(pin._id || pin.id).substring(0, 8)}</td>
                    <td>
                      <strong>{pin.title || 'Waypoint'}</strong>
                    </td>
                    <td>
                      <span className={`type-badge ${pin.isVisible === false ? 'waypoint' : 'visible'}`}>
                        {pin.isVisible === false ? '🔍 Waypoint' : '👁️ Visible'}
                      </span>
                    </td>
                    <td>{pin.category || 'N/A'}</td>
                    <td className="coordinates">
                      ({pin.x?.toFixed(2)}, {pin.y?.toFixed(2)})
                    </td>
                    <td>
                      <span className="neighbors-count">
                        {pin.neighbors?.length || 0} connections
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          className="button button-primary button-small"
                          onClick={() => setSelectedPin(pin)}
                          title="Manage Connections"
                        >
                          Connections
                        </button>
                        <button 
                          className="button button-secondary button-small"
                          onClick={() => {
                            setEditPinData(pin)
                            setShowEditPinForm(true)
                          }}
                          title="Edit Pin"
                        >
                          Edit
                        </button>
                        <button 
                          className="button button-danger button-small"
                          onClick={() => handleDeletePin(pin._id || pin.id)}
                          title="Delete Pin"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredPins.length > 0 && (
              <div className="pagination-controls">
                <div className="pagination-info">
                  <span>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredPins.length)} of {filteredPins.length} pins
                  </span>
                  <select
                    className="input"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    style={{ width: 'auto', marginLeft: '15px', padding: '5px 10px' }}
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                
                <div className="pagination-buttons">
                  <button
                    className="button button-secondary button-small"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </button>
                  <button
                    className="button button-secondary button-small"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  <div className="page-numbers">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`button button-small ${currentPage === pageNum ? 'button-primary' : 'button-secondary'}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    className="button button-secondary button-small"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                  <button
                    className="button button-secondary button-small"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Map Viewer Section - THIRD (with Add New Pin button) */}
      <div className="map-viewer-section card">
        <div className="map-viewer-header">
          <h2>Campus Map View</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="button button-primary"
              onClick={() => {
                if (isUSTPCDO) {
                  setMapClickMode(true)
                  setShowMapViewer(true)
                } else {
                  setShowNewPinForm(true)
                }
              }}
            >
              + Add New Pin
            </button>
            <button 
              className="button button-secondary button-small"
              onClick={() => setShowMapViewer(!showMapViewer)}
            >
              {showMapViewer ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
        </div>
        
        {showMapViewer && isUSTPCDO && (
          <div className="map-viewer-container">
            <div className="map-viewer-info">
              {mapClickMode ? (
                <p style={{ color: '#ff9800', fontWeight: 'bold' }}>
                  {pinBeingMoved 
                    ? `Click on the map to move "${pinBeingMoved.title || 'Waypoint'}" to a new location...` 
                    : 'Click on the map to set pin coordinates...'}
                </p>
              ) : (
                <p>Click on pins to view details. Hover to see coordinates. Only showing {filteredPins.length} filtered pins.</p>
              )}
            </div>
            
            <div 
              className="map-canvas"
              onWheel={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onMouseWheel={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onTouchStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onTouchCancel={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onMouseDown={(e) => {
                // Only prevent default if not clicking on a pin marker
                if (e.target.tagName !== 'circle' && e.target.tagName !== 'g' && e.target.tagName !== 'foreignObject') {
                  e.preventDefault()
                }
              }}
              onDragStart={(e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                return false
              }}
              onClick={(e) => {
                const svg = e.currentTarget.querySelector('svg')
                if (svg) {
                  const rect = svg.getBoundingClientRect()
                  const relativeX = e.clientX - rect.left
                  const relativeY = e.clientY - rect.top
                  
                  // Calculate pixel coordinates in viewBox space (1920x1310)
                  const pixelX = Math.round(relativeX / rect.width * 1920)
                  const pixelY = Math.round(relativeY / rect.height * 1310)
                  
                  if (mapClickMode) {
                    if (pinBeingMoved) {
                      // Moving an existing pin
                      setEditPinData({...pinBeingMoved, x: pixelX, y: pixelY})
                      setShowEditPinForm(true)
                      setMapClickMode(false)
                      setPinBeingMoved(null)
                      setSuccess(`Pin moved to: X: ${pixelX}, Y: ${pixelY}. Click "Update Pin" to save changes.`)
                      setTimeout(() => setSuccess(''), 5000)
                    } else {
                      // Creating a new pin
                      setNewPinData({...newPinData, x: pixelX, y: pixelY})
                      setMapClickMode(false)
                      setShowNewPinForm(true)
                      setSuccess(`Coordinates set: X: ${pixelX}, Y: ${pixelY}`)
                      setTimeout(() => setSuccess(''), 3000)
                    }
                  } else {
                    console.log(`Clicked coordinates: x: ${pixelX}, y: ${pixelY}`)
                  }
                }
              }}
            >
              <svg 
                viewBox="0 0 1920 1310"
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  display: 'block', 
                  maxWidth: '1200px', 
                  touchAction: 'none', 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  cursor: 'default',
                  transform: 'none',
                  WebkitTransform: 'none',
                  MozTransform: 'none',
                  msTransform: 'none',
                  OTransform: 'none'
                }}
                preserveAspectRatio="xMidYMid meet"
                onContextMenu={(e) => {
                  e.preventDefault()
                  return false
                }}
                onWheel={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
                onMouseWheel={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
                onTouchStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
                onTouchCancel={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
                onDragStart={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return false
                }}
              >
                <image
                  href="/ustp-cdo-map.png"
                  width="1920"
                  height="1310"
                  style={{
                    pointerEvents: 'none',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onDragStart={(e) => {
                    e.preventDefault()
                    return false
                  }}
                />
                
                {/* Pin Markers */}
                {filteredPins.map(pin => {
                  const x = pin.x || 0
                  const y = pin.y || 0
                  const isHovered = hoveredPin === pin._id || hoveredPin === pin.id
                  
                  return (
                    <g
                      key={pin._id || pin.id}
                      className={`map-pin-marker ${pin.isVisible === false ? 'waypoint' : 'visible'} ${isHovered ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredPin(pin._id || pin.id)}
                      onMouseLeave={() => setHoveredPin(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPin(pin)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 14 : 10}
                        className="pin-marker-circle"
                        fill={pin.isVisible === false ? '#ff9800' : '#28a745'}
                        stroke="white"
                        strokeWidth={isHovered ? 3 : 2}
                      />
                      {isHovered && (
                        <foreignObject
                          x={x - 80}
                          y={y - 70}
                          width="160"
                          height="60"
                          style={{ pointerEvents: 'none' }}
                        >
                          <div className="pin-tooltip-svg">
                            <strong>{pin.title || 'Waypoint'}</strong>
                            <div>({x}, {y})</div>
                            <div className="pin-tooltip-type">
                              {pin.isVisible === false ? '🔍 Waypoint' : '👁️ Visible'}
                            </div>
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
            
            <div className="map-legend">
              <h4>Legend:</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-marker visible"></div>
                  <span>Visible Pin ({pins.filter(p => p.isVisible !== false).length})</span>
                </div>
                <div className="legend-item">
                  <div className="legend-marker waypoint"></div>
                  <span>Waypoint ({pins.filter(p => p.isVisible === false).length})</span>
                </div>
              </div>
              <p className="map-tip"><strong>Tip:</strong> {mapClickMode ? 'Click on the map to set coordinates for the new pin.' : 'Click "Add New Pin" then click on the map to set coordinates.'}</p>
            </div>
          </div>
        )}
        {showMapViewer && !isUSTPCDO && (
          <div className="map-viewer-container">
            <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
              <p>Map view is only available for USTP-CDO campus.</p>
              <p>Please select USTP-CDO from the campus filter to view the map.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Pin Form Modal */}
      {showNewPinForm && (
        <div className="modal-overlay" onClick={() => setShowNewPinForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Pin</h2>
              <button 
                className="close-button"
                onClick={() => setShowNewPinForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreatePin}>
              <div className="form-group">
                <label className="label">ID * (for pathfinding - e.g., 0, 1, 1001, "SL1")</label>
                <input
                  type="text"
                  className="input"
                  value={newPinData.id || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Try to parse as number if it's a valid number, otherwise keep as string
                    const numValue = value === '' ? '' : (isNaN(value) ? value : (value.includes('.') ? parseFloat(value) : parseInt(value, 10)));
                    setNewPinData({...newPinData, id: numValue === '' ? undefined : numValue});
                  }}
                  placeholder="Auto-generated if left empty"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>Leave empty to auto-generate. This ID is used for pathfinding connections.</small>
              </div>

              <div className="form-group">
                <label className="label">Title *</label>
                <input
                  type="text"
                  className="input"
                  value={newPinData.title}
                  onChange={(e) => setNewPinData({...newPinData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={newPinData.description}
                  onChange={(e) => setNewPinData({...newPinData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Category *</label>
                  <select
                    className="input"
                    value={newPinData.category}
                    onChange={(e) => setNewPinData({...newPinData, category: e.target.value})}
                    required
                  >
                    <option value="Academic">Academic</option>
                    <option value="Administration">Administration</option>
                    <option value="Facilities">Facilities</option>
                    <option value="Services">Services</option>
                    <option value="Recreational">Recreational</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Campus *</label>
                  <select
                    className="input"
                    value={newPinData.campusId}
                    onChange={(e) => setNewPinData({...newPinData, campusId: e.target.value})}
                    required
                  >
                    <option value="">Select Campus</option>
                    {campuses.map(campus => (
                      <option key={campus._id} value={campus._id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">X Coordinate *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      className="input"
                      value={newPinData.x}
                      onChange={(e) => setNewPinData({...newPinData, x: parseFloat(e.target.value)})}
                      step="0.01"
                      required
                      readOnly={isUSTPCDO}
                      style={isUSTPCDO ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                    />
                    {isUSTPCDO && (
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => {
                          setMapClickMode(true)
                          setShowNewPinForm(false)
                          setShowMapViewer(true)
                        }}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Click on Map
                      </button>
                    )}
                  </div>
                  {isUSTPCDO && <small style={{ color: '#666', fontSize: '12px' }}>Click "Click on Map" to set coordinates by clicking on the map</small>}
                </div>

                <div className="form-group">
                  <label className="label">Y Coordinate *</label>
                  <input
                    type="number"
                    className="input"
                    value={newPinData.y}
                    onChange={(e) => setNewPinData({...newPinData, y: parseFloat(e.target.value)})}
                    step="0.01"
                    required
                    readOnly={isUSTPCDO}
                    style={isUSTPCDO ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPinData.isVisible}
                    onChange={(e) => setNewPinData({...newPinData, isVisible: e.target.checked})}
                  />
                  <span>Visible on map (uncheck for waypoint)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="button button-success">
                  Create Pin
                </button>
                <button 
                  type="button" 
                  className="button button-secondary"
                  onClick={() => setShowNewPinForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pin Form Modal */}
      {showEditPinForm && editPinData && (
        <div className="modal-overlay" onClick={() => setShowEditPinForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Pin</h2>
              <button 
                className="close-button"
                onClick={() => setShowEditPinForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleUpdatePin(editPinData._id || editPinData.id, editPinData)
              setShowEditPinForm(false)
            }}>
              <div className="form-group">
                <label className="label">ID * (for pathfinding - e.g., 0, 1, 1001, "SL1")</label>
                <input
                  type="text"
                  className="input"
                  value={editPinData.id || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Try to parse as number if it's a valid number, otherwise keep as string
                    const numValue = value === '' ? '' : (isNaN(value) ? value : (value.includes('.') ? parseFloat(value) : parseInt(value, 10)));
                    setEditPinData({...editPinData, id: numValue === '' ? undefined : numValue});
                  }}
                  required
                />
                <small style={{ color: '#666', fontSize: '12px' }}>This ID is used for pathfinding connections (neighbors).</small>
              </div>

              <div className="form-group">
                <label className="label">Title *</label>
                <input
                  type="text"
                  className="input"
                  value={editPinData.title}
                  onChange={(e) => setEditPinData({...editPinData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={editPinData.description || ''}
                  onChange={(e) => setEditPinData({...editPinData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Category *</label>
                  <select
                    className="input"
                    value={editPinData.category}
                    onChange={(e) => setEditPinData({...editPinData, category: e.target.value})}
                    required
                  >
                    <option value="Academic">Academic</option>
                    <option value="Administration">Administration</option>
                    <option value="Facilities">Facilities</option>
                    <option value="Services">Services</option>
                    <option value="Recreational">Recreational</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Campus *</label>
                  <select
                    className="input"
                    value={editPinData.campusId?._id || editPinData.campusId}
                    onChange={(e) => setEditPinData({...editPinData, campusId: e.target.value})}
                    required
                  >
                    {campuses.map(campus => (
                      <option key={campus._id} value={campus._id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">X Coordinate *</label>
                  <input
                    type="number"
                    className="input"
                    value={editPinData.x}
                    onChange={(e) => setEditPinData({...editPinData, x: parseFloat(e.target.value)})}
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Y Coordinate *</label>
                  <input
                    type="number"
                    className="input"
                    value={editPinData.y}
                    onChange={(e) => setEditPinData({...editPinData, y: parseFloat(e.target.value)})}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editPinData.isVisible !== false}
                    onChange={(e) => setEditPinData({...editPinData, isVisible: e.target.checked})}
                  />
                  <span>Visible on map (uncheck for waypoint)</span>
                </label>
              </div>

              {/* Floors and Rooms Management */}
              <div className="form-group">
                <label className="label">Floors & Rooms</label>
                <div style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '15px', backgroundColor: '#f9f9f9' }}>
                  {(editPinData.floors || []).map((floor, floorIndex) => (
                    <div key={floorIndex} style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #ddd' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>Floor {floor.level === 0 ? 'Ground' : floor.level}</strong>
                        <button
                          type="button"
                          className="button button-danger button-small"
                          onClick={() => {
                            const newFloors = [...(editPinData.floors || [])]
                            newFloors.splice(floorIndex, 1)
                            setEditPinData({...editPinData, floors: newFloors})
                          }}
                        >
                          Remove Floor
                        </button>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="label">Floor Level</label>
                          <input
                            type="number"
                            className="input"
                            value={floor.level}
                            onChange={(e) => {
                              const newFloors = [...(editPinData.floors || [])]
                              newFloors[floorIndex].level = parseInt(e.target.value) || 0
                              setEditPinData({...editPinData, floors: newFloors})
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="label">Floor Plan Image URL</label>
                          <input
                            type="text"
                            className="input"
                            value={floor.floorPlan || ''}
                            onChange={(e) => {
                              const newFloors = [...(editPinData.floors || [])]
                              newFloors[floorIndex].floorPlan = e.target.value
                              setEditPinData({...editPinData, floors: newFloors})
                            }}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <label className="label">Rooms</label>
                        {(floor.rooms || []).map((room, roomIndex) => (
                          <div key={roomIndex} style={{ display: 'flex', gap: '5px', marginBottom: '5px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="input"
                              style={{ flex: 1 }}
                              value={room.name || ''}
                              onChange={(e) => {
                                const newFloors = [...(editPinData.floors || [])]
                                newFloors[floorIndex].rooms[roomIndex].name = e.target.value
                                setEditPinData({...editPinData, floors: newFloors})
                              }}
                              placeholder="Room name (e.g., ICT 101)"
                            />
                            <input
                              type="text"
                              className="input"
                              style={{ flex: 1 }}
                              value={room.description || ''}
                              onChange={(e) => {
                                const newFloors = [...(editPinData.floors || [])]
                                newFloors[floorIndex].rooms[roomIndex].description = e.target.value
                                setEditPinData({...editPinData, floors: newFloors})
                              }}
                              placeholder="Description"
                            />
                            <button
                              type="button"
                              className="button button-danger button-small"
                              onClick={() => {
                                const newFloors = [...(editPinData.floors || [])]
                                newFloors[floorIndex].rooms.splice(roomIndex, 1)
                                setEditPinData({...editPinData, floors: newFloors})
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => {
                            const newFloors = [...(editPinData.floors || [])]
                            if (!newFloors[floorIndex].rooms) newFloors[floorIndex].rooms = []
                            newFloors[floorIndex].rooms.push({ name: '', description: '' })
                            setEditPinData({...editPinData, floors: newFloors})
                          }}
                        >
                          + Add Room
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => {
                      const newFloors = [...(editPinData.floors || []), { level: 0, floorPlan: '', rooms: [] }]
                      setEditPinData({...editPinData, floors: newFloors})
                    }}
                  >
                    + Add Floor
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="button button-success">
                  Update Pin
                </button>
                <button 
                  type="button" 
                  className="button button-secondary"
                  onClick={() => setShowEditPinForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Neighbors Manager Modal */}
      {selectedPin && (
        <div className="modal-overlay" onClick={() => setSelectedPin(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Connections: {selectedPin.title || 'Waypoint'}</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="button button-warning"
                  onClick={() => {
                    setPinBeingMoved(selectedPin)
                    setMapClickMode(true)
                    setShowMapViewer(true)
                    setSelectedPin(null)
                    setSuccess('Click on the map to move this pin...')
                    setTimeout(() => setSuccess(''), 3000)
                  }}
                  title="Move this pin to a new location on the map"
                >
                  Move Pin
                </button>
                <button 
                  className="close-button"
                  onClick={() => setSelectedPin(null)}
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Search bar for pin selection */}
            <div style={{ padding: '15px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="label">Search Pins</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by title, category, or ID..."
                  value={pinSelectionSearch}
                  onChange={(e) => setPinSelectionSearch(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">View Mode</label>
                <div className="view-mode-buttons" style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    className={`button button-small ${pinSelectionViewMode === 'all' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => setPinSelectionViewMode('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`button button-small ${pinSelectionViewMode === 'visible' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => setPinSelectionViewMode('visible')}
                  >
                    Visible
                  </button>
                  <button 
                    className={`button button-small ${pinSelectionViewMode === 'waypoints' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => setPinSelectionViewMode('waypoints')}
                  >
                    Waypoints
                  </button>
                </div>
              </div>
            </div>
            
            <div className="neighbors-manager">
              <div className="current-neighbors">
                <h3>Current Connections ({selectedPin.neighbors?.length || 0})</h3>
                <div className="neighbors-list">
                  {selectedPin.neighbors?.map((neighborId, idx) => {
                    // Find neighbor by id field (not _id) - pathfinding uses id
                    const neighborIdStr = String(neighborId)
                    const neighbor = pins.find(p => {
                      // Prioritize pin.id for pathfinding connections
                      const pinId = String(p.id || p._id)
                      return pinId === neighborIdStr
                    })
                    return (
                      <div key={`neighbor-${neighborId}-${idx}`} className="neighbor-item">
                        <span>{neighbor?.title || `Pin ${neighborId}`} (ID: {neighbor?.id || neighborId})</span>
                        <button 
                          className="button button-danger button-small"
                          onClick={async () => {
                            // Filter out the neighbor using string comparison
                            const newNeighbors = selectedPin.neighbors.filter(id => String(id) !== String(neighborId))
                            await handleUpdateNeighbors(selectedPin._id || selectedPin.id, newNeighbors)
                            // Refresh data to get updated neighbors from both pins (bidirectional removal)
                            await fetchData()
                            // Update selectedPin after successful update
                            const updatedPin = pins.find(p => String(p._id || p.id) === String(selectedPin._id || selectedPin.id))
                            if (updatedPin) {
                              setSelectedPin(updatedPin)
                            } else {
                              setSelectedPin({...selectedPin, neighbors: newNeighbors})
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                  {(!selectedPin.neighbors || selectedPin.neighbors.length === 0) && (
                    <p className="no-neighbors">No connections yet</p>
                  )}
                </div>
              </div>

              <div className="available-pins">
                <h3>Available Pins ({filteredPinsForSelection.filter(p => {
                  const pinId = String(p.id || p._id)
                  const selectedId = String(selectedPin.id || selectedPin._id)
                  const isConnected = selectedPin.neighbors?.some(n => String(n) === pinId)
                  return pinId !== selectedId && !isConnected
                }).length})</h3>
                <div className="available-pins-list">
                  {filteredPinsForSelection
                    .filter(p => {
                      // Use pin.id (not _id) for pathfinding connections
                      const pinId = String(p.id || p._id)
                      const selectedId = String(selectedPin.id || selectedPin._id)
                      // Check if already connected (compare as strings using id)
                      const isConnected = selectedPin.neighbors?.some(n => String(n) === pinId)
                      return pinId !== selectedId && !isConnected
                    })
                    .map(pin => (
                      <div key={pin._id || pin.id} className="available-pin-item">
                        <div>
                          <strong>{pin.title || 'Waypoint'}</strong>
                          <span className="pin-type">
                            {pin.isVisible === false ? '🔍' : '👁️'}
                          </span>
                          <small style={{ display: 'block', color: '#666', fontSize: '11px' }}>
                            ID: {pin.id || pin._id}
                          </small>
                        </div>
                        <button 
                          className="button button-success button-small"
                          onClick={async () => {
                            // Use pin.id (not _id) for pathfinding connections
                            const pinId = pin.id || pin._id
                            const newNeighbors = [...(selectedPin.neighbors || []), pinId]
                            await handleUpdateNeighbors(selectedPin._id || selectedPin.id, newNeighbors)
                            // Refresh data to get updated neighbors from both pins (bidirectional connection)
                            await fetchData()
                            // Update selectedPin after successful update
                            const updatedPin = pins.find(p => String(p._id || p.id) === String(selectedPin._id || selectedPin.id))
                            if (updatedPin) {
                              setSelectedPin(updatedPin)
                            } else {
                              setSelectedPin({...selectedPin, neighbors: newNeighbors})
                            }
                          }}
                        >
                          Connect
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PinsManagement

import React, { useState, useEffect } from 'react';
import { pinsAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';

function MediaLibrary() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, buildings
  const [searchQuery, setSearchQuery] = useState(''); // Search query
  const [editingImage, setEditingImage] = useState(null); // { pinId, currentUrl }
  const [newImageUrl, setNewImageUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${baseUrl}/api/admin/pins?limit=1000&includeInvisible=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPins(data.pins || data.data || []);
    } catch (error) {
      console.error('Error fetching pins:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractImages = () => {
    const images = [];
    pins.forEach(pin => {
      // Main pin image
      if (pin.image && typeof pin.image === 'string' && pin.image.startsWith('http')) {
        images.push({
          url: pin.image,
          type: 'pin',
          title: pin.title,
          description: pin.description || '',
          pinId: pin._id || pin.id
        });
      }
      
      // Floor plan images removed - floor plans no longer displayed
      // Room images removed - rooms no longer have individual images
    });
    return images;
  };

  const handleSearch = () => {
    // Search is handled in the filteredImages calculation below
    // This function can be used for additional search logic if needed
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleEditImage = (img) => {
    setEditingImage({ pinId: img.pinId, currentUrl: img.url });
    setNewImageUrl(img.url);
  };

  const handleCancelEdit = () => {
    setEditingImage(null);
    setNewImageUrl('');
  };

  const handleUpdateImageUrl = async () => {
    if (!editingImage || !newImageUrl.trim()) {
      alert('Please enter a valid image URL');
      return;
    }

    // Basic URL validation
    if (!newImageUrl.startsWith('http://') && !newImageUrl.startsWith('https://')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setUpdating(true);
    try {
      await pinsAPI.update(editingImage.pinId, { image: newImageUrl.trim() });
      // Refresh pins data
      await fetchPins();
      setEditingImage(null);
      setNewImageUrl('');
      alert('Image URL updated successfully!');
    } catch (error) {
      console.error('Error updating image URL:', error);
      alert('Failed to update image URL. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  const allImages = extractImages();
  
  // Apply filters and search
  let filteredImages = filter === 'all' 
    ? allImages 
    : allImages.filter(img => img.type === filter);

  // Apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredImages = filteredImages.filter(img =>
      img.title?.toLowerCase().includes(query) ||
      img.description?.toLowerCase().includes(query) ||
      img.type?.toLowerCase().includes(query)
    );
  }

  return (
    <div className="container">
      <h1>Media Library</h1>
      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <p>Centralized view of all building and room photos hosted on Cloudinary.</p>
        </div>
        
        {/* Search and Filter Section */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          marginBottom: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '6px'
        }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
              Search Images
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search by title, description, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="form-group input"
                style={{ flex: 1, margin: 0 }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="btn btn-secondary"
                  style={{ padding: '8px 15px' }}
                  title="Clear search"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleSearch}
                className="btn btn-primary"
                style={{ padding: '8px 20px' }}
              >
                Search
              </button>
            </div>
          </div>
          
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
              Filter by Type
            </label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="form-group select"
              style={{ width: '100%', margin: 0 }}
            >
            <option value="all">All Images</option>
            <option value="pin">Building Images</option>
            </select>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '10px 15px',
          background: '#e9ecef',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Total Images:</strong> {allImages.length} | 
            <strong> Showing:</strong> {filteredImages.length}
            {searchQuery && (
              <span style={{ color: '#28a745', marginLeft: '10px' }}>
                (Filtered by: "{searchQuery}")
              </span>
            )}
          </p>
        </div>
      </div>
      
      <div className="card">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredImages.map((img, idx) => (
            <div key={idx} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <img 
                src={img.url} 
                alt={img.title}
                style={{ 
                  width: '100%', 
                  height: '200px', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/250x200?text=Image+Not+Found';
                }}
              />
              <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: '#2c3e50'
                }}>
                  {img.title}
                </h3>
                {img.description && (
                  <p style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: '13px', 
                    color: '#666',
                    lineHeight: '1.4',
                    flex: 1
                  }}>
                    {img.description}
                  </p>
                )}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#999',
                    textTransform: 'capitalize',
                    padding: '4px 8px',
                    background: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    {img.type}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleEditImage(img)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Edit URL
                    </button>
                    <a 
                      href={img.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      View Full Size
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredImages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#666', fontSize: '16px', marginBottom: '10px' }}>
              {searchQuery 
                ? `No images found matching "${searchQuery}"`
                : 'No images found for the selected filter.'}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="btn btn-secondary"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Image URL Modal */}
      {editingImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
              Edit Image URL
            </h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Image URL
              </label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="form-group input"
                style={{ width: '100%', margin: 0, padding: '10px' }}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                Enter a valid image URL (must start with http:// or https://)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary"
                disabled={updating}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateImageUrl}
                className="btn btn-primary"
                disabled={updating || !newImageUrl.trim()}
                style={{ padding: '10px 20px' }}
              >
                {updating ? 'Updating...' : 'Update URL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaLibrary;

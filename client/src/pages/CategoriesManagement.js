import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

function CategoriesManagement() {
  // Predefined categories - these are the recommended categories
  const [predefinedCategories] = useState([
    { name: 'Commercial Zone', color: '#007bff', icon: '🏪' },
    { name: 'Admin/Operation Zone', color: '#28a745', icon: '🏛️' },
    { name: 'Academic Core Zone', color: '#ffc107', icon: '📚' },
    { name: 'Auxiliary Services Zone', color: '#17a2b8', icon: '🔧' },
    { name: 'Dining', color: '#dc3545', icon: '🍽️' },
    { name: 'Comfort Rooms', color: '#6f42c1', icon: '🚻' },
    { name: 'Research Zones', color: '#e83e8c', icon: '🔬' },
    { name: 'Clinic', color: '#fd7e14', icon: '🏥' },
    { name: 'Parking', color: '#6c757d', icon: '🅿️' },
    { name: 'Security', color: '#343a40', icon: '🛡️' }
  ]);

  const [pins, setPins] = useState([]);
  const [filteredPins, setFilteredPins] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [allCategoriesFromDB, setAllCategoriesFromDB] = useState([]); // All actual categories from DB
  const [loading, setLoading] = useState(true);
  const [editingPin, setEditingPin] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter states
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // all, visible, invisible
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, or specific category name
  const [searchQuery, setSearchQuery] = useState(''); // Search by title/description

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pins, visibilityFilter, categoryFilter, searchQuery]);

  const applyFilters = () => {
    let filtered = [...pins];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(pin =>
        pin.title?.toLowerCase().includes(query) ||
        pin.description?.toLowerCase().includes(query) ||
        (pin.category || '').toLowerCase().includes(query)
      );
    }

    // Filter by visibility
    if (visibilityFilter === 'visible') {
      filtered = filtered.filter(pin => pin.isVisible !== false);
    } else if (visibilityFilter === 'invisible') {
      filtered = filtered.filter(pin => pin.isVisible === false);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Uncategorized') {
        filtered = filtered.filter(pin => !pin.category || pin.category === '');
      } else {
        filtered = filtered.filter(pin => pin.category === categoryFilter);
      }
    }

    setFilteredPins(filtered);
  };

  const fetchCategoryStats = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${baseUrl}/api/admin/pins?limit=1000&includeInvisible=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const allPins = data.pins || data.data || [];
      setPins(allPins);
      
      // Extract ALL unique categories from pins in database
      const categoryMap = new Map();
      
      allPins.forEach(pin => {
        const category = pin.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      
      // Create category list with all categories from DB
      const categoriesFromDB = Array.from(categoryMap.entries())
        .map(([name, count]) => {
          // Check if it's a predefined category
          const predefined = predefinedCategories.find(c => c.name === name);
          
          return {
            name,
            count,
            color: predefined ? predefined.color : generateColorForCategory(name),
            icon: predefined ? predefined.icon : '🏷️',
            isPredefined: !!predefined
          };
        })
        .sort((a, b) => {
          // Sort: predefined first, then alphabetical
          if (a.isPredefined && !b.isPredefined) return -1;
          if (!a.isPredefined && b.isPredefined) return 1;
          return a.name.localeCompare(b.name);
        });
      
      setAllCategoriesFromDB(categoriesFromDB);
      
      // Calculate stats
      const stats = {};
      categoryMap.forEach((count, category) => {
        stats[category] = count;
      });
      
      setCategoryStats(stats);
    } catch (error) {
      console.error('Error fetching category stats:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Generate a consistent color for a category name
  const generateColorForCategory = (categoryName) => {
    const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', 
      '#17a2b8', '#e83e8c', '#fd7e14', '#20c997', '#6c757d',
      '#343a40', '#007bff', '#28a745', '#ffc107', '#dc3545'
    ];
    return colors[hash % colors.length];
  };

  const handleUpdatePinCategory = async (pinId, newCategory) => {
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
        body: JSON.stringify({ category: newCategory || '' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update category');
      }

      setSuccess('Category updated successfully!');
      setEditingPin(null);
      await fetchCategoryStats();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating pin category:', err);
      setError(err.message || 'Failed to update category');
      setTimeout(() => setError(''), 5000);
    }
  };

  const getCategoryInfo = (categoryName) => {
    if (!categoryName) {
      return { color: '#999', icon: '❓', isPredefined: false };
    }
    const category = allCategoriesFromDB.find(c => c.name === categoryName);
    if (category) {
      return { color: category.color, icon: category.icon, isPredefined: category.isPredefined };
    }
    // Fallback
    const predefined = predefinedCategories.find(c => c.name === categoryName);
    if (predefined) {
      return { color: predefined.color, icon: predefined.icon, isPredefined: true };
    }
    return { color: generateColorForCategory(categoryName), icon: '🏷️', isPredefined: false };
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  // Available categories for filter dropdown - ALL categories from DB
  const availableCategories = ['all', ...allCategoriesFromDB.map(c => c.name)];

  // Get all unique category names for the edit dropdown (all from DB + predefined not yet used)
  const allAvailableForEdit = [
    ...allCategoriesFromDB.map(c => c.name),
    ...predefinedCategories
      .filter(pc => !allCategoriesFromDB.find(ac => ac.name === pc.name))
      .map(pc => pc.name)
  ].filter((name, index, self) => self.indexOf(name) === index).sort();

  return (
    <div className="container">
      <h1>Categories Management</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <p>
          Manage the tags used for filtering facilities on the map. 
          Below are ALL categories found in your pins database.
        </p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
          <strong>Total Categories in DB:</strong> {allCategoriesFromDB.length} | 
          <strong> Total Pins:</strong> {pins.length}
        </p>
      </div>

      {/* Categories Overview - Show ALL categories from DB */}
      <div className="card">
        <h2>All Categories from Database</h2>
        <p>These are all categories currently assigned to pins in your database:</p>
        <table className="table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>Category Name</th>
              <th>Status</th>
              <th>Color</th>
              <th>Pins Count</th>
            </tr>
          </thead>
          <tbody>
            {allCategoriesFromDB.map((category) => (
              <tr 
                key={category.name}
                style={!category.isPredefined ? { backgroundColor: '#fff3cd' } : {}}
              >
                <td style={{ fontSize: '24px', textAlign: 'center' }}>{category.icon}</td>
                <td>
                  <strong>{category.name}</strong>
                  {!category.isPredefined && (
                    <div style={{ fontSize: '11px', color: '#856404', fontStyle: 'italic' }}>
                      (Not in predefined list)
                    </div>
                  )}
                </td>
                <td>
                  {category.isPredefined ? (
                    <span style={{
                      padding: '4px 8px',
                      background: '#28a745',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Predefined
                    </span>
                  ) : (
                    <span style={{
                      padding: '4px 8px',
                      background: '#ffc107',
                      color: '#000',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Custom
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ 
                    display: 'inline-block', 
                    width: '30px', 
                    height: '30px', 
                    backgroundColor: category.color,
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}></div>
                  <span style={{ marginLeft: '10px' }}>{category.color}</span>
                </td>
                <td>
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: category.color
                  }}>
                    {category.count}
                  </span>
                </td>
              </tr>
            ))}
            {allCategoriesFromDB.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No categories found in pins
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Predefined Categories Reference */}
      <div className="card">
        <h2>Predefined Categories (Recommended)</h2>
        <p style={{ fontSize: '14px', color: '#666' }}>
          These are the recommended categories. Pins can be assigned to any category, but using predefined ones ensures consistency.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
          {predefinedCategories.map(cat => (
            <span
              key={cat.name}
              style={{
                padding: '6px 12px',
                background: cat.color,
                color: 'white',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {cat.icon} {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h2>Filters</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
            <label>Search Pins</label>
            <input
              type="text"
              placeholder="Search by title, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-group input"
            />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
            <label>Pin Visibility</label>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="form-group select"
            >
              <option value="all">All Pins</option>
              <option value="visible">Visible Pins Only</option>
              <option value="invisible">Invisible Pins (Waypoints) Only</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
            <label>Category Filter</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-group select"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px', paddingTop: '25px' }}>
            <strong>Showing: {filteredPins.length} of {pins.length} pins</strong>
          </div>
        </div>
      </div>

      {/* Pins with Category Editing */}
      <div className="card">
        <h2>Edit Pin Categories</h2>
        <p>
          Click on a pin to change its category. You can assign any category name.
          {searchQuery && ` Search: "${searchQuery}"`}
          {visibilityFilter !== 'all' && ` | Visibility: ${visibilityFilter}`}
          {categoryFilter !== 'all' && ` | Category: ${categoryFilter}`}
        </p>
        {filteredPins.length === 0 ? (
          <p>No pins found matching the current filters.</p>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Pin Title</th>
                  <th>Visibility</th>
                  <th>Current Category</th>
                  <th>New Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPins.map(pin => {
                  const pinId = pin._id || pin.id;
                  const isEditing = editingPin === pinId;
                  const categoryInfo = getCategoryInfo(pin.category);
                  
                  return (
                    <tr key={pinId}>
                      <td>
                        <strong>{pin.title}</strong>
                        {pin.description && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            {pin.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          background: pin.isVisible === false ? '#ff9800' : '#28a745',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {pin.isVisible === false ? 'Waypoint' : 'Visible'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          background: categoryInfo.color,
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {pin.category || 'Uncategorized'}
                        </span>
                        {!categoryInfo.isPredefined && pin.category && (
                          <div style={{ fontSize: '11px', color: '#856404', marginTop: '4px' }}>
                            (Custom)
                          </div>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div>
                            <select
                              defaultValue={pin.category || ''}
                              onChange={(e) => {
                                handleUpdatePinCategory(pinId, e.target.value);
                              }}
                              className="form-group select"
                              style={{ width: '100%', margin: 0, marginBottom: '5px' }}
                            >
                              <option value="">Uncategorized</option>
                              {allAvailableForEdit.map(cat => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Or type a new category name..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  handleUpdatePinCategory(pinId, e.target.value.trim());
                                }
                              }}
                              className="form-group input"
                              style={{ width: '100%', margin: 0, fontSize: '12px' }}
                            />
                            <small style={{ fontSize: '11px', color: '#666' }}>
                              Select from list or type a new category name and press Enter
                            </small>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingPin(pinId)}
                            className="btn btn-primary"
                          >
                            Edit Category
                          </button>
                        )}
                      </td>
                      <td>
                        {isEditing && (
                          <button
                            onClick={() => setEditingPin(null)}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoriesManagement;

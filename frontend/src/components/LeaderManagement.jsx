import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

function LeaderManagement() {
  const [leaders, setLeaders] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    SmallGroupID: ''
  });

  // Fetch leaders and groups
  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadersRes, groupsRes] = await Promise.all([
        fetch(`${API_URL}/leaders`),
        fetch(`${API_URL}/small-groups`)
      ]);

      const leadersData = await leadersRes.json();
      const groupsData = await groupsRes.json();

      setLeaders(leadersData);
      setGroups(groupsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    try {
      const url = editingLeader ? `${API_URL}/leaders/${editingLeader.Id}` : `${API_URL}/leaders`;
      const method = editingLeader ? 'PUT' : 'POST';

      const payload = {
        FirstName: formData.FirstName,
        LastName: formData.LastName,
        SmallGroupID: formData.SmallGroupID ? parseInt(formData.SmallGroupID) : null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save leader');

      const savedLeader = await response.json();
      setSuccessMessage(`${savedLeader.FirstName} ${savedLeader.LastName} ${editingLeader ? 'updated' : 'added'} successfully!`);

      setFormData({ FirstName: '', LastName: '', SmallGroupID: '' });
      setEditingLeader(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (leader) => {
    setEditingLeader(leader);
    setFormData({
      FirstName: leader.FirstName,
      LastName: leader.LastName || '',
      SmallGroupID: leader.SmallGroupID || ''
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage('');
  };

  const handleDelete = async (leader) => {
    if (!window.confirm(`Delete ${leader.FirstName} ${leader.LastName}?`)) return;

    try {
      const response = await fetch(`${API_URL}/leaders/${leader.Id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete leader');

      setSuccessMessage(`${leader.FirstName} ${leader.LastName} deleted successfully!`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLeader(null);
    setFormData({ FirstName: '', LastName: '', SmallGroupID: '' });
    setError(null);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>🎓 Leader Management</h2>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            ➕ Add New Leader
          </button>
        )}
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingLeader ? 'Edit Leader' : 'Add New Leader'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="FirstName"
                  value={formData.FirstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="LastName"
                  value={formData.LastName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Assigned Small Group</label>
                <select name="SmallGroupID" value={formData.SmallGroupID} onChange={handleInputChange}>
                  <option value="">Unassigned</option>
                  {groups.map(group => (
                    <option key={group.Id} value={group.Id}>{group.Grade} Grade</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingLeader ? '💾 Save Changes' : '➕ Add Leader'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>✖ Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Leaders Table */}
      {loading ? (
        <p className="loading-text">Loading leaders...</p>
      ) : leaders.length === 0 ? (
        <p className="no-data">No leaders found. Add your first leader above!</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Assigned Group</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, index) => (
                <tr key={leader.Id}>
                  <td className="row-number">{index + 1}</td>
                  <td>{leader.FirstName} {leader.LastName}</td>
                  <td>
                    {leader.Grade ? (
                      <span className="badge">{leader.Grade} Grade</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" onClick={() => handleEdit(leader)} title="Edit leader">
                        ✏️
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(leader)} title="Delete leader">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-footer">Total: {leaders.length} leader{leaders.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

export default LeaderManagement;

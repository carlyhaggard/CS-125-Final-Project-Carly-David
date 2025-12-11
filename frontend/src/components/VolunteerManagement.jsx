import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

function VolunteerManagement() {
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    Email: '',
    Phone: ''
  });

  // Assignment state
  const [assigningVolunteer, setAssigningVolunteer] = useState(null);
  const [selectedEventIds, setSelectedEventIds] = useState([]);

  // Fetch volunteers and events
  const fetchData = async () => {
    try {
      setLoading(true);
      const [volunteersRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/volunteers`),
        fetch(`${API_URL}/events`)
      ]);

      const volunteersData = await volunteersRes.json();
      const eventsData = await eventsRes.json();

      setVolunteers(volunteersData);
      setEvents(eventsData);
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
      const url = editingVolunteer ? `${API_URL}/volunteers/${editingVolunteer.Id}` : `${API_URL}/volunteers`;
      const method = editingVolunteer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save volunteer');

      const savedVolunteer = await response.json();
      setSuccessMessage(`${savedVolunteer.FirstName} ${savedVolunteer.LastName} ${editingVolunteer ? 'updated' : 'added'} successfully!`);

      setFormData({ FirstName: '', LastName: '', Email: '', Phone: '' });
      setEditingVolunteer(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      FirstName: volunteer.FirstName,
      LastName: volunteer.LastName || '',
      Email: volunteer.Email || '',
      Phone: volunteer.Phone
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage('');
  };

  const handleDelete = async (volunteer) => {
    if (!window.confirm(`Delete ${volunteer.FirstName} ${volunteer.LastName}? This will remove all event assignments.`)) return;

    try {
      const response = await fetch(`${API_URL}/volunteers/${volunteer.Id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete volunteer');

      setSuccessMessage(`${volunteer.FirstName} ${volunteer.LastName} deleted successfully!`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVolunteer(null);
    setFormData({ FirstName: '', LastName: '', Email: '', Phone: '' });
    setError(null);
  };

  const startAssigning = async (volunteer) => {
    setAssigningVolunteer(volunteer);

    // Fetch volunteer's current events
    try {
      const response = await fetch(`${API_URL}/volunteers/${volunteer.Id}`);
      const data = await response.json();
      setSelectedEventIds(data.events?.map(e => e.Id) || []);
    } catch (err) {
      setError('Failed to load volunteer details');
    }
  };

  const toggleEventAssignment = async (eventId) => {
    const isAssigned = selectedEventIds.includes(eventId);

    try {
      if (isAssigned) {
        // Unassign
        await fetch(`${API_URL}/volunteers/assign/${assigningVolunteer.Id}/${eventId}`, { method: 'DELETE' });
        setSelectedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        // Assign
        await fetch(`${API_URL}/volunteers/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ VolunteerID: assigningVolunteer.Id, EventID: eventId })
        });
        setSelectedEventIds(prev => [...prev, eventId]);
      }
      setSuccessMessage(`Event ${isAssigned ? 'removed' : 'assigned'}!`);
    } catch (err) {
      setError('Failed to update assignment');
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>🤝 Volunteer Management</h2>
        {!showForm && !assigningVolunteer && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            ➕ Add New Volunteer
          </button>
        )}
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingVolunteer ? 'Edit Volunteer' : 'Add New Volunteer'}</h3>
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
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="Email"
                  value={formData.Email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  name="Phone"
                  value={formData.Phone}
                  onChange={handleInputChange}
                  required
                  placeholder="1234567890"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingVolunteer ? '💾 Save Changes' : '➕ Add Volunteer'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>✖ Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Events Modal */}
      {assigningVolunteer && (
        <div className="form-card">
          <h3>Assign Events to {assigningVolunteer.FirstName} {assigningVolunteer.LastName}</h3>
          <p className="help-text">Select events to assign to this volunteer:</p>
          <div className="student-checkbox-list">
            {events.map(event => (
              <label key={event.Id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedEventIds.includes(event.Id)}
                  onChange={() => toggleEventAssignment(event.Id)}
                />
                {event.Description} - {event.Address}
              </label>
            ))}
            {events.length === 0 && (
              <p className="no-data">No events available</p>
            )}
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setAssigningVolunteer(null)}>✔ Done</button>
          </div>
        </div>
      )}

      {/* Volunteers Table */}
      {loading ? (
        <p className="loading-text">Loading volunteers...</p>
      ) : volunteers.length === 0 ? (
        <p className="no-data">No volunteers found. Add your first volunteer above!</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((volunteer, index) => (
                <tr key={volunteer.Id}>
                  <td className="row-number">{index + 1}</td>
                  <td>{volunteer.FirstName} {volunteer.LastName}</td>
                  <td>{volunteer.Email || '—'}</td>
                  <td>{volunteer.Phone}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-link" onClick={() => startAssigning(volunteer)} title="Assign to events">
                        📅
                      </button>
                      <button className="btn-edit" onClick={() => handleEdit(volunteer)} title="Edit volunteer">
                        ✏️
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(volunteer)} title="Delete volunteer">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-footer">Total: {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

export default VolunteerManagement;

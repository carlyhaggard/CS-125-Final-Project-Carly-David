import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

function ParentManagement() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    Relationship: 'Parent',
    Email: '',
    Phone: ''
  });

  // Link state
  const [linkingParent, setLinkingParent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Fetch parents and students
  const fetchData = async () => {
    try {
      setLoading(true);
      const [parentsRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/parents`),
        fetch(`${API_URL}/students`)
      ]);

      const parentsData = await parentsRes.json();
      const studentsData = await studentsRes.json();

      setParents(parentsData);
      setStudents(studentsData);
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
      const url = editingParent ? `${API_URL}/parents/${editingParent.Id}` : `${API_URL}/parents`;
      const method = editingParent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save parent');

      const savedParent = await response.json();
      setSuccessMessage(`${savedParent.FirstName} ${savedParent.LastName} ${editingParent ? 'updated' : 'added'} successfully!`);

      setFormData({ FirstName: '', LastName: '', Relationship: 'Parent', Email: '', Phone: '' });
      setEditingParent(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setFormData({
      FirstName: parent.FirstName,
      LastName: parent.LastName || '',
      Relationship: parent.Relationship,
      Email: parent.Email || '',
      Phone: parent.Phone
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage('');
  };

  const handleDelete = async (parent) => {
    if (!window.confirm(`Delete ${parent.FirstName} ${parent.LastName}? This will remove all family links.`)) return;

    try {
      const response = await fetch(`${API_URL}/parents/${parent.Id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete parent');

      setSuccessMessage(`${parent.FirstName} ${parent.LastName} deleted successfully!`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingParent(null);
    setFormData({ FirstName: '', LastName: '', Relationship: 'Parent', Email: '', Phone: '' });
    setError(null);
  };

  const startLinking = async (parent) => {
    setLinkingParent(parent);

    // Fetch parent's current students
    try {
      const response = await fetch(`${API_URL}/parents/${parent.Id}`);
      const data = await response.json();
      setSelectedStudentIds(data.students?.map(s => s.Id) || []);
    } catch (err) {
      setError('Failed to load parent details');
    }
  };

  const toggleStudentLink = async (studentId) => {
    const isLinked = selectedStudentIds.includes(studentId);

    try {
      if (isLinked) {
        // Unlink
        await fetch(`${API_URL}/family/${studentId}/${linkingParent.Id}`, { method: 'DELETE' });
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
      } else {
        // Link
        await fetch(`${API_URL}/family`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ StudentID: studentId, ParentID: linkingParent.Id })
        });
        setSelectedStudentIds(prev => [...prev, studentId]);
      }
      setSuccessMessage(`Student link ${isLinked ? 'removed' : 'added'}!`);
    } catch (err) {
      setError('Failed to update link');
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>👨‍👩‍👧 Parent/Guardian Management</h2>
        {!showForm && !linkingParent && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            ➕ Add New Parent
          </button>
        )}
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingParent ? 'Edit Parent' : 'Add New Parent'}</h3>
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
                <label>Relationship *</label>
                <select name="Relationship" value={formData.Relationship} onChange={handleInputChange} required>
                  <option value="Parent">Parent</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other</option>
                </select>
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
                {editingParent ? '💾 Save Changes' : '➕ Add Parent'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>✖ Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Link Students Modal */}
      {linkingParent && (
        <div className="form-card">
          <h3>Link Students to {linkingParent.FirstName} {linkingParent.LastName}</h3>
          <p className="help-text">Select students to link to this parent:</p>
          <div className="student-checkbox-list">
            {students.map(student => (
              <label key={student.Id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(student.Id)}
                  onChange={() => toggleStudentLink(student.Id)}
                />
                {student.FirstName} {student.LastName} ({student.Grade})
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setLinkingParent(null)}>✔ Done</button>
          </div>
        </div>
      )}

      {/* Parents Table */}
      {loading ? (
        <p className="loading-text">Loading parents...</p>
      ) : parents.length === 0 ? (
        <p className="no-data">No parents found. Add your first parent above!</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Relationship</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((parent, index) => (
                <tr key={parent.Id}>
                  <td className="row-number">{index + 1}</td>
                  <td>{parent.FirstName} {parent.LastName}</td>
                  <td><span className="badge">{parent.Relationship}</span></td>
                  <td>{parent.Email || '—'}</td>
                  <td>{parent.Phone}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-link" onClick={() => startLinking(parent)} title="Link to students">
                        🔗
                      </button>
                      <button className="btn-edit" onClick={() => handleEdit(parent)} title="Edit parent">
                        ✏️
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(parent)} title="Delete parent">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-footer">Total: {parents.length} parent{parents.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

export default ParentManagement;

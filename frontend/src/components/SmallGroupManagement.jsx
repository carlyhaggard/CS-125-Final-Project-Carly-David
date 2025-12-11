import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

const GRADES = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

function SmallGroupManagement() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    Grade: '9th'
  });

  // Assignment state
  const [assigningGroup, setAssigningGroup] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Fetch groups and students
  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/small-groups`),
        fetch(`${API_URL}/students`)
      ]);

      const groupsData = await groupsRes.json();
      const studentsData = await studentsRes.json();

      setGroups(groupsData);
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
      const url = editingGroup ? `${API_URL}/small-groups/${editingGroup.Id}` : `${API_URL}/small-groups`;
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save small group');

      const savedGroup = await response.json();
      setSuccessMessage(`Small Group for ${savedGroup.Grade} Grade ${editingGroup ? 'updated' : 'created'} successfully!`);

      setFormData({ Grade: '9th' });
      setEditingGroup(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      Grade: group.Grade
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage('');
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`Delete ${group.Grade} Grade Small Group? This will remove all student assignments.`)) return;

    try {
      const response = await fetch(`${API_URL}/small-groups/${group.Id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete small group');

      setSuccessMessage(`${group.Grade} Grade Small Group deleted successfully!`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData({ Grade: '9th' });
    setError(null);
  };

  const startAssigning = async (group) => {
    setAssigningGroup(group);

    // Fetch group's current students
    try {
      const response = await fetch(`${API_URL}/small-groups/${group.Id}`);
      const data = await response.json();
      setSelectedStudentIds(data.students?.map(s => s.Id) || []);
    } catch (err) {
      setError('Failed to load group details');
    }
  };

  const toggleStudentAssignment = async (studentId) => {
    const isAssigned = selectedStudentIds.includes(studentId);

    try {
      if (isAssigned) {
        // Unassign
        await fetch(`${API_URL}/small-groups/assign/${studentId}/${assigningGroup.Id}`, { method: 'DELETE' });
        setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
      } else {
        // Assign
        await fetch(`${API_URL}/small-groups/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ StudentID: studentId, SmallGroupID: assigningGroup.Id })
        });
        setSelectedStudentIds(prev => [...prev, studentId]);
      }
      setSuccessMessage(`Student ${isAssigned ? 'removed from' : 'assigned to'} group!`);
    } catch (err) {
      setError('Failed to update assignment');
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>👥 Small Group Management</h2>
        {!showForm && !assigningGroup && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            ➕ Add New Small Group
          </button>
        )}
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingGroup ? 'Edit Small Group' : 'Create New Small Group'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Grade *</label>
                <select name="Grade" value={formData.Grade} onChange={handleInputChange} required>
                  {GRADES.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingGroup ? '💾 Save Changes' : '➕ Create Group'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>✖ Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Students Modal */}
      {assigningGroup && (
        <div className="form-card">
          <h3>Assign Students to {assigningGroup.Grade} Grade Small Group</h3>
          <p className="help-text">Select students to assign to this group:</p>
          <div className="student-checkbox-list">
            {students
              .filter(s => s.Grade === assigningGroup.Grade)
              .map(student => (
                <label key={student.Id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.Id)}
                    onChange={() => toggleStudentAssignment(student.Id)}
                  />
                  {student.FirstName} {student.LastName} ({student.Grade})
                </label>
              ))}
            {students.filter(s => s.Grade === assigningGroup.Grade).length === 0 && (
              <p className="no-data">No students available for this grade</p>
            )}
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setAssigningGroup(null)}>✔ Done</button>
          </div>
        </div>
      )}

      {/* Groups Table */}
      {loading ? (
        <p className="loading-text">Loading small groups...</p>
      ) : groups.length === 0 ? (
        <p className="no-data">No small groups found. Create your first group above!</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Grade</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <tr key={group.Id}>
                  <td className="row-number">{index + 1}</td>
                  <td><span className="badge">{group.Grade} Grade</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-link" onClick={() => startAssigning(group)} title="Assign students">
                        👥
                      </button>
                      <button className="btn-edit" onClick={() => handleEdit(group)} title="Edit group">
                        ✏️
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(group)} title="Delete group">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-footer">Total: {groups.length} small group{groups.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

export default SmallGroupManagement;

import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

const GRADES = ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    Grade: '9th'
  });

  // Fetch all students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/students`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Create or update student
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    try {
      const url = editingStudent
        ? `${API_URL}/students/${editingStudent.Id}`
        : `${API_URL}/students`;

      const method = editingStudent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to save student');
      }

      const savedStudent = await response.json();

      if (editingStudent) {
        setSuccessMessage(`${savedStudent.FirstName} ${savedStudent.LastName} updated successfully!`);
      } else {
        setSuccessMessage(`${savedStudent.FirstName} ${savedStudent.LastName} added successfully!`);
      }

      // Reset form and refresh list
      setFormData({ FirstName: '', LastName: '', Grade: '9th' });
      setEditingStudent(null);
      setShowForm(false);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  // Start editing a student
  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      FirstName: student.FirstName,
      LastName: student.LastName || '',
      Grade: student.Grade
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage('');
  };

  // Delete a student
  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.FirstName} ${student.LastName}? This will remove all their registrations and group memberships.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/students/${student.Id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete student');
      }

      setSuccessMessage(`${student.FirstName} ${student.LastName} deleted successfully!`);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({ FirstName: '', LastName: '', Grade: '9th' });
    setError(null);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>👨‍🎓 Student Management</h2>
        {!showForm && (
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            ➕ Add New Student
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="FirstName">First Name *</label>
                <input
                  type="text"
                  id="FirstName"
                  name="FirstName"
                  value={formData.FirstName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="LastName">Last Name</label>
                <input
                  type="text"
                  id="LastName"
                  name="LastName"
                  value={formData.LastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="Grade">Grade *</label>
                <select
                  id="Grade"
                  name="Grade"
                  value={formData.Grade}
                  onChange={handleInputChange}
                  required
                >
                  {GRADES.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingStudent ? '💾 Save Changes' : '➕ Add Student'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                ✖ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Table */}
      {loading ? (
        <p className="loading-text">Loading students...</p>
      ) : students.length === 0 ? (
        <p className="no-data">No students found. Add your first student above!</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Grade</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.Id}>
                  <td className="row-number">{index + 1}</td>
                  <td>{student.FirstName}</td>
                  <td>{student.LastName || '—'}</td>
                  <td><span className="badge">{student.Grade}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(student)}
                        title="Edit student"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(student)}
                        title="Delete student"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-footer">Total: {students.length} student{students.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

export default StudentManagement;

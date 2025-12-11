import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              students {
                id
                firstName
                lastName
                grade
              }
            }
          `
        }),
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0].message);
      } else {
        setStudents(data.data.students);
      }
    } catch (err) {
      setError('Failed to fetch students: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="panel">
        <h2>Student Directory</h2>
        <p className="loading">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h2>Student Directory</h2>
        <p className="status-message error">{error}</p>
        <button onClick={fetchStudents}>Retry</button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Student Directory ({students.length} students)</h2>

      {/* Search Bar */}
      <div className="form-group">
        <input
          type="text"
          placeholder="🔍 Search students by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Student List */}
      <div className="student-grid">
        {filteredStudents.length === 0 ? (
          <p className="no-results">No students found</p>
        ) : (
          filteredStudents.map(student => (
            <div key={student.id} className="student-card">
              <div className="student-avatar">
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
              <div className="student-info">
                <h3>{student.firstName} {student.lastName}</h3>
                <p className="student-grade">Grade: {student.grade}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="graphql-badge">
        ⚡ Powered by GraphQL
      </div>
    </div>
  );
}

export default StudentList;

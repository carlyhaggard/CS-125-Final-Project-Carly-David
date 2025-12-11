import React, { useState } from 'react';

const EXAMPLE_QUERIES = {
  students: `query GetAllStudents {
  students {
    id
    firstName
    lastName
    grade
  }
}`,
  events: `query GetAllEvents {
  events {
    id
    description
    address
  }
}`,
  completeEvent: `query GetCompleteEvent($eventId: Int!) {
  event(id: $eventId) {
    description
    address
    eventType {
      name
      customFields {
        name
        type
        required
      }
    }
    customData
    registrations {
      student {
        firstName
        lastName
        grade
      }
    }
    liveAttendance {
      checkedInCount
      students {
        studentId
        checkInTime
      }
    }
  }
}`,
  studentProfile: `query GetStudentProfile($studentId: Int!) {
  student(id: $studentId) {
    firstName
    lastName
    grade
    parents {
      firstName
      lastName
      email
      phone
    }
    registeredEvents {
      description
      address
    }
  }
}`
};

const EXAMPLE_VARIABLES = {
  completeEvent: '{\n  "eventId": 1\n}',
  studentProfile: '{\n  "studentId": 1\n}'
};

function GraphQLDemo() {
  const [selectedQuery, setSelectedQuery] = useState('students');
  const [query, setQuery] = useState(EXAMPLE_QUERIES.students);
  const [variables, setVariables] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuerySelect = (queryName) => {
    setSelectedQuery(queryName);
    setQuery(EXAMPLE_QUERIES[queryName]);
    setVariables(EXAMPLE_VARIABLES[queryName] || '');
    setResult(null);
    setError(null);
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = {
        query: query
      };

      // Add variables if provided
      if (variables.trim()) {
        try {
          body.variables = JSON.parse(variables);
        } catch (e) {
          setError('Invalid JSON in variables: ' + e.message);
          setLoading(false);
          return;
        }
      }

      const response = await fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors.map(e => e.message).join('\n'));
      } else {
        setResult(data.data);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel graphql-demo">
      <h2>🚀 GraphQL Demo</h2>
      <p className="graphql-description">
        Test multi-database queries! Each query below fetches data from MySQL, MongoDB, and/or Redis in a single request.
      </p>

      {/* Query Selector */}
      <div className="query-selector">
        <label>Select Example Query:</label>
        <div className="query-buttons">
          <button
            className={selectedQuery === 'students' ? 'active' : ''}
            onClick={() => handleQuerySelect('students')}
          >
            All Students
          </button>
          <button
            className={selectedQuery === 'events' ? 'active' : ''}
            onClick={() => handleQuerySelect('events')}
          >
            All Events
          </button>
          <button
            className={selectedQuery === 'completeEvent' ? 'active' : ''}
            onClick={() => handleQuerySelect('completeEvent')}
          >
            Complete Event 🔥
          </button>
          <button
            className={selectedQuery === 'studentProfile' ? 'active' : ''}
            onClick={() => handleQuerySelect('studentProfile')}
          >
            Student Profile
          </button>
        </div>
      </div>

      {/* Query Editor */}
      <div className="form-group">
        <label htmlFor="graphql-query">Query:</label>
        <textarea
          id="graphql-query"
          className="graphql-editor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={12}
        />
      </div>

      {/* Variables Editor */}
      {(selectedQuery === 'completeEvent' || selectedQuery === 'studentProfile') && (
        <div className="form-group">
          <label htmlFor="graphql-variables">Variables (JSON):</label>
          <textarea
            id="graphql-variables"
            className="graphql-editor variables"
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            rows={3}
            placeholder='{"eventId": 1}'
          />
        </div>
      )}

      {/* Execute Button */}
      <button
        className="execute-button"
        onClick={executeQuery}
        disabled={loading}
      >
        {loading ? '⏳ Executing...' : '▶ Execute Query'}
      </button>

      {/* Results */}
      {error && (
        <div className="status-message error">
          <strong>Error:</strong><br />
          <pre>{error}</pre>
        </div>
      )}

      {result && (
        <div className="graphql-result">
          <h3>✅ Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Info Box */}
      <div className="graphql-info">
        <strong>💡 Tip:</strong> The "Complete Event" query fetches data from all three databases:
        <ul>
          <li><strong>MySQL:</strong> Event details, registrations</li>
          <li><strong>MongoDB:</strong> Event type schema, custom fields</li>
          <li><strong>Redis:</strong> Live attendance data</li>
        </ul>
        <p>Try it in GraphiQL: <a href="http://localhost:8000/graphql" target="_blank" rel="noopener noreferrer">http://localhost:8000/graphql</a></p>
      </div>
    </div>
  );
}

export default GraphQLDemo;

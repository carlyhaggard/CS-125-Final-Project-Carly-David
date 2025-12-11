import React, { useState } from 'react';

// Helper to render a single value (primitive or nested object)
function ValueCell({ value }) {
  if (value === null || value === undefined) {
    return <span className="cell-null">—</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="cell-boolean">{value ? '✓' : '✗'}</span>;
  }

  if (typeof value === 'number') {
    return <span className="cell-number">{value}</span>;
  }

  if (typeof value === 'string') {
    return <span className="cell-string">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="cell-empty">—</span>;
    }
    // If array of primitives, show as comma-separated
    if (typeof value[0] !== 'object') {
      return <span className="cell-array">{value.join(', ')}</span>;
    }
    // If array of objects, show count
    return <span className="cell-array">{value.length} items</span>;
  }

  if (typeof value === 'object') {
    // For nested objects, show a summary
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return <span className="cell-empty">—</span>;
    }
    // Show the object's values inline
    return (
      <div className="nested-object">
        {keys.map(key => (
          <div key={key} className="nested-row">
            <strong>{key}:</strong> <ValueCell value={value[key]} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

// Component to render an array as a table
function TableRenderer({ data, title }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="no-data">No data to display</p>;
  }

  // Get all unique keys from all objects in the array
  const allKeys = new Set();
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });

  const columns = Array.from(allKeys);

  // If items aren't objects, just show them in a single column
  if (columns.length === 0) {
    return (
      <div className="table-container">
        {title && <h4 className="table-title">{title}</h4>}
        <table className="result-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td className="row-number">{index + 1}</td>
                <td><ValueCell value={item} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      {title && <h4 className="table-title">{title}</h4>}
      <table className="result-table">
        <thead>
          <tr>
            <th className="row-number-header">#</th>
            {columns.map(col => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td className="row-number">{index + 1}</td>
              {columns.map(col => (
                <td key={col}>
                  <ValueCell value={item[col]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main renderer that decides how to display the data
function ResultRenderer({ data }) {
  if (!data) {
    return <p className="no-data">No results</p>;
  }

  // Get the root keys
  const rootKeys = Object.keys(data);

  return (
    <div className="results-container">
      {rootKeys.map(key => {
        const value = data[key];

        // If it's an array, render as table
        if (Array.isArray(value)) {
          return <TableRenderer key={key} data={value} title={key} />;
        }

        // If it's a single object, show it as a card
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key} className="result-card">
              <h4 className="card-title">{key}</h4>
              <div className="card-content">
                {Object.keys(value).map(subKey => {
                  const subValue = value[subKey];

                  // If nested value is an array, show as table
                  if (Array.isArray(subValue)) {
                    return <TableRenderer key={subKey} data={subValue} title={subKey} />;
                  }

                  // Otherwise show as key-value pair
                  return (
                    <div key={subKey} className="card-row">
                      <strong>{subKey}:</strong> <ValueCell value={subValue} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // For primitives, show as simple key-value
        return (
          <div key={key} className="result-card">
            <strong>{key}:</strong> <ValueCell value={value} />
          </div>
        );
      })}
    </div>
  );
}

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
          <div className="result-formatted">
            <ResultRenderer data={result} />
          </div>
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

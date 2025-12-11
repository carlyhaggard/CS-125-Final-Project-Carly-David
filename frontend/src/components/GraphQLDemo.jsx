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
    return <p className="text-sm text-gray-500 dark:text-gray-400">No data to display</p>;
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
      <div className="mb-4">
        {title && <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>}
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">#</th>
              <th scope="col" className="px-6 py-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{index + 1}</td>
                <td className="px-6 py-4"><ValueCell value={item} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {title && <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>}
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">#</th>
            {columns.map(col => (
              <th key={col} scope="col" className="px-6 py-3">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{index + 1}</td>
              {columns.map(col => (
                <td key={col} className="px-6 py-4">
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
    return <p className="text-sm text-gray-500 dark:text-gray-400">No results</p>;
  }

  // Get the root keys
  const rootKeys = Object.keys(data);

  return (
    <div className="space-y-4">
      {rootKeys.map(key => {
        const value = data[key];

        // If it's an array, render as table
        if (Array.isArray(value)) {
          return <TableRenderer key={key} data={value} title={key} />;
        }

        // If it's a single object, show it as a card
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">{key}</h4>
              <div className="space-y-2">
                {Object.keys(value).map(subKey => {
                  const subValue = value[subKey];

                  // If nested value is an array, show as table
                  if (Array.isArray(subValue)) {
                    return <TableRenderer key={subKey} data={subValue} title={subKey} />;
                  }

                  // Otherwise show as key-value pair
                  return (
                    <div key={subKey} className="flex gap-2 text-sm">
                      <strong className="text-gray-900 dark:text-white">{subKey}:</strong>
                      <span className="text-gray-700 dark:text-gray-300"><ValueCell value={subValue} /></span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // For primitives, show as simple key-value
        return (
          <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex gap-2 text-sm">
            <strong className="text-gray-900 dark:text-white">{key}:</strong>
            <span className="text-gray-700 dark:text-gray-300"><ValueCell value={value} /></span>
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
  eventDetails: `query GetEventDetails($eventId: Int!) {
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
  eventDetails: '{\n  "eventId": 1\n}',
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
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header Card */}
      <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <h2 className="text-xl font-bold">GraphQL Demo</h2>
        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          Test multi-database queries! Each query below fetches data from MySQL, MongoDB, and/or Redis in a single request.
        </p>
      </div>

      {/* Query Selector Card */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
          Select Example Query:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className={selectedQuery === 'students'
              ? 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800'
              : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none dark:focus:ring-blue-800'}
            onClick={() => handleQuerySelect('students')}
          >
            All Students
          </button>
          <button
            className={selectedQuery === 'events'
              ? 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800'
              : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none dark:focus:ring-blue-800'}
            onClick={() => handleQuerySelect('events')}
          >
            All Events
          </button>
          <button
            className={selectedQuery === 'eventDetails'
              ? 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800'
              : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none dark:focus:ring-blue-800'}
            onClick={() => handleQuerySelect('eventDetails')}
          >
            Event Details
          </button>
          <button
            className={selectedQuery === 'studentProfile'
              ? 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800'
              : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 focus:outline-none dark:focus:ring-blue-800'}
            onClick={() => handleQuerySelect('studentProfile')}
          >
            Student Profile
          </button>
        </div>
      </div>

      {/* Query Editor Card */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <label htmlFor="graphql-query" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Query:
        </label>
        <textarea
          id="graphql-query"
          className="block w-full p-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white font-mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={12}
        />
      </div>

      {/* Variables Editor */}
      {(selectedQuery === 'eventDetails' || selectedQuery === 'studentProfile') && (
        <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <label htmlFor="graphql-variables" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Variables (JSON):
          </label>
          <textarea
            id="graphql-variables"
            className="block w-full p-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white font-mono"
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            rows={3}
            placeholder='{"eventId": 1}'
          />
        </div>
      )}

      {/* Execute Button */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <button
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={executeQuery}
          disabled={loading}
        >
          {loading ? 'Executing...' : 'Execute Query'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-700 dark:text-red-400" role="alert">
            <strong className="font-bold">Error:</strong>
            <pre className="mt-2 text-xs whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Result:</h3>
          <div className="result-formatted">
            <ResultRenderer data={result} />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-5 bg-blue-50 dark:bg-gray-700 border-t dark:border-gray-600">
        <p className="text-sm text-gray-900 dark:text-white mb-2">
          <strong>Tip:</strong> The "Event Details" query fetches data from all three databases:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>MySQL:</strong> Event details, registrations</li>
          <li><strong>MongoDB:</strong> Event type schema, custom fields</li>
          <li><strong>Redis:</strong> Live attendance data</li>
        </ul>
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          Try it in GraphiQL: <a href="http://localhost:8000/graphql" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">http://localhost:8000/graphql</a>
        </p>
      </div>
    </div>
  );
}

export default GraphQLDemo;

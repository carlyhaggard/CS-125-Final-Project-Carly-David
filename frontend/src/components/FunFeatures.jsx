import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

function FunFeatures() {
  const [topEvents, setTopEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [randomWinner, setRandomWinner] = useState(null);
  const [fullSummary, setFullSummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardMonth, setLeaderboardMonth] = useState('2024-12');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch top events and all events on load
  useEffect(() => {
    fetchTopEvents();
    fetchEvents();
  }, []);

  const fetchTopEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events/top-attended`);
      if (!response.ok) throw new Error('Failed to fetch top events');
      const data = await response.json();
      setTopEvents(data);
    } catch (err) {
      console.error('Error fetching top events:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].Id.toString());
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handleRandomWinner = async () => {
    if (!selectedEventId) return;

    setLoading(true);
    setError(null);
    setRandomWinner(null);

    try {
      const response = await fetch(`${API_URL}/redis/events/${selectedEventId}/random-winner`);
      if (!response.ok) throw new Error('Failed to get random winner');
      const data = await response.json();
      setRandomWinner(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSummary = async () => {
    if (!selectedEventId) return;

    setLoading(true);
    setError(null);
    setFullSummary(null);

    try {
      const response = await fetch(`${API_URL}/events/${selectedEventId}/full-summary`);
      if (!response.ok) throw new Error('Failed to get full summary');
      const data = await response.json();
      setFullSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderboard = async () => {
    setLoading(true);
    setError(null);
    setLeaderboard(null);

    try {
      const response = await fetch(`${API_URL}/leaderboard/monthly?month=${leaderboardMonth}&limit=3`);
      if (!response.ok) throw new Error('Failed to get leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>🎉 Fun Features</h2>
      <p style={{ color: '#e0e0e0', marginBottom: '2rem' }}>
        Check out these fun endpoints your partner created! They showcase the power of the multi-database architecture.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Top Attended Events */}
      <div className="feature-section">
        <h3>🏆 Top 3 Attended Events</h3>
        <p className="feature-description">MySQL query showing events with highest attendance</p>
        {topEvents.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Event</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((event, index) => (
                  <tr key={event.Id}>
                    <td className="row-number">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </td>
                    <td>{event.Description}</td>
                    <td><span className="badge">{event.AttendanceCount} students</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No attendance data yet</p>
        )}
      </div>

      {/* Random Winner Selector */}
      <div className="feature-section">
        <h3>🎲 Random Winner Selector</h3>
        <p className="feature-description">Uses Redis to pick a random checked-in student</p>
        <div className="form-row">
          <div className="form-group">
            <label>Select Event:</label>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              {events.map(event => (
                <option key={event.Id} value={event.Id}>
                  {event.Description}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleRandomWinner}
              disabled={loading || !selectedEventId}
            >
              🎲 Pick Random Winner
            </button>
          </div>
        </div>

        {randomWinner && (
          <div className="result-card">
            <h4>{randomWinner.message}</h4>
            {randomWinner.student_id ? (
              <div className="winner-display">
                <p style={{ fontSize: '2rem', margin: '1rem 0' }}>🎉</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                  {randomWinner.first_name} {randomWinner.last_name}
                </p>
                <p style={{ color: '#9ca3af' }}>
                  Selected from {randomWinner.checked_in_count} checked-in students
                </p>
              </div>
            ) : (
              <p style={{ color: '#9ca3af' }}>{randomWinner.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Full Event Summary */}
      <div className="feature-section">
        <h3>📊 Full Event Summary</h3>
        <p className="feature-description">Combines data from MySQL + MongoDB + Redis in one query</p>
        <div className="form-row">
          <div className="form-group">
            <label>Select Event:</label>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              {events.map(event => (
                <option key={event.Id} value={event.Id}>
                  {event.Description}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleFullSummary}
              disabled={loading || !selectedEventId}
            >
              📊 Get Full Summary
            </button>
          </div>
        </div>

        {fullSummary && (
          <div className="summary-display">
            <div className="summary-section">
              <h4>🔵 MySQL Data</h4>
              <div className="summary-content">
                <p><strong>Description:</strong> {fullSummary.mysql.description}</p>
                <p><strong>Address:</strong> {fullSummary.mysql.address}</p>
                <p><strong>Type:</strong> {fullSummary.mysql.type_name || 'N/A'}</p>
                <p><strong>Finalized Attendance:</strong> {fullSummary.mysql.finalized_attendance_count}</p>
              </div>
            </div>

            <div className="summary-section">
              <h4>🟢 MongoDB Data</h4>
              <div className="summary-content">
                <p><strong>Event Type Schema:</strong> {fullSummary.mongodb.event_type_schema ? 'Available' : 'None'}</p>
                <p><strong>Custom Data:</strong> {fullSummary.mongodb.custom_data ? 'Yes' : 'None'}</p>
              </div>
            </div>

            <div className="summary-section">
              <h4>🔴 Redis Data</h4>
              <div className="summary-content">
                {fullSummary.redis.error ? (
                  <p style={{ color: '#ef4444' }}>{fullSummary.redis.error}</p>
                ) : (
                  <>
                    <p><strong>Currently Checked In:</strong> {fullSummary.redis.checked_in_count}</p>
                    <p><strong>Total Ever Checked In:</strong> {fullSummary.redis.total_ever_checked_in}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Leaderboard */}
      <div className="feature-section">
        <h3>📈 Monthly Leaderboard</h3>
        <p className="feature-description">MongoDB collection showing top events by month</p>
        <div className="form-row">
          <div className="form-group">
            <label>Month (YYYY-MM):</label>
            <input
              type="text"
              value={leaderboardMonth}
              onChange={(e) => setLeaderboardMonth(e.target.value)}
              placeholder="2024-12"
            />
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleLeaderboard}
              disabled={loading}
            >
              📈 Get Leaderboard
            </button>
          </div>
        </div>

        {leaderboard && (
          <div className="table-container">
            {leaderboard.leaderboard.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Event Name</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.leaderboard.map((entry, index) => (
                    <tr key={entry.eventId}>
                      <td className="row-number">#{entry.rank}</td>
                      <td>{entry.eventName}</td>
                      <td><span className="badge">{entry.score}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No leaderboard data for {leaderboardMonth}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FunFeatures;

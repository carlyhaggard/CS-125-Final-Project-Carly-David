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
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      {/* Header */}
      <div className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
        <h2 className="text-xl font-bold">Fun Features</h2>
        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
          Check out these fun endpoints that showcase the power of the multi-database architecture.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-700 dark:text-red-400" role="alert">
            {error}
          </div>
        </div>
      )}

      {/* Top Attended Events */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Top 3 Attended Events</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">MySQL query showing events with highest attendance</p>
        {topEvents.length > 0 ? (
          <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Rank</th>
                <th scope="col" className="px-6 py-3">Event</th>
                <th scope="col" className="px-6 py-3">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {topEvents.map((event, index) => (
                <tr key={event.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </td>
                  <td className="px-6 py-4">{event.Description}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                      {event.AttendanceCount} students
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No attendance data yet</p>
        )}
      </div>

      {/* Random Winner Selector */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Random Winner Selector</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Uses Redis to pick a random checked-in student</p>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              {events.map(event => (
                <option key={event.Id} value={event.Id}>
                  {event.Description}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRandomWinner}
              disabled={loading || !selectedEventId}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pick Random Winner
            </button>
          </div>
        </div>

        {randomWinner && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {randomWinner.student_id ? (
              <div className="text-center">
                <p className="text-4xl mb-4">🎉</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {randomWinner.first_name} {randomWinner.last_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selected from {randomWinner.checked_in_count} checked-in students
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{randomWinner.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Full Event Summary */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Full Event Summary</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Combines data from MySQL + MongoDB + Redis in one query</p>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Select Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              {events.map(event => (
                <option key={event.Id} value={event.Id}>
                  {event.Description}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFullSummary}
              disabled={loading || !selectedEventId}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get Full Summary
            </button>
          </div>
        </div>

        {fullSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-md font-semibold text-blue-900 dark:text-blue-300 mb-3">MySQL Data</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700 dark:text-gray-300"><strong>Description:</strong> {fullSummary.mysql.description}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Address:</strong> {fullSummary.mysql.address}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Type:</strong> {fullSummary.mysql.type_name || 'N/A'}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Finalized Attendance:</strong> {fullSummary.mysql.finalized_attendance_count}</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-md font-semibold text-green-900 dark:text-green-300 mb-3">MongoDB Data</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700 dark:text-gray-300"><strong>Event Type Schema:</strong> {fullSummary.mongodb.event_type_schema ? 'Available' : 'None'}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Custom Data:</strong> {fullSummary.mongodb.custom_data ? 'Yes' : 'None'}</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="text-md font-semibold text-red-900 dark:text-red-300 mb-3">Redis Data</h4>
              <div className="space-y-2 text-sm">
                {fullSummary.redis.error ? (
                  <p className="text-red-600 dark:text-red-400">{fullSummary.redis.error}</p>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300"><strong>Currently Checked In:</strong> {fullSummary.redis.checked_in_count}</p>
                    <p className="text-gray-700 dark:text-gray-300"><strong>Total Ever Checked In:</strong> {fullSummary.redis.total_ever_checked_in}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Leaderboard */}
      <div className="p-5 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Monthly Leaderboard</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">MongoDB collection showing top events by month</p>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Month (YYYY-MM):</label>
            <input
              type="text"
              value={leaderboardMonth}
              onChange={(e) => setLeaderboardMonth(e.target.value)}
              placeholder="2024-12"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLeaderboard}
              disabled={loading}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get Leaderboard
            </button>
          </div>
        </div>

        {leaderboard && (
          <div>
            {leaderboard.leaderboard.length > 0 ? (
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">Rank</th>
                    <th scope="col" className="px-6 py-3">Event Name</th>
                    <th scope="col" className="px-6 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.leaderboard.map((entry, index) => (
                    <tr key={entry.eventId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{entry.rank}</td>
                      <td className="px-6 py-4">{entry.eventName}</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                          {entry.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No leaderboard data for {leaderboardMonth}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FunFeatures;

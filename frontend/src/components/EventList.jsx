import React from 'react';

function EventList({ events, onEventSelect, selectedEvent, onEventDelete }) {
  const handleDelete = (e, eventId) => {
    e.stopPropagation(); // Prevent triggering onEventSelect
    if (window.confirm('Are you sure you want to delete this event? This will also delete all registrations.')) {
      onEventDelete(eventId);
    }
  };

  return (
    <div className="panel">
      <h2>Events</h2>
      <ul className="item-list">
        {events.map(event => (
          <li
            key={event.Id}
            className={selectedEvent?.Id === event.Id ? 'selected' : ''}
            onClick={() => onEventSelect(event)}
          >
            <span>{event.Description}</span>
            <button
              className="delete-btn"
              onClick={(e) => handleDelete(e, event.Id)}
              title="Delete event"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EventList;
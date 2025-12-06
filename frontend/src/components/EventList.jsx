import React from 'react';

function EventList({ events, onEventSelect, selectedEvent }) {
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
            {event.Description}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EventList;
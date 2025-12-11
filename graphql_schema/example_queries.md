# GraphQL Example Queries for Youth Group Management System

Access the GraphiQL interface at: `http://127.0.0.1:8000/graphql`

## Basic Queries

### 1. Get All Students
```graphql
query GetAllStudents {
  students {
    id
    firstName
    lastName
    grade
  }
}
```

### 2. Get All Events (Basic Info)
```graphql
query GetAllEvents {
  events {
    id
    description
    address
    typeId
  }
}
```

### 3. Get All Event Types with Schemas
```graphql
query GetAllEventTypes {
  eventTypes {
    id
    name
    description
    customFields {
      name
      type
      required
    }
  }
}
```

---

## Powerful Multi-Database Queries

### 4. Get Complete Event Details (MySQL + MongoDB + Redis)
**This is THE KILLER FEATURE - One query, three databases!**

```graphql
query GetCompleteEvent($eventId: Int!) {
  event(id: $eventId) {
    # Base event info from MySQL
    id
    description
    address
    typeId

    # Event type schema from MongoDB
    eventType {
      id
      name
      description
      customFields {
        name
        type
        required
      }
    }

    # Custom field values from MongoDB
    customData

    # Registrations from MySQL
    registrations {
      id
      studentId
      student {
        id
        firstName
        lastName
        grade
      }
    }

    # Real-time attendance from Redis
    liveAttendance {
      eventId
      checkedInCount
      students {
        studentId
        checkInTime
        checkOutTime
      }
    }
  }
}
```

**Variables:**
```json
{
  "eventId": 1
}
```

---

### 5. Get Student Profile with All Relationships
**One query to fetch student + parents + events + small group**

```graphql
query GetStudentProfile($studentId: Int!) {
  student(id: $studentId) {
    id
    firstName
    lastName
    grade

    # Parents/guardians from MySQL
    parents {
      id
      firstName
      lastName
      relationship
      email
      phone
    }

    # All events they're registered for
    registeredEvents {
      id
      description
      address
      eventType {
        name
      }
    }

    # Their small group
    smallGroup {
      id
      grade
    }
  }
}
```

**Variables:**
```json
{
  "studentId": 1
}
```

---

### 6. Get Live Attendance for an Event
```graphql
query GetLiveAttendance($eventId: Int!) {
  liveAttendance(eventId: $eventId) {
    eventId
    checkedInCount
    students {
      studentId
      checkInTime
      checkOutTime
    }
  }
}
```

**Variables:**
```json
{
  "eventId": 1
}
```

---

### 7. Get Multiple Events with Custom Data
**Fetch multiple events at once with their schemas**

```graphql
query GetMultipleEventsWithTypes {
  events {
    id
    description
    address
    eventType {
      name
      customFields {
        name
        type
      }
    }
    customData
  }
}
```

---

### 8. Get Specific Event Type Schema
```graphql
query GetEventTypeSchema($typeId: Int!) {
  eventType(id: $typeId) {
    id
    name
    description
    customFields {
      name
      type
      required
    }
  }
}
```

**Variables:**
```json
{
  "typeId": 1
}
```

---

## Selective Field Queries (GraphQL Superpower!)

### 9. Get Only Student Names (No Extra Data)
```graphql
query GetStudentNames {
  students {
    firstName
    lastName
  }
}
```

### 10. Get Event with ONLY Registrations (No Type, No Custom Data)
```graphql
query GetEventRegistrations($eventId: Int!) {
  event(id: $eventId) {
    description
    registrations {
      student {
        firstName
        lastName
        grade
      }
    }
  }
}
```

---

## Mutations

### 11. Check In a Student to an Event
```graphql
mutation CheckInStudent($eventId: Int!, $studentId: Int!) {
  checkInStudent(eventId: $eventId, input: { studentId: $studentId })
}
```

**Variables:**
```json
{
  "eventId": 1,
  "studentId": 5
}
```

---

## Complex Combined Queries

### 12. Dashboard Query - Everything at Once
**Get overview data for a dashboard in ONE query**

```graphql
query DashboardOverview {
  # All students
  allStudents: students {
    id
    firstName
    lastName
  }

  # All events with types
  allEvents: events {
    id
    description
    eventType {
      name
    }
  }

  # All event types
  allEventTypes: eventTypes {
    id
    name
  }
}
```

---

### 13. Event Management View
**Get event details + who's registered + who's checked in**

```graphql
query EventManagementView($eventId: Int!) {
  event(id: $eventId) {
    id
    description
    address

    eventType {
      name
      customFields {
        name
        type
      }
    }

    registrations {
      id
      student {
        id
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
}
```

---

## Comparison: REST vs GraphQL

### Example: Get Event with Type and Registrations

**REST API (4 separate calls):**
```javascript
// Call 1: Get event
const event = await fetch('/events/1')

// Call 2: Get event type
const type = await fetch('/event-types/' + event.TypeID)

// Call 3: Get custom data
const customData = await fetch('/events/1/custom-fields')

// Call 4: Get registrations
const registrations = await fetch('/events/1/registrations')

// Call 5: Get attendance
const attendance = await fetch('/redis/events/1/attendance')
```

**GraphQL (1 call):**
```javascript
const result = await graphql(GET_COMPLETE_EVENT, { eventId: 1 })
// result.event has: type, customData, registrations, liveAttendance
```

---

## Pro Tips

1. **Use GraphiQL's autocomplete** - Press `Ctrl+Space` to see available fields
2. **Use Variables** - Don't hardcode IDs in queries, use variables instead
3. **Request only what you need** - GraphQL only fetches fields you request
4. **Explore the Schema** - Click "Docs" in GraphiQL to see all available types
5. **Test incrementally** - Start with simple queries, then add nested fields

---

## Common Use Cases

### Use Case 1: Event Check-In App
```graphql
query EventCheckIn($eventId: Int!) {
  event(id: $eventId) {
    description
    registrations {
      student {
        id
        firstName
        lastName
      }
    }
    liveAttendance {
      students {
        studentId
        checkInTime
      }
    }
  }
}
```

### Use Case 2: Student Directory
```graphql
query StudentDirectory {
  students {
    id
    firstName
    lastName
    grade
    parents {
      firstName
      lastName
      phone
      email
    }
  }
}
```

### Use Case 3: Event Planning
```graphql
query EventPlanning($typeId: Int!) {
  eventType(id: $typeId) {
    name
    description
    customFields {
      name
      type
      required
    }
  }
}
```

---

## Testing Your Queries

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the API:
   ```bash
   uvicorn YouthGroupAPI:app --reload
   ```

3. Open GraphiQL:
   ```
   http://127.0.0.1:8000/graphql
   ```

4. Copy and paste any query from above
5. Add variables in the "Variables" panel (bottom left)
6. Click the Play button!

---

## Next Steps

- **Frontend Integration**: Use Apollo Client or urql in your React app
- **Subscriptions**: Add real-time updates for attendance
- **Authentication**: Add auth middleware to protect sensitive queries
- **Caching**: Leverage GraphQL client caching for better performance

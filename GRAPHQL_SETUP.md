# GraphQL Setup Guide - Youth Group Management System

## What Was Added

Your youth group management system now has GraphQL running **alongside** your existing REST API!

### Files Created/Modified:

```
/Users/davidmelesse/CS_125/finalProject/
├── graphql/
│   ├── __init__.py                 ← New
│   ├── schema.py                   ← New (GraphQL types & resolvers)
│   └── example_queries.md          ← New (Query examples)
├── YouthGroupAPI.py                ← Modified (added GraphQL endpoint)
└── requirements.txt                ← Modified (added strawberry-graphql)
```

---

## Installation Steps

### 1. Install the New Dependency

```bash
pip install -r requirements.txt
```

This installs `strawberry-graphql[fastapi]` which provides:
- GraphQL schema generation
- Query resolver framework
- GraphiQL browser interface
- FastAPI integration

---

### 2. Start Your API

```bash
uvicorn YouthGroupAPI:app --reload
```

Your API now has **two interfaces**:

| Interface | URL | Description |
|-----------|-----|-------------|
| **REST API** | `http://127.0.0.1:8000/docs` | Your existing Swagger UI (unchanged) |
| **GraphQL** | `http://127.0.0.1:8000/graphql` | New GraphQL endpoint with GraphiQL |

---

## Testing GraphQL

### 3. Open GraphiQL Interface

Navigate to: **http://127.0.0.1:8000/graphql**

You'll see an interactive query editor with:
- **Left Panel**: Write queries
- **Middle Panel**: Results
- **Right Panel**: Documentation explorer
- **Bottom Panel**: Variables (for parameterized queries)

---

### 4. Try Your First Query

Copy and paste this into GraphiQL:

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

Click the **Play** button ▶️

You should see all students from your MySQL database!

---

### 5. Try the Killer Feature - Multi-Database Query

This query fetches data from **all three databases** in one request:

```graphql
query GetCompleteEvent {
  event(id: 1) {
    # MySQL
    description
    address

    # MongoDB - Event Type Schema
    eventType {
      name
      customFields {
        name
        type
        required
      }
    }

    # MongoDB - Custom Data
    customData

    # MySQL - Registrations
    registrations {
      student {
        firstName
        lastName
      }
    }

    # Redis - Live Attendance
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

**This is impossible with REST!** You'd need 5 separate API calls.

---

## What GraphQL Gives You

### 1. **Reduced Network Requests**

**Before (REST):**
```javascript
// Frontend makes 5 calls
const event = await fetch('/events/1')
const type = await fetch('/event-types/' + event.TypeID)
const custom = await fetch('/events/1/custom-fields')
const registrations = await fetch('/events/1/registrations')
const attendance = await fetch('/redis/events/1/attendance')
```

**After (GraphQL):**
```javascript
// Frontend makes 1 call
const result = await graphql(GET_COMPLETE_EVENT, { eventId: 1 })
// Has everything: event, type, custom, registrations, attendance
```

---

### 2. **Flexible Data Fetching**

Clients request **exactly** what they need:

```graphql
# Simple view - only needs names
query SimpleView {
  students {
    firstName
  }
}

# Detailed view - needs everything
query DetailedView {
  students {
    firstName
    lastName
    grade
    parents {
      email
      phone
    }
    registeredEvents {
      description
    }
  }
}
```

Same endpoint, different data - GraphQL only fetches what you request!

---

### 3. **Type Safety & Documentation**

- Click **"Docs"** in GraphiQL to explore your entire schema
- See exactly what fields are available
- Know the types of every field
- Auto-generated documentation

---

### 4. **Multi-Database Orchestration**

Your system uniquely uses:
- **MySQL**: Students, Events, Registrations
- **MongoDB**: Event Type Schemas, Custom Fields
- **Redis**: Real-time Attendance

GraphQL **combines all three** seamlessly in resolvers!

---

## Key Queries Available

### Students
```graphql
students                 # All students
student(id: Int!)        # Single student with parents, events, small group
```

### Events
```graphql
events                   # All events
event(id: Int!)          # Complete event (type + custom + registrations + attendance)
```

### Event Types
```graphql
eventTypes               # All event types with schemas
eventType(id: Int!)      # Single event type schema
```

### Attendance
```graphql
liveAttendance(eventId: Int!)  # Real-time attendance from Redis
```

### Mutations
```graphql
checkInStudent(eventId: Int!, input: CheckInInput!)  # Check student in/out
```

---

## Example Use Cases

### Use Case 1: Event Dashboard
**Frontend Component:** Event details page

**One Query Gets:**
- Event info (MySQL)
- Event type schema (MongoDB)
- Custom field values (MongoDB)
- Who's registered (MySQL)
- Who's checked in (Redis)

See: `graphql/example_queries.md` → Query #4

---

### Use Case 2: Student Profile
**Frontend Component:** Student profile page

**One Query Gets:**
- Student info (MySQL)
- Parents/guardians (MySQL)
- All registered events (MySQL)
- Small group (MySQL)

See: `graphql/example_queries.md` → Query #5

---

### Use Case 3: Real-Time Check-In
**Frontend Component:** Event check-in app

**One Query Gets:**
- Event details
- All registered students
- Current check-in status

**One Mutation:**
- Toggle check-in/out status

See: `graphql/example_queries.md` → Query #6, Mutation #11

---

## Frontend Integration (Next Steps)

### Option 1: Apollo Client (Most Popular)

```bash
npm install @apollo/client graphql
```

```javascript
// frontend/src/apollo.js
import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: 'http://localhost:8000/graphql',
  cache: new InMemoryCache()
})
```

### Option 2: urql (Lightweight)

```bash
npm install urql graphql
```

### Option 3: Plain Fetch

```javascript
const query = `
  query GetEvent($id: Int!) {
    event(id: $id) {
      description
      eventType { name }
    }
  }
`

const response = await fetch('http://localhost:8000/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    variables: { id: 1 }
  })
})

const { data } = await response.json()
console.log(data.event)
```

---

## Architecture Overview

### How It Works

```
Frontend Request
     ↓
GraphQL Endpoint (/graphql)
     ↓
GraphQL Schema (graphql/schema.py)
     ↓
Resolvers execute
     ↓
┌────────────────┬──────────────────┬─────────────────┐
│ MySQL Resolver │ MongoDB Resolver │ Redis Resolver  │
│ (students,     │ (event types,    │ (live           │
│  events,       │  custom fields)  │  attendance)    │
│  registrations)│                  │                 │
└────────────────┴──────────────────┴─────────────────┘
     ↓
Combine Results
     ↓
Return JSON to Frontend
```

---

## Debugging Tips

### Enable Logging

Add this to `graphql/schema.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check Query Execution

GraphiQL shows:
- Query execution time (bottom right)
- Errors (red text in results)
- Network tab shows exact request/response

### Common Issues

**Issue:** `Module not found: graphql.schema`
- **Fix:** Make sure you ran `pip install -r requirements.txt`

**Issue:** GraphiQL page won't load
- **Fix:** Check that your API is running: `uvicorn YouthGroupAPI:app --reload`

**Issue:** Query returns `null` for nested fields
- **Fix:** Check that the resolver is fetching data correctly (add print statements)

---

## Performance Considerations

### Good Practices

1. **Only request fields you need** - GraphQL only fetches requested fields
2. **Use variables** - Avoid string concatenation in queries
3. **Batch queries** - Combine multiple queries in one request
4. **Add indexes** - Make sure MySQL tables are indexed on foreign keys

### N+1 Query Problem

GraphQL can cause N+1 queries if not careful:

```graphql
# This might query students N times (once per event)
query {
  events {
    registrations {
      student { firstName }
    }
  }
}
```

**Solution (Future Enhancement):**
- Use DataLoaders to batch database queries
- Add caching layer with Redis

---

## What's Next?

### Recommended Enhancements

1. **GraphQL Subscriptions** (Real-time)
   - Live attendance updates via WebSocket
   - Notify when students check in/out

2. **Authentication**
   - Add auth middleware to GraphQL
   - Protect sensitive queries

3. **DataLoaders**
   - Optimize nested queries
   - Prevent N+1 query problem

4. **Frontend Integration**
   - Use Apollo Client in React
   - Auto-generate TypeScript types

5. **Pagination**
   - Add cursor-based pagination for large lists
   - Limit query complexity

---

## Resources

- **GraphQL Docs**: https://graphql.org/learn/
- **Strawberry Docs**: https://strawberry.rocks/docs
- **Apollo Client**: https://www.apollographql.com/docs/react/
- **Example Queries**: See `graphql/example_queries.md`

---

## Quick Reference

### Start API
```bash
uvicorn YouthGroupAPI:app --reload
```

### Access Points
- REST API: `http://localhost:8000/docs`
- GraphQL: `http://localhost:8000/graphql`

### Test Query
```graphql
query Test {
  students {
    firstName
  }
}
```

---

## Summary

You now have:
- ✅ GraphQL endpoint at `/graphql`
- ✅ GraphiQL interface for testing
- ✅ Queries for all your data models
- ✅ Multi-database resolvers (MySQL + MongoDB + Redis)
- ✅ Example queries in `graphql/example_queries.md`
- ✅ REST API still works (backwards compatible!)

**Start exploring!** Open `http://localhost:8000/graphql` and try the example queries!

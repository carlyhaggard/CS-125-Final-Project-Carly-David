# Youth Group Management System

This project is a full-stack application designed to help a youth pastor or ministry leader manage students, events, small groups, and volunteers. It features a FastAPI backend with a distributed database architecture and a React frontend.

**Created by Carly Haggard & David Melesse.**

---

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Database Architecture](#database-architecture)
- [Key Features](#key-features)
- [Project Setup Guide](#project-setup-guide)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Running the Application](#3-running-the-application)
- [API Documentation](#api-documentation)
- [Testing the Features](#testing-the-features)
- [Troubleshooting](#troubleshooting)

---

## Overview

This system demonstrates a modern distributed database architecture using three complementary databases:
- **MySQL** as the system of record for core relational data
- **MongoDB** for flexible, schema-less custom event data
- **Redis** for real-time attendance tracking with eventual persistence

---

## Technology Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: React with Vite
- **Databases**:
  - **MySQL 8.0**: System of record for relational data (Docker)
  - **MongoDB Atlas**: Cloud-hosted for semi-structured event data
  - **Redis 7**: In-memory cache for real-time attendance (Docker)
- **Containerization**: Docker Compose

---

## Database Architecture

### MySQL (System of Record)
**Purpose**: Canonical storage for all core entities and finalized records

**Key Tables**:
- `student`, `parent_guardian`, `family` - Student and family management
- `event`, `event_type` - Event definitions with type references
- `registration` - Event registrations
- `event_attendance` - **Finalized attendance records** (persisted from Redis)
- `small_group`, `leader`, `weekly_gathering` - Small group management
- `volunteer`, `volunteer_log` - Volunteer tracking

### MongoDB (Flexible Schemas)
**Purpose**: Store dynamic, user-defined schemas and per-event custom data

**Collections**:
- `eventTypes` - Event type schemas with custom field definitions
  - Keyed by `typeId` (references MySQL `event_type.Id`)
  - Contains field definitions: `[{name, type, required}, ...]`
- `eventCustomData` - Per-event custom field values
  - Keyed by `eventId` (references MySQL `event.Id`)
  - Contains actual custom data: `{field1: value1, field2: value2, ...}`

**Example Flow**:
1. Admin creates "Summer Camp" event type in MySQL (gets ID: 1)
2. MongoDB stores schema: `{typeId: 1, fields: [{name: "cabin", type: "text"}]}`
3. Create event with custom data in MySQL (gets ID: 100)
4. MongoDB stores: `{eventId: 100, customData: {cabin: "Lakeside"}}`

### Redis (Real-Time State)
**Purpose**: Live attendance tracking during events with eventual persistence

**Key Patterns**:
- `event:{id}:checkedIn` - SET of currently checked-in student IDs
- `event:{id}:checkInTimes` - HASH mapping studentId → ISO timestamp
- `event:{id}:checkOutTimes` - HASH mapping studentId → ISO timestamp

**Lifecycle**:
1. **During Event**: Check-in/out operations update Redis instantly
2. **Live Dashboard**: Read current state from Redis (SMEMBERS, SCARD)
3. **After Event**: Finalize → persist to MySQL `event_attendance` → DEL Redis keys

---

## Key Features

### 1. User-Defined Event Types
- Admins can create custom event types with flexible field schemas
- Each event type stored in MySQL, with schema in MongoDB
- Example: "Retreat" type with fields: age_group, dietary_restrictions, t_shirt_size

### 2. Flexible Event Custom Data
- Events can have type-specific custom fields
- Base event data in MySQL, custom values in MongoDB
- Fully extensible without schema migrations

### 3. Real-Time Attendance Tracking
- Instant check-in/check-out using Redis
- Live dashboard showing current attendance
- Automatic persistence to MySQL when event ends
- Redis keys cleaned up after finalization

### 4. Multi-Database Coordination
- MySQL maintains referential integrity
- MongoDB provides schema flexibility
- Redis enables real-time performance
- All three stay synchronized through application logic

---

## Project Setup Guide

This guide provides the simplest way to get the project running using Docker for the databases.

### 1. Prerequisites

- **Python 3.10+** and a virtual environment tool.
- **Node.js 18+** and npm.
- **Docker** and **Docker Compose**.
- A **MongoDB Atlas** account (a free M0 cluster is sufficient).

### 2. Environment Setup

1.  **Clone the Repository**:
    ```sh
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Create and Configure the `.env` File**:
    Create a file named `.env` in the project root. This file holds all your credentials and is safely ignored by Git.

    Copy the following into your `.env` file and **replace all placeholder values**:

    ```env
    # --- MongoDB Configuration ---
    # Get this from your MongoDB Atlas "Connect" -> "Drivers" dialog
    MONGODB_URI="mongodb+srv://<your_user>:<your_password>@<your_cluster_url>"
    MONGODB_NAME="youthgroup"

    # --- MySQL Configuration ---
    # This password will be used to create the MySQL Docker container.
    # Choose a secure password.
    DB_PASSWORD="your_super_secret_mysql_password"
    DB_USER="root"
    DB_HOST="127.0.0.1" # Connect to the database on your local machine
    DB_NAME="youth_group_program"

    # --- Redis Configuration ---
    REDIS_URL="redis://localhost:6379"
    ```

### 3. Running the Application

The application is run in four parts: starting the databases, initializing MongoDB, running the backend, and running the frontend.

#### Part 1: Start the Database Containers

In a new terminal, from the project's root directory, run:
```sh
docker-compose up
```

This command will:
- Start MySQL and Redis containers
- **First run only**: Create `youth_group_program` database and run SQL initialization scripts
- Load mock data (12 students, 3 events)

Leave this terminal running.

**Note**: If you need to reset the database (apply schema changes), run:
```sh
docker-compose down -v  # Removes volumes
docker-compose up       # Creates fresh database
```

#### Part 2: Initialize MongoDB Indexes

In a second terminal, run the MongoDB setup script:
```sh
python setup_mongo.py
```

This creates indexes on:
- `eventTypes.typeId` (unique)
- `eventCustomData.eventId` (unique)

**You only need to run this once** per MongoDB database.

#### Part 3: Run the Backend Server

1.  In the same terminal, make sure you are in the project's **root directory**
2.  Create and activate your Python virtual environment:
    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```
4.  Start the FastAPI server:
    ```sh
    uvicorn YouthGroupAPI:app --reload
    ```
5.  The API will connect to all three databases and run at `http://127.0.0.1:8000`
6.  View interactive API docs at `http://127.0.0.1:8000/docs`

#### Part 4: Run the Frontend Server (Optional)

1.  In a third terminal, navigate to the **frontend** directory
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Start the Vite development server:
    ```sh
    npm run dev
    ```
4.  The React application will run at `http://localhost:5173`

Your full application is now running! The backend and frontend are running locally on your machine, and they are connecting to MySQL, MongoDB, and Redis.

---

## API Documentation

The API includes comprehensive endpoint documentation. Once the server is running, visit:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

### Core Endpoints

#### Events
- `GET /events` - List all events
- `POST /events` - Create event (with optional TypeID and custom_data)
- `GET /events/{id}/registrations` - Get event registrations
- `GET /events/{id}/custom-fields` - Get MongoDB custom field values

#### Event Types
- `POST /event-types` - Create event type (writes to MySQL + MongoDB)
- `GET /event-types` - List all event types with schemas
- `GET /event-types/{id}` - Get specific event type schema
- `PUT /event-types/{id}` - Update event type (updates both databases)

#### Real-Time Attendance (Redis)
- `POST /redis/events/{id}/checkin` - Check student in/out (toggle)
- `GET /redis/events/{id}/attendance` - View live attendance dashboard
- `POST /events/{id}/finalize-attendance` - Persist to MySQL and clear Redis

---

## Testing the Features

### 1. Test Event Types with Custom Fields

Create a custom event type:
```bash
curl -X POST http://127.0.0.1:8000/event-types \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Retreat",
    "description": "Annual summer retreat",
    "custom_fields": [
      {"name": "cabin_preference", "type": "text", "required": false},
      {"name": "age", "type": "number", "required": true},
      {"name": "dietary_restrictions", "type": "text", "required": false}
    ]
  }'
```

Retrieve event types:
```bash
# Get all event types
curl http://127.0.0.1:8000/event-types

# Get specific event type
curl http://127.0.0.1:8000/event-types/1
```

### 2. Test Event Creation with Custom Data

Create an event with custom field values:
```bash
curl -X POST http://127.0.0.1:8000/events \
  -H "Content-Type: application/json" \
  -d '{
    "Description": "Summer Retreat 2024",
    "Address": "Camp Sunshine, 123 Forest Road",
    "TypeID": 1,
    "custom_data": {
      "cabin_preference": "Lakeside",
      "age": 15,
      "dietary_restrictions": "Vegetarian"
    }
  }'
```

Retrieve custom fields:
```bash
curl http://127.0.0.1:8000/events/1/custom-fields
```

### 3. Test Real-Time Attendance Flow

Assuming you have student ID 1 in the database:

```bash
# 1. Check in a student
curl -X POST http://127.0.0.1:8000/redis/events/1/checkin \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1}'

# 2. View live attendance
curl http://127.0.0.1:8000/redis/events/1/attendance

# 3. Check in more students
curl -X POST http://127.0.0.1:8000/redis/events/1/checkin \
  -H "Content-Type: application/json" \
  -d '{"student_id": 2}'

# 4. Check current attendance again
curl http://127.0.0.1:8000/redis/events/1/attendance

# 5. Check out a student (same endpoint toggles)
curl -X POST http://127.0.0.1:8000/redis/events/1/checkin \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1}'

# 6. Finalize attendance (writes to MySQL, clears Redis)
curl -X POST http://127.0.0.1:8000/events/1/finalize-attendance
```

Verify in MySQL:
```bash
docker exec youthgroup-db mysql -uroot -p${DB_PASSWORD} \
  youth_group_program -e "SELECT * FROM event_attendance;"
```

### 4. Verify Multi-Database Coordination

After creating an event type:
```bash
# MySQL has the event_type record
docker exec youthgroup-db mysql -uroot -p${DB_PASSWORD} \
  youth_group_program -e "SELECT * FROM event_type;"

# MongoDB has the schema
# Check in MongoDB Atlas UI or via mongosh
```

---

## Troubleshooting

### "Unknown column 'TypeID' in 'field list'"

**Problem**: MySQL database has old schema without new columns.

**Solution**: Recreate database with updated schema:
```sh
docker-compose down -v
docker-compose up
```

### MongoDB Connection Issues

**Problem**: `pymongo.errors.ServerSelectionTimeoutError`

**Solutions**:
1. Verify `MONGODB_URI` in `.env` is correct
2. Check MongoDB Atlas network access (add your IP: 0.0.0.0/0 for development)
3. Verify MongoDB Atlas user credentials
4. Run `python setup_mongo.py` to test connection

### Redis Connection Refused

**Problem**: `redis.exceptions.ConnectionError`

**Solutions**:
1. Verify Docker containers are running: `docker ps`
2. Check Redis container: `docker logs youthgroup-redis`
3. Verify `REDIS_URL` in `.env`: `redis://localhost:6379`

### Port Already in Use

**Problem**: `Address already in use` when starting containers

**Solutions**:
```sh
# Check what's using port 3306 (MySQL)
lsof -i :3306

# Check what's using port 6379 (Redis)
lsof -i :6379

# Stop conflicting service or change port in docker-compose.yml
```

### FastAPI Won't Start

**Problem**: Import errors or dependency issues

**Solutions**:
```sh
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Mock Data Not Loading

**Problem**: Database tables are empty

**Solution**: The SQL scripts only run on first database creation. To reload:
```sh
docker-compose down -v
docker-compose up
# Wait 10 seconds for MySQL to initialize
docker exec youthgroup-db mysql -uroot -p${DB_PASSWORD} \
  youth_group_program -e "SELECT COUNT(*) FROM student;"
```

---

## Project Structure

```
.
├── YouthGroupAPI.py          # FastAPI application and endpoints
├── database.py               # Database connection management
├── setup_mongo.py            # MongoDB operations and setup
├── setup_redis.py            # Redis operations and setup
├── YouthGroupDB.sql          # MySQL schema definition
├── DBMockData.sql            # Sample data for testing
├── docker-compose.yml        # Docker services configuration
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (not in git)
└── frontend/                 # React application
    ├── src/
    └── package.json
```

---

## Development Notes

- MySQL is the **source of truth** for all entity IDs and relationships
- MongoDB operations are **non-blocking** - API continues if MongoDB fails
- Redis data is **ephemeral** - always finalized to MySQL before clearing
- All timestamps use **ISO 8601 format** with UTC timezone
- The system uses **connection pooling** for MySQL (pool size: 5)
- MongoDB uses **unique indexes** to prevent duplicate records

---

## License

This project is for educational purposes as part of CS 125.

**Authors**: Carly Haggard & David Melesse
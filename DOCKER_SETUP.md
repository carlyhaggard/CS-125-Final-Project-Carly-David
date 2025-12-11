# Docker Setup Guide - Youth Group Management System

## 🚀 Quick Start for Instructors

This project is **fully dockerized**. You can run the entire application (MySQL, Redis, Backend API with GraphQL, and Frontend) with a single command!

---

## Prerequisites

1. **Docker Desktop** installed and running
   - Download: https://www.docker.com/products/docker-desktop
   - Verify installation: `docker --version` and `docker-compose --version`

2. **MongoDB Atlas Account** (Free tier)
   - The project uses MongoDB Atlas (cloud-hosted)
   - You'll need a connection URI (instructions below)

---

## Step-by-Step Setup

### Step 1: Clone the Repository (if needed)

```bash
cd /path/to/finalProject
```

### Step 2: Create Environment Configuration

Copy the example environment file and fill in the values:

```bash
cp .env.example .env
```

Edit the `.env` file:

```bash
# Use any text editor
nano .env
# or
code .env
```

**Required values in `.env`:**

```env
# MySQL password (choose any secure password)
DB_PASSWORD=YourSecurePassword123

# MongoDB Atlas URI (see instructions below)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_NAME=youthgroup

# Redis URL (use this for Docker)
REDIS_URL=redis://redis:6379
```

---

### Step 3: Get MongoDB Atlas Connection String

#### Option A: Use Existing MongoDB Atlas Cluster

If you have the students' MongoDB Atlas credentials:
1. Get the connection URI from them
2. Paste it in the `.env` file as `MONGODB_URI`

#### Option B: Create Your Own (5 minutes)

1. Go to https://cloud.mongodb.com and sign up (free)
2. Create a new **FREE** cluster (M0 Sandbox)
3. Create a database user:
   - Click "Database Access" → "Add New Database User"
   - Username: `youthgroup`
   - Password: Choose a secure password
   - User Privileges: Atlas Admin
4. Whitelist your IP:
   - Click "Network Access" → "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0)
5. Get connection string:
   - Click "Database" → "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
6. Paste into `.env` file

**Example `.env` with MongoDB Atlas:**
```env
DB_PASSWORD=SecurePass123
MONGODB_URI=mongodb+srv://youthgroup:MyPass123@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
MONGODB_NAME=youthgroup
REDIS_URL=redis://redis:6379
```

---

### Step 4: Run Everything with Docker Compose

From the project root directory:

```bash
# Build and start all services
docker-compose up --build
```

**What this does:**
1. ✅ Builds the FastAPI backend Docker image
2. ✅ Starts MySQL database (port 3307)
3. ✅ Starts Redis (port 6380)
4. ✅ Starts Backend API (port 8000)
5. ✅ Starts Frontend (port 5173)
6. ✅ Automatically runs database schema and mock data scripts
7. ✅ Sets up networking between all services

**First startup takes 2-3 minutes** to download images and build containers.

---

### Step 5: Verify Everything is Running

You should see logs from all services. Wait for these messages:

```
youthgroup-db     | MySQL init process done. Ready for start up.
youthgroup-redis  | Ready to accept connections
youthgroup-api    | Application startup complete.
youthgroup-frontend | VITE ready
```

**Check service health:**

```bash
# In a new terminal
docker-compose ps
```

All services should show "Up" status.

---

### Step 6: Access the Application

Once running, open these URLs in your browser:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React application |
| **REST API Docs** | http://localhost:8000/docs | Swagger UI (FastAPI) |
| **GraphQL Playground** | http://localhost:8000/graphql | GraphiQL interface |
| **API Root** | http://localhost:8000 | API health check |

---

## Testing GraphQL

### Test Query 1: Get All Students

1. Go to http://localhost:8000/graphql
2. Paste this query:

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

3. Click the Play button ▶️

### Test Query 2: Complete Event (Multi-Database!)

```graphql
query GetCompleteEvent {
  event(id: 1) {
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
    registrations {
      student {
        firstName
        lastName
      }
    }
    liveAttendance {
      checkedInCount
    }
  }
}
```

This single query fetches data from:
- ✅ MySQL (event details, registrations)
- ✅ MongoDB (event type schema, custom data)
- ✅ Redis (live attendance)

**See `graphql/example_queries.md` for 13+ example queries!**

---

## Stopping the Application

### Stop all services (keeps data)

```bash
docker-compose down
```

### Stop and remove all data (fresh start)

```bash
docker-compose down -v
```

The `-v` flag removes volumes, which deletes:
- MySQL database data
- Any cached data

**Note:** MongoDB Atlas data is not affected (it's cloud-hosted)

---

## Troubleshooting

### Issue 1: Port Already in Use

**Error:** `Bind for 0.0.0.0:8000 failed: port is already allocated`

**Fix:** Stop any services using the ports:

```bash
# Check what's using port 8000
lsof -i :8000
# or on Windows
netstat -ano | findstr :8000

# Kill the process or change ports in docker-compose.yml
```

**Alternative:** Change ports in `docker-compose.yml`:

```yaml
api:
  ports:
    - "8001:8000"  # Use 8001 instead of 8000
```

---

### Issue 2: MySQL Not Starting

**Error:** Database connection errors

**Fix:**

1. Check MySQL container logs:
   ```bash
   docker logs youthgroup-db
   ```

2. Ensure `.env` has `DB_PASSWORD` set

3. Try fresh start:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

---

### Issue 3: MongoDB Connection Failed

**Error:** `Error connecting to MongoDB`

**Fix:**

1. Verify `MONGODB_URI` in `.env` is correct
2. Check MongoDB Atlas:
   - Is cluster running?
   - Is IP address whitelisted?
   - Are credentials correct?
3. Test connection manually:
   ```bash
   docker exec -it youthgroup-api python -c "from database import get_mongo_client; get_mongo_client()"
   ```

---

### Issue 4: Frontend Can't Connect to API

**Error:** Network errors in browser console

**Fix:**

1. Check if API is running:
   ```bash
   curl http://localhost:8000
   ```

2. Verify CORS settings in `YouthGroupAPI.py` (line 64-76)

3. Check frontend environment variable:
   ```bash
   # Should be http://localhost:8000
   echo $VITE_API_URL
   ```

---

### Issue 5: Build Failures

**Error:** Docker build fails

**Fix:**

1. Clear Docker cache:
   ```bash
   docker-compose build --no-cache
   ```

2. Check `requirements.txt` is present

3. Verify Dockerfile syntax

---

## Development Mode vs Production

### Current Setup (Development)

The `docker-compose.yml` is configured for **development**:
- ✅ Code changes auto-reload (hot reload)
- ✅ Source code mounted as volume
- ✅ Debug logging enabled
- ✅ All ports exposed

### For Production Deployment

Modify `docker-compose.yml`:

```yaml
api:
  volumes:
    # REMOVE this line for production
    # - .:/app
  command: uvicorn YouthGroupAPI:app --host 0.0.0.0 --port 8000
  # REMOVE --reload flag
```

---

## Project Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Network                    │
│                  (youthgroup-network)                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Frontend   │  │  Backend API │  │   MySQL   │ │
│  │   (React +   │─▶│  (FastAPI +  │─▶│    DB     │ │
│  │    Vite)     │  │   GraphQL)   │  │  (3307)   │ │
│  │   :5173      │  │    :8000     │  └───────────┘ │
│  └──────────────┘  └──────┬───────┘                 │
│                           │                          │
│                           ├──────────▶┌───────────┐ │
│                           │           │   Redis   │ │
│                           │           │  (6380)   │ │
│                           │           └───────────┘ │
│                           │                          │
│                           └──────────▶ MongoDB Atlas │
│                                       (Cloud)        │
└─────────────────────────────────────────────────────┘
```

---

## Service Details

### MySQL Database
- **Image:** mysql:8.0
- **Port:** 3307 (external) → 3306 (internal)
- **Data:** Persisted in Docker volume `db_data`
- **Initialization:** Auto-runs `YouthGroupDB.sql` and `DBMockData.sql`

### Redis
- **Image:** redis:7-alpine
- **Port:** 6380 (external) → 6379 (internal)
- **Purpose:** Real-time attendance tracking

### Backend API
- **Built from:** `Dockerfile`
- **Port:** 8000
- **Features:**
  - FastAPI REST endpoints
  - GraphQL endpoint at `/graphql`
  - Swagger docs at `/docs`
  - Auto-reload on code changes

### Frontend
- **Image:** node:18-alpine
- **Port:** 5173
- **Auto-installs:** Dependencies on startup
- **Features:** React + Vite dev server

---

## Useful Docker Commands

### View running containers
```bash
docker-compose ps
```

### View logs (all services)
```bash
docker-compose logs -f
```

### View logs (specific service)
```bash
docker-compose logs -f api
docker-compose logs -f db
docker-compose logs -f redis
docker-compose logs -f frontend
```

### Restart a specific service
```bash
docker-compose restart api
```

### Execute command in container
```bash
# Access API container shell
docker exec -it youthgroup-api bash

# Run Python in API container
docker exec -it youthgroup-api python

# Access MySQL shell
docker exec -it youthgroup-db mysql -uroot -p
```

### Rebuild after code changes
```bash
# If you modify Dockerfile or requirements.txt
docker-compose up --build
```

### Stop and remove everything
```bash
docker-compose down
```

### Remove all data and start fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | MySQL root password | `SecurePass123` |
| `DB_HOST` | MySQL hostname (use `db` in Docker) | `db` |
| `DB_USER` | MySQL username | `root` |
| `DB_NAME` | MySQL database name | `youth_group_program` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `MONGODB_NAME` | MongoDB database name | `youthgroup` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `VITE_API_URL` | Frontend API endpoint | `http://localhost:8000` |

---

## Data Persistence

### What Gets Saved?
- ✅ **MySQL data** - Saved in Docker volume `db_data`
- ✅ **MongoDB data** - Saved in MongoDB Atlas (cloud)
- ❌ **Redis data** - Lost on container restart (by design - it's for temporary attendance)

### Fresh Start
```bash
# Delete MySQL data and restart
docker-compose down -v
docker-compose up --build
```

---

## Testing Checklist

Run these checks to verify everything works:

- [ ] All containers started: `docker-compose ps`
- [ ] Frontend loads: http://localhost:5173
- [ ] API docs load: http://localhost:8000/docs
- [ ] GraphQL loads: http://localhost:8000/graphql
- [ ] Students query works in GraphQL
- [ ] Events query works in GraphQL
- [ ] Complete event query works (multi-database)
- [ ] REST endpoints work in Swagger
- [ ] Frontend can fetch data from API

---

## Submission Notes

This Docker setup ensures:
- ✅ **One-command startup** - No manual database setup needed
- ✅ **Cross-platform** - Works on Mac, Windows, Linux
- ✅ **Isolated environment** - No conflicts with instructor's system
- ✅ **Reproducible** - Same environment every time
- ✅ **Complete stack** - All services included

**To submit:**
1. Ensure `.env.example` is included (not `.env` with passwords!)
2. Verify `docker-compose.yml` is present
3. Include this `DOCKER_SETUP.md` guide
4. Test on a clean system before submitting

---

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Review container logs: `docker-compose logs`
3. Ensure all prerequisites are installed
4. Verify `.env` configuration is correct

---

## Summary

**To run the entire application:**

```bash
# 1. Create .env file
cp .env.example .env
# Edit .env with your MongoDB Atlas URI

# 2. Start everything
docker-compose up --build

# 3. Access:
# - Frontend: http://localhost:5173
# - REST API: http://localhost:8000/docs
# - GraphQL: http://localhost:8000/graphql
```

That's it! The entire Youth Group Management System with GraphQL is now running! 🚀

import mysql.connector
from database import get_mysql_pool, get_mongo_db
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date, datetime
from setup_redis import (
    student_checkin_edit,
    get_live_attendance,
    finalize_event_attendance,
    get_random_winner
)
from setup_mongo import (
    create_event_type_schema,
    get_event_type_schema,
    get_all_event_type_schemas,
    update_event_type_schema,
    store_event_custom_data,
    get_event_custom_data,
    update_event_custom_data
)
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- Diagnostic Function ---
def check_database_tables():
    print("--- Running Database Diagnostic Check ---")
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        print("Tables visible to the application:")
        for table in tables:
            print(f"- {table[0]}")
        # Check specifically for event_type
        cursor.execute("SELECT 1 FROM event_type LIMIT 1;")
        print("Confirmation: 'event_type' table is accessible.")
    except mysql.connector.Error as err:
        print(f"!!! Diagnostic Error: {err}")
        if "1146" in str(err):
            print("!!! The 'event_type' table was not found by the application.")
    except Exception as e:
        print(f"!!! An unexpected diagnostic error occurred: {e}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()
        print("--- End of Diagnostic Check ---")

# --- Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup
    check_database_tables()
    yield
    # On shutdown
    print("API shutting down.")

# --- FastAPI App ---
app = FastAPI(
    title="Youth Group Program API",
    description="An API for managing youth group students, events, and activities.",
    version="1.0.0",
    lifespan=lifespan
)

# --- CORS Middleware ---
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class Student(BaseModel):
    Id: int
    FirstName: str
    LastName: Optional[str]
    Grade: str

class Event(BaseModel):
    Id: int
    Description: Optional[str]
    Address: str

class TopEvent(BaseModel):
    Id: int
    Description: Optional[str]
    AttendanceCount: int

class EventCreate(BaseModel):
    Description: str
    Address: str
    TypeID: Optional[int] = None
    custom_data: Optional[Dict] = None

class EventTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    custom_fields: List = []

class EventTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[List] = None

class CheckInAction(BaseModel):
    student_id: int

class LeaderboardEntry(BaseModel):
    rank: int
    eventId: int
    eventName: str
    score: int

class MonthlyLeaderboardResponse(BaseModel):
    month: str
    metric: str
    limit: int
    leaderboard: List[LeaderboardEntry]

class RandomWinnerResponse(BaseModel):
    event_id: int
    checked_in_count: int
    student_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    message: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the Youth Group Program API!"}

@app.get("/events", response_model=List[Event])
def get_all_events():
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, Description, Address FROM event ORDER BY Id;")
        events = cursor.fetchall()
        return events
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.get("/events/top-attended", response_model=List[TopEvent])
def get_top_attended_events():
    """
    Retrieves the top 3 events with the highest attendance count.
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT
                e.Id,
                e.Description,
                COUNT(a.StudentID) AS AttendanceCount
            FROM event e
            JOIN event_attendance a ON e.Id = a.EventID
            GROUP BY e.Id, e.Description
            ORDER BY AttendanceCount DESC
            LIMIT 3;
        """
        cursor.execute(query)
        top_events = cursor.fetchall()
        return top_events
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.post("/events")
def create_event(payload: EventCreate):
    """
    Creates an event in MySQL and optionally stores custom field data in MongoDB.

    Flow:
    1. Insert base event into MySQL (Description, Address, TypeID)
    2. If custom_data provided, store in MongoDB keyed by eventId
    """
    event_id = None
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        insert_sql = "INSERT INTO event (Description, Address, TypeID) VALUES (%s, %s, %s);"
        cursor.execute(insert_sql, (payload.Description, payload.Address, payload.TypeID))
        cnx.commit()
        event_id = cursor.lastrowid
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

    # Store custom data in MongoDB if provided
    if event_id and payload.custom_data:
        try:
            store_event_custom_data(event_id, payload.custom_data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error storing custom data in MongoDB: {e}")

    return {
        "Id": event_id,
        "Description": payload.Description,
        "Address": payload.Address,
        "TypeID": payload.TypeID,
        "custom_data_stored": payload.custom_data is not None
    }

@app.get("/events/{event_id}/registrations", response_model=List[dict])
def get_event_registrations(event_id: int):
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT r.Id, r.StudentID, s.FirstName, s.LastName, s.Grade
            FROM registration r JOIN student s ON r.StudentID = s.Id
            WHERE r.EventID = %s ORDER BY s.LastName;
        """
        cursor.execute(query, (event_id,))
        registrations = cursor.fetchall()
        return registrations
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.get("/events/{event_id}/full-summary", tags=["Events", "MongoDB", "Redis"])
def get_event_full_summary(event_id: int):
    """
    Combines data from all three DBMSes for a single event:
    - MySQL: base event info + type name + finalized attendance count
    - MongoDB: event type schema + custom event data
    - Redis: live attendance snapshot
    """

    # --- MySQL: event info + type + finalized attendance count ---
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Base event + type name
        cursor.execute(
            """
            SELECT
                e.Id,
                e.Description,
                e.Address,
                e.TypeID,
                et.Name AS TypeName
            FROM event e
            LEFT JOIN event_type et ON e.TypeID = et.Id
            WHERE e.Id = %s;
            """,
            (event_id,),
        )
        event_row = cursor.fetchone()

        if not event_row:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        # Finalized attendance (from MySQL event_attendance)
        cursor.execute(
            "SELECT COUNT(*) AS FinalizedCount FROM event_attendance WHERE EventID = %s;",
            (event_id,),
        )
        count_row = cursor.fetchone()
        finalized_count = count_row["FinalizedCount"] if count_row else 0

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
    finally:
        if "cnx" in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

    # --- MongoDB: event type schema + per-event custom data ---
    event_type_schema = None
    custom_data = None

    # Custom data for this event (Mongo, per-event)
    try:
        custom_data = get_event_custom_data(event_id)
    except Exception:
        custom_data = None

    # Event type schema (Mongo, based on TypeID)
    type_id = event_row.get("TypeID")
    if type_id is not None:
        try:
            event_type_schema = get_event_type_schema(type_id)
        except Exception:
            event_type_schema = None

    # --- Redis: live attendance snapshot ---
    redis_data = None
    try:
        redis_data = get_live_attendance(event_id)
    except ConnectionError as e:
        redis_data = {"error": f"Redis unavailable: {e}"}
    except Exception as e:
        redis_data = {"error": f"Error reading Redis: {e}"}

    # --- Combined response ---
    return {
        "event_id": event_row["Id"],
        "mysql": {
            "description": event_row["Description"],
            "address": event_row["Address"],
            "type_id": event_row["TypeID"],
            "type_name": event_row.get("TypeName"),
            "finalized_attendance_count": finalized_count,
        },
        "mongodb": {
            "event_type_schema": event_type_schema,
            "custom_data": custom_data,
        },
        "redis": redis_data,
    }

@app.post("/event-types")
def create_event_type(payload: EventTypeCreate):
    event_type_id = None
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()
        insert_sql = "INSERT INTO event_type (Name, Description) VALUES (%s, %s);"
        cursor.execute(insert_sql, (payload.name, payload.description))
        cnx.commit()
        event_type_id = cursor.lastrowid
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

    if event_type_id:
        try:
            mongo_db = get_mongo_db()
            schema_doc = {
                "typeId": event_type_id,
                "name": payload.name,
                "description": payload.description,
                "fields": payload.custom_fields,
                "createdAt": datetime.utcnow().isoformat()
            }
            mongo_db.eventTypes.insert_one(schema_doc)
        except ConnectionError as e:
            # This will now catch the MongoDB connection error
            raise HTTPException(status_code=500, detail=f"Database error (MongoDB): {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred with MongoDB: {e}")

    return {
        "id": event_type_id,
        "name": payload.name,
        "description": payload.description,
        "custom_fields": payload.custom_fields,
    }

@app.get("/event-types", tags=["Event Types"])
def get_all_event_types():
    """
    Retrieves all event types from both MySQL and MongoDB.

    Returns:
        List of event types with their schemas
    """
    try:
        # Get all schemas from MongoDB
        schemas = get_all_event_type_schemas()
        return schemas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching event types: {e}")

@app.get("/event-types/{type_id}", tags=["Event Types"])
def get_event_type(type_id: int):
    """
    Retrieves a specific event type schema by ID.

    Args:
        type_id: The event type ID from MySQL

    Returns:
        Event type schema from MongoDB
    """
    try:
        schema = get_event_type_schema(type_id)
        if not schema:
            raise HTTPException(status_code=404, detail=f"Event type {type_id} not found")
        return schema
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching event type: {e}")

@app.put("/event-types/{type_id}", tags=["Event Types"])
def update_event_type(type_id: int, payload: EventTypeUpdate):
    """
    Updates an event type schema in MongoDB and optionally in MySQL.

    Args:
        type_id: The event type ID
        payload: Updated fields

    Returns:
        Success status
    """
    try:
        # Update MySQL if name or description provided
        if payload.name is not None or payload.description is not None:
            cnx = get_mysql_pool().get_connection()
            cursor = cnx.cursor()

            update_parts = []
            update_values = []

            if payload.name is not None:
                update_parts.append("Name = %s")
                update_values.append(payload.name)
            if payload.description is not None:
                update_parts.append("Description = %s")
                update_values.append(payload.description)

            if update_parts:
                update_sql = f"UPDATE event_type SET {', '.join(update_parts)} WHERE Id = %s;"
                update_values.append(type_id)
                cursor.execute(update_sql, tuple(update_values))
                cnx.commit()

            cursor.close()
            cnx.close()

        # Update MongoDB schema
        success = update_event_type_schema(
            type_id,
            name=payload.name,
            description=payload.description,
            fields=payload.custom_fields
        )

        if not success:
            raise HTTPException(status_code=404, detail=f"Event type {type_id} not found in MongoDB")

        return {"message": "Event type updated successfully", "type_id": type_id}

    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating event type: {e}")

@app.get("/events/{event_id}/custom-fields", tags=["Events"])
def get_event_custom_fields(event_id: int):
    """
    Retrieves custom field values for a specific event from MongoDB.

    Args:
        event_id: The event ID

    Returns:
        Custom field data for the event
    """
    try:
        custom_data = get_event_custom_data(event_id)
        if not custom_data:
            return {"event_id": event_id, "custom_data": None, "message": "No custom data found"}
        return custom_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching custom fields: {e}")

@app.get("/redis/events/{event_id}/attendance", tags=["Redis Attendance"])
def get_event_attendance(event_id: int):
    """
    Gets live attendance data for an event from Redis.

    Args:
        event_id: The event ID

    Returns:
        Current checked-in students and count
    """
    try:
        attendance = get_live_attendance(event_id)
        return attendance
    except ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"Database error (Redis): {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attendance: {e}")

@app.post("/redis/events/{event_id}/checkin", tags=["Redis Attendance"])
def event_checkin(event_id: int, action: CheckInAction):
    """
    Checks a student in or out of an event using Redis.

    Args:
        event_id: The event ID
        action: Contains student_id

    Returns:
        Status: "CHECKED IN" or "CHECKED OUT"
    """
    try:
        status = student_checkin_edit(event_id, action.student_id)
        return {"status": status, "student_id": action.student_id, "event_id": event_id}
    except ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"Database error (Redis): {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking in student: {e}")

@app.post("/events/{event_id}/finalize-attendance", tags=["Events", "Redis Attendance"])
def finalize_attendance(event_id: int):
    """
    Finalizes attendance for an event by:
    1. Reading all check-in/out data from Redis
    2. Writing to MySQL event_attendance table
    3. Deleting Redis keys

    Args:
        event_id: The event ID

    Returns:
        Summary of records persisted
    """
    try:
        result = finalize_event_attendance(event_id)
        return result
    except ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finalizing attendance: {e}")

@app.get("/redis/events/{event_id}/random-winner", response_model=RandomWinnerResponse, tags=["Redis Attendance"])
def get_random_event_winner(event_id: int):
    try:
        attendance = get_live_attendance(event_id)
        checked_in_count = attendance.get("checked_in_count", 0)

        if checked_in_count == 0:
            return RandomWinnerResponse(
                event_id=event_id,
                checked_in_count=0,
                student_id=None,
                first_name=None,
                last_name=None,
                message="No students are currently checked in for this event."
            )

        student_id = get_random_winner(event_id)
        if student_id is None:
            return RandomWinnerResponse(
                event_id=event_id,
                checked_in_count=checked_in_count,
                student_id=None,
                first_name=None,
                last_name=None,
                message="No students available to choose from."
            )

        first_name = None
        last_name = None

        try:
            cnx = get_mysql_pool().get_connection()
            cursor = cnx.cursor(dictionary=True)
            cursor.execute("SELECT FirstName, LastName FROM student WHERE Id = %s;", (student_id,))
            row = cursor.fetchone()
            if row:
                first_name = row["FirstName"]
                last_name = row["LastName"]
        finally:
            if 'cnx' in locals() and cnx.is_connected():
                cursor.close()
                cnx.close()

        return RandomWinnerResponse(
            event_id=event_id,
            checked_in_count=checked_in_count,
            student_id=student_id,
            first_name=first_name,
            last_name=last_name,
            message="Random winner selected from currently checked-in students."
        )

    except ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"Database error (Redis): {e}")
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error selecting random winner: {e}")

@app.get("/leaderboard/monthly", response_model=MonthlyLeaderboardResponse, tags=["Leaderboard"])
def get_monthly_leaderboard(month: str, limit: int = 3):
    """
    Retrieves the monthly event leaderboard from MongoDB.
    Filters by month, sorts by score, and limits the results.
    """
    if not month:
        raise HTTPException(status_code=400, detail="Month parameter (YYYY-MM) is required.")

    try:
        mongo_db = get_mongo_db()
        leaderboard_collection = mongo_db.monthly_event_leaderboard

        cursor = leaderboard_collection.find(
            {"month": month},
            {"_id": 0, "rank": 1, "eventId": 1, "eventName": 1, "score": 1}
        ).sort("score", -1).limit(limit)

        leaderboard_entries = []
        for doc in cursor:
            leaderboard_entries.append(LeaderboardEntry(**doc))

        return MonthlyLeaderboardResponse(
            month=month,
            metric="attendance", # As per requirement, assume "attendance" for now
            limit=limit,
            leaderboard=leaderboard_entries
        )
    except ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"Database error (MongoDB): {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching monthly leaderboard: {e}")

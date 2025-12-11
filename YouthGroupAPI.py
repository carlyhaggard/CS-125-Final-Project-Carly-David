import mysql.connector
from database import get_mysql_pool, get_mongo_db
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date, datetime
from setup_redis import student_checkin_edit, get_live_attendance, finalize_event_attendance
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
        result = cursor.fetchall()  # Fetch the result to avoid unread result error
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


# --- Student Registration Endpoints ---
@app.post("/registrations", tags=["Registrations"])
def create_registration(EventID: int, StudentID: int):
    """
    Register a student for an event.

    Args:
        EventID: The event ID
        StudentID: The student ID

    Returns:
        The created registration record
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if student is already registered
        check_query = "SELECT * FROM registration WHERE StudentID = %s AND EventID = %s"
        cursor.execute(check_query, (StudentID, EventID))
        existing = cursor.fetchone()

        if existing:
            cursor.close()
            cnx.close()
            return {"message": "Student already registered", "registration": existing}

        # Create registration
        insert_query = """
            INSERT INTO registration (StudentID, EventID, SignUpDate)
            VALUES (%s, %s, CURDATE())
        """
        cursor.execute(insert_query, (StudentID, EventID))
        cnx.commit()

        registration_id = cursor.lastrowid

        # Fetch the created registration
        cursor.execute("SELECT * FROM registration WHERE Id = %s", (registration_id,))
        new_registration = cursor.fetchone()

        cursor.close()
        cnx.close()

        return new_registration

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating registration: {e}")


@app.get("/events/{event_id}/registrations", tags=["Events", "Registrations"])
def get_event_registrations(event_id: int):
    """
    Get all registrations for a specific event with student details.

    Args:
        event_id: The event ID

    Returns:
        List of registrations with student information
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        query = """
            SELECT
                r.Id as RegistrationId,
                r.SignUpDate,
                s.Id as StudentId,
                s.FirstName,
                s.LastName,
                s.Email
            FROM registration r
            JOIN student s ON r.StudentID = s.Id
            WHERE r.EventID = %s
            ORDER BY s.LastName, s.FirstName
        """
        cursor.execute(query, (event_id,))
        registrations = cursor.fetchall()

        cursor.close()
        cnx.close()

        return registrations

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching registrations: {e}")


# --- GraphQL Endpoint ---
# This section integrates GraphQL with FastAPI.
# GraphQL will run ALONGSIDE your existing REST API.
# Access the interactive GraphiQL interface at: http://127.0.0.1:8000/graphql

from strawberry.fastapi import GraphQLRouter
from graphql_schema.schema import schema

# Create the GraphQL router with GraphiQL enabled for testing
# GraphiQL is an in-browser IDE for writing and testing GraphQL queries
graphql_app = GraphQLRouter(schema, graphiql=True)

# Mount the GraphQL endpoint at /graphql
# All GraphQL queries and mutations will be sent to this endpoint
app.include_router(graphql_app, prefix="/graphql")

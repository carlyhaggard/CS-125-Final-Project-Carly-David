import mysql.connector
from database import get_mysql_pool, get_mongo_db
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from setup_redis import student_checkin_edit, get_live_attendance
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

class EventCreate(BaseModel):
    Description: str
    Address: str

class EventTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    custom_fields: List = []

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

@app.post("/events", response_model=Event)
def create_event(payload: EventCreate):
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        insert_sql = "INSERT INTO event (Description, Address) VALUES (%s, %s);"
        cursor.execute(insert_sql, (payload.Description, payload.Address))
        cnx.commit()
        event_id = cursor.lastrowid
        return {"Id": event_id, "Description": payload.Description, "Address": payload.Address}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

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

@app.post("/redis/events/{event_id}/checkin", tags=["Redis Attendance"])
def event_checkin(event_id: int, action: CheckInAction):
    try:
        status = student_checkin_edit(event_id, action.student_id)
        return {"status": status}
    except ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"Database error (Redis): {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking in student: {e}")

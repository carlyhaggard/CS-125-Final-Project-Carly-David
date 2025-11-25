import mysql.connector
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import os

# --- Database Configuration ---
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password_here")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_NAME = os.getenv("DB_NAME", "youth_group_program")

# --- Connection Pooling ---
try:
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="youth_group_pool",
        pool_size=5,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        database=DB_NAME
    )
    print("Database connection pool created successfully.")
except mysql.connector.Error as err:
    print(f"Error creating connection pool: {err}")
    exit()

# --- FastAPI App ---
app = FastAPI(
    title="Youth Group Program API",
    description="An API for managing youth group students, events, and activities.",
    version="1.0.0"
)

# --- Pydantic Models (for request/response validation) ---
class Student(BaseModel):
    Id: int
    FirstName: str
    LastName: Optional[str]
    Grade: str

class ParentGuardian(BaseModel):
    Id: int
    FirstName: str
    LastName: Optional[str]
    Relationship: str
    Email: Optional[str]
    Phone: str

class SmallGroup(BaseModel):
    Id: int
    Grade: str

class Leader(BaseModel):
    Id: int
    SmallGroupID: Optional[int]
    FirstName: str
    LastName: Optional[str]

class Event(BaseModel):
    Id: int
    Description: Optional[str]
    Address: str

class Registration(BaseModel):
    Id: int
    StudentID: int
    EventID: int
    SignUpDate: Optional[date]

class CheckIn(BaseModel):
    Id: int
    RegistrationID: Optional[int]
    CheckedIN: bool
    TimeIn: Optional[datetime]

class Volunteer(BaseModel):
    Id: int
    FirstName: str
    LastName: Optional[str]
    Email: Optional[str]
    Phone: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    # Root endpoint + welcome message
    return {"message": "Welcome to the Youth Group Program API!"}


# === STUDENT ENDPOINTS ===

@app.get("/students", response_model=List[Student])
def get_all_students():
    # Retrieves a list of all students.
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, FirstName, LastName, Grade FROM student ORDER BY LastName, FirstName;")
        students = cursor.fetchall()
        return students
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


@app.get("/students/{student_id}", response_model=Student)
def get_student_by_id(student_id: int):
    # Retrieves a specific student by their ID
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = "SELECT Id, FirstName, LastName, Grade FROM student WHERE Id = %s;"
        cursor.execute(query, (student_id,))
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return student
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


@app.get("/students/{student_id}/parents", response_model=List[ParentGuardian])
def get_student_parents(student_id: int):
    # Retrieves all parents/guardians for a specific student
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT pg.Id, pg.FirstName, pg.LastName, pg.Relationship, pg.Email, pg.Phone
            FROM parent_guardian pg
            JOIN family f ON pg.Id = f.ParentID
            WHERE f.StudentID = %s;
        """
        cursor.execute(query, (student_id,))
        parents = cursor.fetchall()
        return parents
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


# === EVENT ENDPOINTS ===

@app.get("/events", response_model=List[Event])
def get_all_events():
    # Retrieves a list of events
    try:
        cnx = db_pool.get_connection()
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


@app.get("/events/{event_id}", response_model=Event)
def get_event_by_id(event_id: int):
    # Retrieves specific event by ID
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = "SELECT Id, Description, Address FROM event WHERE Id = %s;"
        cursor.execute(query, (event_id,))
        event = cursor.fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return event
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


@app.get("/events/{event_id}/registrations", response_model=List[dict])
def get_event_registrations(event_id: int):
    # Retrieves all student reservations for a specfic event
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT r.Id, r.StudentID, r.SignUpDate,
                   s.FirstName, s.LastName, s.Grade
            FROM registration r
            JOIN student s ON r.StudentID = s.Id
            WHERE r.EventID = %s
            ORDER BY r.SignUpDate;
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


# === SMALL GROUP ENDPOINTS ===

@app.get("/small-groups", response_model=List[SmallGroup])
def get_all_small_groups():
    # Retrieves a list of all small groups
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, Grade FROM small_group ORDER BY Grade;")
        groups = cursor.fetchall()
        return groups
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


@app.get("/small-groups/{group_id}/students", response_model=List[Student])
def get_small_group_students(group_id: int):
    # Retrieves all students in a specific small group
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT s.Id, s.FirstName, s.LastName, s.Grade
            FROM student s
            JOIN sign_up su ON s.Id = su.StudentID
            WHERE su.SmallGroupID = %s
            ORDER BY s.LastName, s.FirstName;
        """
        cursor.execute(query, (group_id,))
        students = cursor.fetchall()
        return students
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


# === LEADER ENDPOINTS ===

@app.get("/leaders", response_model=List[Leader])
def get_all_leaders():
    # Retrieves a list of all small group leaders
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, SmallGroupID, FirstName, LastName FROM leader ORDER BY LastName, FirstName;")
        leaders = cursor.fetchall()
        return leaders
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


# === CHECK-IN ENDPOINTS ===

@app.get("/check-ins/event/{event_id}", response_model=List[dict])
def get_event_check_ins(event_id: int):
    # Retrieves all check-ins for a specific event with student details.
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT c.Id, c.RegistrationID, c.CheckedIN, c.TimeIn,
                   s.FirstName, s.LastName, s.Grade
            FROM check_in c
            JOIN registration r ON c.RegistrationID = r.Id
            JOIN student s ON r.StudentID = s.Id
            WHERE r.EventID = %s
            ORDER BY c.CheckedIN DESC, s.LastName;
        """
        cursor.execute(query, (event_id,))
        check_ins = cursor.fetchall()
        return check_ins
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


# === VOLUNTEER ENDPOINTS ===

@app.get("/volunteers", response_model=List[Volunteer])
def get_all_volunteers():
    # Retrieves a list of all volunteers
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, FirstName, LastName, Email, Phone FROM volunteer ORDER BY LastName, FirstName;")
        volunteers = cursor.fetchall()
        return volunteers
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()


if __name__ == "__main__":
    print("\n=== Youth Group Program API ===")
    print("\nTo run this FastAPI application:")
    print("1. Make sure you have installed the required packages:")
    print("   pip install fastapi uvicorn mysql-connector-python")
    print("\n2. Set your database password as an environment variable:")
    print("   export DB_PASSWORD='your_password_here'  # On Linux/Mac")
    print("   set DB_PASSWORD=your_password_here       # On Windows CMD")
    print("   $env:DB_PASSWORD='your_password_here'    # On Windows PowerShell")
    print("\n3. Run the server:")
    print("   uvicorn youth_group_api:app --reload --port 8000")
    print("\n4. Open your browser and go to:")
    print("   - http://127.0.0.1:8000/docs for interactive API documentation")
    print("   - http://127.0.0.1:8000/students to see all students")
    print("   - http://127.0.0.1:8000/events to see all events")
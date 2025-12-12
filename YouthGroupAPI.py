# All the imports we need to make the API work
import mysql.connector  # connects to our MySQL database
from database import get_mysql_pool, get_mongo_db  # helper functions to get database connections
from fastapi import FastAPI, HTTPException  # FastAPI is the web framework, HTTPException for errors
from pydantic import BaseModel  # helps us validate incoming data with type checking
from typing import Optional, List, Dict  # type hints for better code clarity
from datetime import date, datetime  # for working with dates and times
# Redis functions - these handle the live check-in/check-out system during events
from setup_redis import (
    student_checkin_edit,  # toggles a student's check-in status
    get_live_attendance,  # grabs current attendance from Redis
    finalize_event_attendance,  # moves attendance from Redis to MySQL when event ends
    get_random_winner  # picks a random checked-in student
)
# MongoDB functions - these handle flexible event type schemas and custom data
from setup_mongo import (
    create_event_type_schema,  # creates a new event type with custom fields
    get_event_type_schema,  # retrieves an event type schema
    get_all_event_type_schemas,  # gets all event type schemas
    update_event_type_schema,  # updates an existing event type
    store_event_custom_data,  # saves custom event data in MongoDB
    get_event_custom_data,  # retrieves custom event data
    update_event_custom_data  # updates custom event data
)
from fastapi.middleware.cors import CORSMiddleware  # allows our frontend to talk to the API
from contextlib import asynccontextmanager  # helps manage startup/shutdown tasks

# --- Diagnostic Function ---
# This runs when the API starts up to make sure our database is accessible
# Basically a health check to catch problems early instead of during a test/demo
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

# Student Management Models
class StudentCreate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    Grade: str

class StudentUpdate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    Grade: str

# Parent Management Models
class ParentCreate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    Relationship: str
    Email: Optional[str] = None
    Phone: str

class ParentUpdate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    Relationship: str
    Email: Optional[str] = None
    Phone: str

class FamilyLink(BaseModel):
    StudentID: int
    ParentID: int

# Small Group Management Models
class SmallGroupCreate(BaseModel):
    Grade: str

class StudentGroupAssignment(BaseModel):
    StudentID: int
    SmallGroupID: int

# Leader Management Models
class LeaderCreate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    SmallGroupID: Optional[int] = None

# Volunteer Management Models
class VolunteerCreate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    Email: Optional[str] = None
    Phone: str

class VolunteerEventAssignment(BaseModel):
    VolunteerID: int
    EventID: int
    StudentID: Optional[int] = None

# Partner's Fun API Models
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

# --- Student CRUD Endpoints ---

@app.get("/students", tags=["Students"])
def get_all_students():
    """Get all students from the database."""
    try:
        cnx = get_mysql_pool().get_connection()
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

@app.get("/students/{student_id}", tags=["Students"])
def get_student(student_id: int):
    """Get a single student by ID."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, FirstName, LastName, Grade FROM student WHERE Id = %s;", (student_id,))
        student = cursor.fetchone()

        if not student:
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

        return student
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.post("/students", tags=["Students"])
def create_student(payload: StudentCreate):
    """Create a new student."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        insert_sql = "INSERT INTO student (FirstName, LastName, Grade) VALUES (%s, %s, %s);"
        cursor.execute(insert_sql, (payload.FirstName, payload.LastName, payload.Grade))
        cnx.commit()

        student_id = cursor.lastrowid

        # Fetch the created student
        cursor.execute("SELECT Id, FirstName, LastName, Grade FROM student WHERE Id = %s;", (student_id,))
        new_student = cursor.fetchone()

        return new_student
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.put("/students/{student_id}", tags=["Students"])
def update_student(student_id: int, payload: StudentUpdate):
    """Update a student's information."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if student exists
        cursor.execute("SELECT Id FROM student WHERE Id = %s;", (student_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

        # Build update query dynamically based on provided fields
        update_parts = []
        update_values = []

        if payload.FirstName is not None:
            update_parts.append("FirstName = %s")
            update_values.append(payload.FirstName)
        if payload.LastName is not None:
            update_parts.append("LastName = %s")
            update_values.append(payload.LastName)
        if payload.Grade is not None:
            update_parts.append("Grade = %s")
            update_values.append(payload.Grade)

        if not update_parts:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_sql = f"UPDATE student SET {', '.join(update_parts)} WHERE Id = %s;"
        update_values.append(student_id)
        cursor.execute(update_sql, tuple(update_values))
        cnx.commit()

        # Fetch updated student
        cursor.execute("SELECT Id, FirstName, LastName, Grade FROM student WHERE Id = %s;", (student_id,))
        updated_student = cursor.fetchone()

        return updated_student
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/students/{student_id}", tags=["Students"])
def delete_student(student_id: int):
    """Delete a student and all associated data."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()

        # Check if student exists
        cursor.execute("SELECT Id FROM student WHERE Id = %s;", (student_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

        # Delete associated records first (foreign key constraints)
        cursor.execute("DELETE FROM registration WHERE StudentID = %s;", (student_id,))
        registrations_deleted = cursor.rowcount

        cursor.execute("DELETE FROM sign_up WHERE StudentID = %s;", (student_id,))
        signups_deleted = cursor.rowcount

        cursor.execute("DELETE FROM weekly_attendance WHERE StudentID = %s;", (student_id,))
        attendance_deleted = cursor.rowcount

        cursor.execute("DELETE FROM family WHERE StudentID = %s;", (student_id,))
        family_deleted = cursor.rowcount

        # Delete the student
        cursor.execute("DELETE FROM student WHERE Id = %s;", (student_id,))
        cnx.commit()

        return {
            "message": f"Student {student_id} deleted successfully",
            "registrations_deleted": registrations_deleted,
            "signups_deleted": signups_deleted,
            "attendance_deleted": attendance_deleted,
            "family_links_deleted": family_deleted
        }
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

# --- Parent/Guardian CRUD Endpoints ---

@app.get("/parents", tags=["Parents"])
def get_all_parents():
    """Get all parents/guardians from the database."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, FirstName, LastName, Relationship, Email, Phone FROM parent_guardian ORDER BY LastName, FirstName;")
        parents = cursor.fetchall()
        return parents
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.get("/parents/{parent_id}", tags=["Parents"])
def get_parent(parent_id: int):
    """Get a single parent by ID with their linked students."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Get parent info
        cursor.execute("SELECT Id, FirstName, LastName, Relationship, Email, Phone FROM parent_guardian WHERE Id = %s;", (parent_id,))
        parent = cursor.fetchone()

        if not parent:
            raise HTTPException(status_code=404, detail=f"Parent {parent_id} not found")

        # Get linked students
        cursor.execute("""
            SELECT s.Id, s.FirstName, s.LastName, s.Grade
            FROM student s
            JOIN family f ON s.Id = f.StudentID
            WHERE f.ParentID = %s;
        """, (parent_id,))
        parent['students'] = cursor.fetchall()

        return parent
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.post("/parents", tags=["Parents"])
def create_parent(payload: ParentCreate):
    """Create a new parent/guardian."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        insert_sql = "INSERT INTO parent_guardian (FirstName, LastName, Relationship, Email, Phone) VALUES (%s, %s, %s, %s, %s);"
        cursor.execute(insert_sql, (payload.FirstName, payload.LastName, payload.Relationship, payload.Email, payload.Phone))
        cnx.commit()

        parent_id = cursor.lastrowid

        # Fetch the created parent
        cursor.execute("SELECT Id, FirstName, LastName, Relationship, Email, Phone FROM parent_guardian WHERE Id = %s;", (parent_id,))
        new_parent = cursor.fetchone()

        return new_parent
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.put("/parents/{parent_id}", tags=["Parents"])
def update_parent(parent_id: int, payload: ParentUpdate):
    """Update a parent's information."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if parent exists
        cursor.execute("SELECT Id FROM parent_guardian WHERE Id = %s;", (parent_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Parent {parent_id} not found")

        # Build update query dynamically
        update_parts = []
        update_values = []

        if payload.FirstName is not None:
            update_parts.append("FirstName = %s")
            update_values.append(payload.FirstName)
        if payload.LastName is not None:
            update_parts.append("LastName = %s")
            update_values.append(payload.LastName)
        if payload.Relationship is not None:
            update_parts.append("Relationship = %s")
            update_values.append(payload.Relationship)
        if payload.Email is not None:
            update_parts.append("Email = %s")
            update_values.append(payload.Email)
        if payload.Phone is not None:
            update_parts.append("Phone = %s")
            update_values.append(payload.Phone)

        if not update_parts:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_sql = f"UPDATE parent_guardian SET {', '.join(update_parts)} WHERE Id = %s;"
        update_values.append(parent_id)
        cursor.execute(update_sql, tuple(update_values))
        cnx.commit()

        # Fetch updated parent
        cursor.execute("SELECT Id, FirstName, LastName, Relationship, Email, Phone FROM parent_guardian WHERE Id = %s;", (parent_id,))
        updated_parent = cursor.fetchone()

        return updated_parent
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/parents/{parent_id}", tags=["Parents"])
def delete_parent(parent_id: int):
    """Delete a parent and their family links."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()

        # Check if parent exists
        cursor.execute("SELECT Id FROM parent_guardian WHERE Id = %s;", (parent_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Parent {parent_id} not found")

        # Delete family links first
        cursor.execute("DELETE FROM family WHERE ParentID = %s;", (parent_id,))
        links_deleted = cursor.rowcount

        # Delete the parent
        cursor.execute("DELETE FROM parent_guardian WHERE Id = %s;", (parent_id,))
        cnx.commit()

        return {
            "message": f"Parent {parent_id} deleted successfully",
            "family_links_deleted": links_deleted
        }
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

# --- Family Link Endpoints ---

@app.post("/family", tags=["Family"])
def link_parent_to_student(payload: FamilyLink):
    """Link a parent to a student."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if student exists
        cursor.execute("SELECT Id FROM student WHERE Id = %s;", (payload.StudentID,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Student {payload.StudentID} not found")

        # Check if parent exists
        cursor.execute("SELECT Id FROM parent_guardian WHERE Id = %s;", (payload.ParentID,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Parent {payload.ParentID} not found")

        # Check if link already exists
        cursor.execute("SELECT * FROM family WHERE StudentID = %s AND ParentID = %s;", (payload.StudentID, payload.ParentID))
        if cursor.fetchone():
            return {"message": "Link already exists", "StudentID": payload.StudentID, "ParentID": payload.ParentID}

        # Create the link
        cursor.execute("INSERT INTO family (StudentID, ParentID) VALUES (%s, %s);", (payload.StudentID, payload.ParentID))
        cnx.commit()

        return {"message": "Parent linked to student successfully", "StudentID": payload.StudentID, "ParentID": payload.ParentID}
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/family/{student_id}/{parent_id}", tags=["Family"])
def unlink_parent_from_student(student_id: int, parent_id: int):
    """Unlink a parent from a student."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()

        # Check if link exists
        cursor.execute("SELECT * FROM family WHERE StudentID = %s AND ParentID = %s;", (student_id, parent_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Family link not found")

        # Delete the link
        cursor.execute("DELETE FROM family WHERE StudentID = %s AND ParentID = %s;", (student_id, parent_id))
        cnx.commit()

        return {"message": "Parent unlinked from student successfully"}
    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.get("/students/{student_id}/parents", tags=["Students", "Family"])
def get_student_parents(student_id: int):
    """Get all parents/guardians for a student."""
    try:
        cnx = get_mysql_pool().get_connection()
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

# ==================== SMALL GROUP MANAGEMENT ====================
class SmallGroupCreate(BaseModel):
    Grade: str

@app.get("/small-groups")
def get_all_small_groups():
    """Fetch all small groups"""
    try:
        cnx = get_mysql_pool().get_connection()
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

@app.get("/small-groups/{group_id}")
def get_small_group(group_id: int):
    """Fetch a single small group with its students"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Get group details
        cursor.execute("SELECT Id, Grade FROM small_group WHERE Id = %s;", (group_id,))
        group = cursor.fetchone()

        if not group:
            raise HTTPException(status_code=404, detail="Small group not found")

        # Get students in this group
        cursor.execute("""
            SELECT s.Id, s.FirstName, s.LastName, s.Grade, su.SignUpDate
            FROM student s
            JOIN sign_up su ON s.Id = su.StudentID
            WHERE su.SmallGroupID = %s
            ORDER BY s.FirstName, s.LastName;
        """, (group_id,))
        students = cursor.fetchall()

        group['students'] = students
        return group
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.post("/small-groups")
def create_small_group(group: SmallGroupCreate):
    """Create a new small group"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("INSERT INTO small_group (Grade) VALUES (%s);", (group.Grade,))
        cnx.commit()

        group_id = cursor.lastrowid
        cursor.execute("SELECT Id, Grade FROM small_group WHERE Id = %s;", (group_id,))
        new_group = cursor.fetchone()

        return new_group
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.put("/small-groups/{group_id}")
def update_small_group(group_id: int, group: SmallGroupCreate):
    """Update an existing small group"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if group exists
        cursor.execute("SELECT Id FROM small_group WHERE Id = %s;", (group_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Small group not found")

        cursor.execute("UPDATE small_group SET Grade = %s WHERE Id = %s;", (group.Grade, group_id))
        cnx.commit()

        cursor.execute("SELECT Id, Grade FROM small_group WHERE Id = %s;", (group_id,))
        updated_group = cursor.fetchone()

        return updated_group
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/small-groups/{group_id}")
def delete_small_group(group_id: int):
    """Delete a small group and all student assignments"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if group exists
        cursor.execute("SELECT Id FROM small_group WHERE Id = %s;", (group_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Small group not found")

        # Delete student assignments first
        cursor.execute("DELETE FROM sign_up WHERE SmallGroupID = %s;", (group_id,))

        # Delete the group
        cursor.execute("DELETE FROM small_group WHERE Id = %s;", (group_id,))
        cnx.commit()

        return {"message": "Small group deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

# Student-to-SmallGroup assignment endpoints
class StudentGroupAssignment(BaseModel):
    StudentID: int
    SmallGroupID: int

@app.post("/small-groups/assign")
def assign_student_to_group(assignment: StudentGroupAssignment):
    """Assign a student to a small group"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if already assigned
        cursor.execute("""
            SELECT * FROM sign_up
            WHERE StudentID = %s AND SmallGroupID = %s;
        """, (assignment.StudentID, assignment.SmallGroupID))

        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Student already assigned to this group")

        # Insert assignment
        cursor.execute("""
            INSERT INTO sign_up (StudentID, SmallGroupID, SignUpDate)
            VALUES (%s, %s, CURDATE());
        """, (assignment.StudentID, assignment.SmallGroupID))
        cnx.commit()

        return {"message": "Student assigned to group successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/small-groups/assign/{student_id}/{group_id}")
def unassign_student_from_group(student_id: int, group_id: int):
    """Remove a student from a small group"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("""
            DELETE FROM sign_up
            WHERE StudentID = %s AND SmallGroupID = %s;
        """, (student_id, group_id))
        cnx.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")

        return {"message": "Student unassigned from group successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

# ==================== LEADER MANAGEMENT ====================
class LeaderCreate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    SmallGroupID: Optional[int] = None

@app.get("/leaders")
def get_all_leaders():
    """Fetch all leaders with their assigned small groups"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("""
            SELECT l.Id, l.FirstName, l.LastName, l.SmallGroupID, sg.Grade
            FROM leader l
            LEFT JOIN small_group sg ON l.SmallGroupID = sg.Id
            ORDER BY l.FirstName, l.LastName;
        """)
        leaders = cursor.fetchall()
        return leaders
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.get("/leaders/{leader_id}")
def get_leader(leader_id: int):
    """Fetch a single leader with their assigned small group"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("""
            SELECT l.Id, l.FirstName, l.LastName, l.SmallGroupID, sg.Grade
            FROM leader l
            LEFT JOIN small_group sg ON l.SmallGroupID = sg.Id
            WHERE l.Id = %s;
        """, (leader_id,))
        leader = cursor.fetchone()

        if not leader:
            raise HTTPException(status_code=404, detail="Leader not found")

        return leader
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.post("/leaders")
def create_leader(leader: LeaderCreate):
    """Create a new leader"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Verify SmallGroupID exists if provided
        if leader.SmallGroupID:
            cursor.execute("SELECT Id FROM small_group WHERE Id = %s;", (leader.SmallGroupID,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Small group not found")

        cursor.execute("""
            INSERT INTO leader (FirstName, LastName, SmallGroupID)
            VALUES (%s, %s, %s);
        """, (leader.FirstName, leader.LastName, leader.SmallGroupID))
        cnx.commit()

        leader_id = cursor.lastrowid
        cursor.execute("""
            SELECT l.Id, l.FirstName, l.LastName, l.SmallGroupID, sg.Grade
            FROM leader l
            LEFT JOIN small_group sg ON l.SmallGroupID = sg.Id
            WHERE l.Id = %s;
        """, (leader_id,))
        new_leader = cursor.fetchone()

        return new_leader
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.put("/leaders/{leader_id}")
def update_leader(leader_id: int, leader: LeaderCreate):
    """Update an existing leader"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if leader exists
        cursor.execute("SELECT Id FROM leader WHERE Id = %s;", (leader_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Leader not found")

        # Verify SmallGroupID exists if provided
        if leader.SmallGroupID:
            cursor.execute("SELECT Id FROM small_group WHERE Id = %s;", (leader.SmallGroupID,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Small group not found")

        cursor.execute("""
            UPDATE leader
            SET FirstName = %s, LastName = %s, SmallGroupID = %s
            WHERE Id = %s;
        """, (leader.FirstName, leader.LastName, leader.SmallGroupID, leader_id))
        cnx.commit()

        cursor.execute("""
            SELECT l.Id, l.FirstName, l.LastName, l.SmallGroupID, sg.Grade
            FROM leader l
            LEFT JOIN small_group sg ON l.SmallGroupID = sg.Id
            WHERE l.Id = %s;
        """, (leader_id,))
        updated_leader = cursor.fetchone()

        return updated_leader
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/leaders/{leader_id}")
def delete_leader(leader_id: int):
    """Delete a leader"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if leader exists
        cursor.execute("SELECT Id FROM leader WHERE Id = %s;", (leader_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Leader not found")

        cursor.execute("DELETE FROM leader WHERE Id = %s;", (leader_id,))
        cnx.commit()

        return {"message": "Leader deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

# ==================== VOLUNTEER MANAGEMENT ====================
class VolunteerCreate(BaseModel):
    FirstName: str
    LastName: Optional[str] = None
    Email: Optional[str] = None
    Phone: str

@app.get("/volunteers")
def get_all_volunteers():
    """Fetch all volunteers"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("""
            SELECT Id, FirstName, LastName, Email, Phone
            FROM volunteer
            ORDER BY FirstName, LastName;
        """)
        volunteers = cursor.fetchall()
        return volunteers
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.get("/volunteers/{volunteer_id}")
def get_volunteer(volunteer_id: int):
    """Fetch a single volunteer with their event assignments"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("""
            SELECT Id, FirstName, LastName, Email, Phone
            FROM volunteer
            WHERE Id = %s;
        """, (volunteer_id,))
        volunteer = cursor.fetchone()

        if not volunteer:
            raise HTTPException(status_code=404, detail="Volunteer not found")

        # Get events they're assigned to
        cursor.execute("""
            SELECT DISTINCT e.Id, e.Description, e.Address
            FROM event e
            JOIN volunteer_log vl ON e.Id = vl.EventID
            WHERE vl.VolunteerID = %s
            ORDER BY e.Id;
        """, (volunteer_id,))
        events = cursor.fetchall()

        volunteer['events'] = events
        return volunteer
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.post("/volunteers")
def create_volunteer(volunteer: VolunteerCreate):
    """Create a new volunteer"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("""
            INSERT INTO volunteer (FirstName, LastName, Email, Phone)
            VALUES (%s, %s, %s, %s);
        """, (volunteer.FirstName, volunteer.LastName, volunteer.Email, volunteer.Phone))
        cnx.commit()

        volunteer_id = cursor.lastrowid
        cursor.execute("""
            SELECT Id, FirstName, LastName, Email, Phone
            FROM volunteer
            WHERE Id = %s;
        """, (volunteer_id,))
        new_volunteer = cursor.fetchone()

        return new_volunteer
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.put("/volunteers/{volunteer_id}")
def update_volunteer(volunteer_id: int, volunteer: VolunteerCreate):
    """Update an existing volunteer"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if volunteer exists
        cursor.execute("SELECT Id FROM volunteer WHERE Id = %s;", (volunteer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Volunteer not found")

        cursor.execute("""
            UPDATE volunteer
            SET FirstName = %s, LastName = %s, Email = %s, Phone = %s
            WHERE Id = %s;
        """, (volunteer.FirstName, volunteer.LastName, volunteer.Email, volunteer.Phone, volunteer_id))
        cnx.commit()

        cursor.execute("""
            SELECT Id, FirstName, LastName, Email, Phone
            FROM volunteer
            WHERE Id = %s;
        """, (volunteer_id,))
        updated_volunteer = cursor.fetchone()

        return updated_volunteer
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/volunteers/{volunteer_id}")
def delete_volunteer(volunteer_id: int):
    """Delete a volunteer and all their event assignments"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if volunteer exists
        cursor.execute("SELECT Id FROM volunteer WHERE Id = %s;", (volunteer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Volunteer not found")

        # Delete event assignments first
        cursor.execute("DELETE FROM volunteer_log WHERE VolunteerID = %s;", (volunteer_id,))

        # Delete the volunteer
        cursor.execute("DELETE FROM volunteer WHERE Id = %s;", (volunteer_id,))
        cnx.commit()

        return {"message": "Volunteer deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

# Volunteer-to-Event assignment endpoints
class VolunteerEventAssignment(BaseModel):
    VolunteerID: int
    EventID: int
    StudentID: Optional[int] = None

@app.post("/volunteers/assign")
def assign_volunteer_to_event(assignment: VolunteerEventAssignment):
    """Assign a volunteer to an event"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        # Check if already assigned
        cursor.execute("""
            SELECT * FROM volunteer_log
            WHERE VolunteerID = %s AND EventID = %s;
        """, (assignment.VolunteerID, assignment.EventID))

        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Volunteer already assigned to this event")

        # Insert assignment
        cursor.execute("""
            INSERT INTO volunteer_log (VolunteerID, EventID, StudentID)
            VALUES (%s, %s, %s);
        """, (assignment.VolunteerID, assignment.EventID, assignment.StudentID))
        cnx.commit()

        return {"message": "Volunteer assigned to event successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.delete("/volunteers/assign/{volunteer_id}/{event_id}")
def unassign_volunteer_from_event(volunteer_id: int, event_id: int):
    """Remove a volunteer from an event"""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("""
            DELETE FROM volunteer_log
            WHERE VolunteerID = %s AND EventID = %s;
        """, (volunteer_id, event_id))
        cnx.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")

        return {"message": "Volunteer unassigned from event successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

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

# --- Event Creation with Multi-Database Support ---
# This endpoint demonstrates how we use multiple databases together
# MySQL stores the core event data (description, address, type)
# MongoDB stores flexible custom fields (like "theme", "attendance goal", etc.)
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

@app.delete("/events/{event_id}", tags=["Events"])
def delete_event(event_id: int):
    """
    Deletes an event and all associated data.

    This will delete:
    - The event record from MySQL
    - All registrations for the event
    - Any custom data in MongoDB
    - Any live attendance data in Redis

    Args:
        event_id: The event ID to delete

    Returns:
        Success message
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()

        # Check if event exists
        cursor.execute("SELECT Id FROM event WHERE Id = %s", (event_id,))
        event = cursor.fetchone()

        if not event:
            cursor.close()
            cnx.close()
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        # Delete registrations first (foreign key constraint)
        cursor.execute("DELETE FROM registration WHERE EventID = %s", (event_id,))
        registrations_deleted = cursor.rowcount

        # Delete the event
        cursor.execute("DELETE FROM event WHERE Id = %s", (event_id,))
        cnx.commit()

        cursor.close()
        cnx.close()

        # TODO: Also delete MongoDB custom data and Redis attendance if they exist
        # This would require additional cleanup functions

        return {
            "message": f"Event {event_id} deleted successfully",
            "registrations_deleted": registrations_deleted
        }

    except HTTPException:
        raise
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event: {e}")

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

# --- MULTI-DATABASE INTEGRATION SHOWCASE ---
# This endpoint is the coolest part of our project - it combines data from all 3 databases!
# MySQL has the structured event info, MongoDB has flexible custom fields,
# and Redis has the real-time attendance. All in one response.
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
            if mongo_db is not None:
                schema_doc = {
                    "typeId": event_type_id,
                    "name": payload.name,
                    "description": payload.description,
                    "fields": payload.custom_fields,
                    "createdAt": datetime.utcnow().isoformat()
                }
                mongo_db.eventTypes.insert_one(schema_doc)
            else:
                print(f"MongoDB unavailable - event type {event_type_id} created in MySQL only (custom fields not stored)")
        except ConnectionError as e:
            # This will now catch the MongoDB connection error
            print(f"MongoDB connection error for event type {event_type_id}: {e}")
            # Don't raise - allow creation to succeed in MySQL
        except Exception as e:
            print(f"MongoDB error for event type {event_type_id}: {e}")
            # Don't raise - allow creation to succeed in MySQL

    return {
        "id": event_type_id,
        "name": payload.name,
        "description": payload.description,
        "custom_fields": payload.custom_fields,
    }

@app.get("/event-types/all-schemas", tags=["Event Types", "MongoDB"])
def get_all_event_type_schemas_endpoint():
    """
    Retrieves all event type schemas from MongoDB, including their custom fields.
    This endpoint is designed to showcase MongoDB's flexible schema.
    """
    try:
        schemas = get_all_event_type_schemas()
        return schemas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching all event type schemas: {e}")

@app.get("/event-types", tags=["Event Types"])
def get_all_event_types():
    """
    Retrieves all event types from MySQL (the source of truth).
    Only returns event types that actually exist in the database.

    Returns:
        List of event types with their basic info
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)

        query = "SELECT Id as typeId, Name as name, Description as description FROM event_type ORDER BY Id;"
        cursor.execute(query)
        event_types = cursor.fetchall()

        cursor.close()
        cnx.close()

        return event_types
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error (MySQL): {err}")
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

# --- Redis Live Attendance System ---
# These endpoints use Redis to track who's checked in during an event in real-time
# Redis is super fast so checking in/out hundreds of students is no problem
# When the event is over, we call finalize to move everything to MySQL permanently
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

# This endpoint is a toggle - if the student is already checked in, it checks them out
# Otherwise it checks them in. Perfect for QR code scanners at the door
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

# IMPORTANT: This endpoint moves data from Redis (temporary) to MySQL (permanent)
# Call this when the event is over to save the final attendance record
# Redis data gets deleted after this, so only call it once at the end!
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
class RegistrationCreate(BaseModel):
    EventID: int
    StudentID: int

@app.post("/registrations", tags=["Registrations"])
def create_registration(payload: RegistrationCreate):
    """
    Register a student for an event.

    Args:
        payload: Contains EventID and StudentID

    Returns:
        The created registration record
    """
    EventID = payload.EventID
    StudentID = payload.StudentID
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



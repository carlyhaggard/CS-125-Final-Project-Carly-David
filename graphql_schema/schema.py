"""
GraphQL Schema for Youth Group Management System

This file defines the GraphQL schema that combines data from:
- MySQL: Students, Events, Registrations, Event Types
- MongoDB: Event Type Schemas, Custom Event Data
- Redis: Real-time Attendance

Key Benefits:
1. Single query to fetch related data across all three databases
2. Reduces network round-trips (1 query instead of 4-5 REST calls)
3. Client specifies exactly what data they need
4. Built-in documentation via GraphiQL interface
"""

import strawberry
from typing import List, Optional, Dict, Any
from datetime import datetime

# Import existing REST API functions and database connections
from YouthGroupAPI import (
    get_all_events as get_all_events_rest,
    get_event_registrations as get_event_registrations_rest,
)
from database import get_mysql_pool, get_mongo_db, get_redis_conn
from setup_mongo import get_event_type_schema, get_all_event_type_schemas, get_event_custom_data
from setup_redis import get_live_attendance
from fastapi import HTTPException
import mysql.connector

# --- GraphQL Type Definitions ---
# These represent the shape of data that can be queried

@strawberry.type
class Student:
    """GraphQL type representing a student from MySQL."""
    id: int
    first_name: str
    last_name: Optional[str]
    grade: str

@strawberry.type
class Parent:
    """GraphQL type representing a parent/guardian from MySQL."""
    id: int
    first_name: str
    last_name: str
    relationship: str
    email: Optional[str]
    phone: Optional[str]

@strawberry.type
class EventTypeField:
    """GraphQL type for a single custom field definition in an event type."""
    name: str
    type: str
    required: bool

@strawberry.type
class EventType:
    """GraphQL type representing an event type with its schema from MongoDB."""
    id: int
    name: str
    description: Optional[str]
    custom_fields: List[EventTypeField]

@strawberry.type
class Registration:
    """GraphQL type representing a student registration for an event."""
    id: int
    student_id: int
    student: Optional[Student]  # Nested student data

@strawberry.type
class AttendanceRecord:
    """GraphQL type for a single student's attendance record from Redis."""
    student_id: int
    check_in_time: Optional[str]
    check_out_time: Optional[str]

@strawberry.type
class LiveAttendance:
    """GraphQL type for real-time event attendance from Redis."""
    event_id: int
    checked_in_count: int
    students: List[AttendanceRecord]

@strawberry.type
class Event:
    """
    GraphQL type representing a complete event with data from all three databases.

    This is the POWER of GraphQL for your system!
    - Base event info: MySQL
    - Event type schema: MongoDB
    - Custom field values: MongoDB
    - Registrations: MySQL
    - Live attendance: Redis
    """
    id: int
    description: Optional[str]
    address: str
    type_id: Optional[int]

    # Nested related data - GraphQL will resolve these on demand
    event_type: Optional[EventType] = None
    custom_data: Optional[strawberry.scalars.JSON] = None
    registrations: Optional[List[Registration]] = None
    live_attendance: Optional[LiveAttendance] = None

@strawberry.type
class SmallGroup:
    """GraphQL type for small group information."""
    id: int
    grade: str

# --- Input Types for Mutations ---

@strawberry.input
class CheckInInput:
    """Input type for checking a student in/out."""
    student_id: int

@strawberry.input
class EventCreateInput:
    """Input type for creating a new event."""
    description: str
    address: str
    type_id: Optional[int] = None
    custom_data: Optional[strawberry.scalars.JSON] = None


# --- Resolver Functions ---
# These functions fetch data from your databases

def get_all_students_resolver() -> List[Student]:
    """Resolver to fetch all students from MySQL."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, FirstName, LastName, Grade FROM student ORDER BY LastName, FirstName;")
        students_data = cursor.fetchall()

        # Convert MySQL column names to GraphQL field names
        return [
            Student(
                id=s['Id'],
                first_name=s['FirstName'],
                last_name=s['LastName'],
                grade=s['Grade']
            ) for s in students_data
        ]
    except mysql.connector.Error as err:
        raise Exception(f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_student_by_id_resolver(student_id: int) -> Optional[Student]:
    """Resolver to fetch a single student by ID from MySQL."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = "SELECT Id, FirstName, LastName, Grade FROM student WHERE Id = %s;"
        cursor.execute(query, (student_id,))
        student_data = cursor.fetchone()

        if not student_data:
            return None

        return Student(
            id=student_data['Id'],
            first_name=student_data['FirstName'],
            last_name=student_data['LastName'],
            grade=student_data['Grade']
        )
    except mysql.connector.Error as err:
        raise Exception(f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_student_parents_resolver(student_id: int) -> List[Parent]:
    """Resolver to fetch parents/guardians for a student."""
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
        parents_data = cursor.fetchall()

        return [
            Parent(
                id=p['Id'],
                first_name=p['FirstName'],
                last_name=p['LastName'],
                relationship=p['Relationship'],
                email=p['Email'],
                phone=p['Phone']
            ) for p in parents_data
        ]
    except mysql.connector.Error as err:
        raise Exception(f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_all_events_resolver() -> List[Event]:
    """Resolver to fetch all events from MySQL."""
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT Id, Description, Address, TypeID FROM event ORDER BY Id;")
        events_data = cursor.fetchall()

        return [
            Event(
                id=e['Id'],
                description=e['Description'],
                address=e['Address'],
                type_id=e['TypeID']
            ) for e in events_data
        ]
    except mysql.connector.Error as err:
        raise Exception(f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_event_by_id_resolver(event_id: int) -> Optional[Event]:
    """
    Resolver to fetch a single event by ID.
    This is where GraphQL shines - we fetch base data here,
    and nested resolvers handle related data on demand.
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = "SELECT Id, Description, Address, TypeID FROM event WHERE Id = %s;"
        cursor.execute(query, (event_id,))
        event_data = cursor.fetchone()

        if not event_data:
            return None

        return Event(
            id=event_data['Id'],
            description=event_data['Description'],
            address=event_data['Address'],
            type_id=event_data['TypeID']
        )
    except mysql.connector.Error as err:
        raise Exception(f"Database error: {err}")
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_event_type_resolver(event: Event) -> Optional[EventType]:
    """
    Nested resolver for Event.event_type field.
    This is called ONLY if the client requests the eventType field.
    Combines data from MySQL and MongoDB.
    """
    if not event.type_id:
        return None

    try:
        # Fetch schema from MongoDB
        schema = get_event_type_schema(event.type_id)
        if not schema:
            return None

        # Convert MongoDB field definitions to GraphQL types
        custom_fields = [
            EventTypeField(
                name=field.get('name', ''),
                type=field.get('type', 'text'),
                required=field.get('required', False)
            ) for field in schema.get('fields', [])
        ]

        return EventType(
            id=event.type_id,
            name=schema.get('name', ''),
            description=schema.get('description'),
            custom_fields=custom_fields
        )
    except Exception as e:
        print(f"Error fetching event type: {e}")
        return None

def get_event_custom_data_resolver(event: Event) -> Optional[Dict[str, Any]]:
    """
    Nested resolver for Event.custom_data field.
    Fetches custom field values from MongoDB.
    """
    try:
        custom_data = get_event_custom_data(event.id)
        if not custom_data or 'customData' not in custom_data:
            return None
        return custom_data['customData']
    except Exception as e:
        print(f"Error fetching custom data: {e}")
        return None

def get_event_registrations_resolver(event: Event) -> List[Registration]:
    """
    Nested resolver for Event.registrations field.
    Fetches registrations from MySQL with student details.
    """
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor(dictionary=True)
        query = """
            SELECT r.Id, r.StudentID, s.FirstName, s.LastName, s.Grade
            FROM registration r
            JOIN student s ON r.StudentID = s.Id
            WHERE r.EventID = %s
            ORDER BY s.LastName;
        """
        cursor.execute(query, (event.id,))
        registrations_data = cursor.fetchall()

        return [
            Registration(
                id=r['Id'],
                student_id=r['StudentID'],
                student=Student(
                    id=r['StudentID'],
                    first_name=r['FirstName'],
                    last_name=r['LastName'],
                    grade=r['Grade']
                )
            ) for r in registrations_data
        ]
    except mysql.connector.Error as err:
        print(f"Error fetching registrations: {err}")
        return []
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_event_live_attendance_resolver(event: Event) -> Optional[LiveAttendance]:
    """
    Nested resolver for Event.live_attendance field.
    Fetches real-time attendance data from Redis.
    """
    try:
        attendance_data = get_live_attendance(event.id)

        students = [
            AttendanceRecord(
                student_id=int(record['student_id']),
                check_in_time=record.get('check_in_time'),
                check_out_time=record.get('check_out_time')
            ) for record in attendance_data.get('students', [])
        ]

        return LiveAttendance(
            event_id=event.id,
            checked_in_count=attendance_data.get('checked_in_count', 0),
            students=students
        )
    except Exception as e:
        print(f"Error fetching live attendance: {e}")
        return None

def get_all_event_types_resolver() -> List[EventType]:
    """Resolver to fetch all event types from MongoDB."""
    try:
        schemas = get_all_event_type_schemas()

        return [
            EventType(
                id=schema.get('typeId'),
                name=schema.get('name', ''),
                description=schema.get('description'),
                custom_fields=[
                    EventTypeField(
                        name=field.get('name', ''),
                        type=field.get('type', 'text'),
                        required=field.get('required', False)
                    ) for field in schema.get('fields', [])
                ]
            ) for schema in schemas
        ]
    except Exception as e:
        raise Exception(f"Error fetching event types: {e}")

def get_live_attendance_resolver(event_id: int) -> Optional[LiveAttendance]:
    """Resolver to fetch live attendance for an event from Redis."""
    try:
        attendance_data = get_live_attendance(event_id)

        students = [
            AttendanceRecord(
                student_id=int(record['student_id']),
                check_in_time=record.get('check_in_time'),
                check_out_time=record.get('check_out_time')
            ) for record in attendance_data.get('students', [])
        ]

        return LiveAttendance(
            event_id=event_id,
            checked_in_count=attendance_data.get('checked_in_count', 0),
            students=students
        )
    except Exception as e:
        print(f"Error fetching live attendance: {e}")
        return None


# --- Mutation Resolvers ---

def check_in_student_resolver(event_id: int, input: CheckInInput) -> bool:
    """
    Resolver to check a student in/out of an event.
    Uses Redis for real-time tracking.
    """
    try:
        from setup_redis import student_checkin_edit
        status = student_checkin_edit(event_id, input.student_id)
        return True
    except Exception as e:
        raise Exception(f"Error checking in student: {e}")


# --- Extended Student Type with Nested Resolvers ---

@strawberry.type
class StudentExtended:
    """
    Extended student type with relationships.
    Demonstrates the power of GraphQL for complex data fetching.
    """
    id: int
    first_name: str
    last_name: Optional[str]
    grade: str

    @strawberry.field
    def parents(self) -> List[Parent]:
        """Fetch parents for this student."""
        return get_student_parents_resolver(self.id)

    @strawberry.field
    def registered_events(self) -> List[Event]:
        """Fetch all events this student is registered for."""
        try:
            cnx = get_mysql_pool().get_connection()
            cursor = cnx.cursor(dictionary=True)
            query = """
                SELECT e.Id, e.Description, e.Address, e.TypeID
                FROM event e
                JOIN registration r ON e.Id = r.EventID
                WHERE r.StudentID = %s
                ORDER BY e.Id;
            """
            cursor.execute(query, (self.id,))
            events_data = cursor.fetchall()

            return [
                Event(
                    id=e['Id'],
                    description=e['Description'],
                    address=e['Address'],
                    type_id=e['TypeID']
                ) for e in events_data
            ]
        except mysql.connector.Error as err:
            print(f"Error fetching student events: {err}")
            return []
        finally:
            if 'cnx' in locals() and cnx.is_connected():
                cursor.close()
                cnx.close()

    @strawberry.field
    def small_group(self) -> Optional[SmallGroup]:
        """Fetch the student's small group."""
        try:
            cnx = get_mysql_pool().get_connection()
            cursor = cnx.cursor(dictionary=True)
            query = """
                SELECT sg.Id, sg.Grade
                FROM small_group sg
                JOIN sign_up su ON sg.Id = su.SmallGroupID
                WHERE su.StudentID = %s;
            """
            cursor.execute(query, (self.id,))
            sg_data = cursor.fetchone()

            if sg_data:
                return SmallGroup(id=sg_data['Id'], grade=sg_data['Grade'])
            return None
        except mysql.connector.Error as err:
            print(f"Error fetching small group: {err}")
            return None
        finally:
            if 'cnx' in locals() and cnx.is_connected():
                cursor.close()
                cnx.close()


# --- Query Type ---
# This defines all the read operations available in the GraphQL API

@strawberry.type
class Query:
    """
    Root Query type defining all read operations.
    Each field can be queried independently or combined in a single request.
    """

    @strawberry.field
    def students(self) -> List[Student]:
        """Fetch all students from MySQL."""
        return get_all_students_resolver()

    @strawberry.field
    def student(self, id: int) -> Optional[StudentExtended]:
        """
        Fetch a single student by ID with optional nested data.
        Example query:
          student(id: 1) {
            firstName
            lastName
            parents { firstName, email }
            registeredEvents { description }
          }
        """
        student = get_student_by_id_resolver(id)
        if not student:
            return None
        return StudentExtended(
            id=student.id,
            first_name=student.first_name,
            last_name=student.last_name,
            grade=student.grade
        )

    @strawberry.field
    def events(self) -> List[Event]:
        """Fetch all events from MySQL."""
        return get_all_events_resolver()

    @strawberry.field
    def event(self, id: int) -> Optional[Event]:
        """
        Fetch a single event by ID with optional nested data.
        This is THE KILLER FEATURE - fetch everything in one query!

        Example query:
          event(id: 1) {
            description
            address
            eventType { name, customFields { name, type } }
            customData
            registrations { student { firstName, lastName } }
            liveAttendance { checkedInCount, students { studentId } }
          }
        """
        event = get_event_by_id_resolver(id)
        if not event:
            return None

        # Populate nested fields based on what the client requested
        # GraphQL's field resolvers handle this automatically
        return event

    @strawberry.field
    def event_types(self) -> List[EventType]:
        """Fetch all event types with their schemas from MongoDB."""
        return get_all_event_types_resolver()

    @strawberry.field
    def event_type(self, id: int) -> Optional[EventType]:
        """Fetch a specific event type schema by ID."""
        try:
            schema = get_event_type_schema(id)
            if not schema:
                return None

            custom_fields = [
                EventTypeField(
                    name=field.get('name', ''),
                    type=field.get('type', 'text'),
                    required=field.get('required', False)
                ) for field in schema.get('fields', [])
            ]

            return EventType(
                id=id,
                name=schema.get('name', ''),
                description=schema.get('description'),
                custom_fields=custom_fields
            )
        except Exception as e:
            print(f"Error fetching event type: {e}")
            return None

    @strawberry.field
    def live_attendance(self, event_id: int) -> Optional[LiveAttendance]:
        """Fetch real-time attendance for an event from Redis."""
        return get_live_attendance_resolver(event_id)


# --- Mutation Type ---
# This defines all write operations

@strawberry.type
class Mutation:
    """
    Root Mutation type defining all write operations.
    """

    @strawberry.field
    def check_in_student(self, event_id: int, input: CheckInInput) -> bool:
        """
        Check a student in or out of an event.
        Returns true if successful.
        """
        return check_in_student_resolver(event_id, input)


# --- Add Field Resolvers to Event Type ---
# These tell Strawberry how to resolve nested fields in the Event type

@strawberry.type
class Event:
    """
    Complete Event type with nested field resolvers.
    GraphQL will only call these resolvers if the client requests these fields.
    """
    id: int
    description: Optional[str]
    address: str
    type_id: Optional[int]

    @strawberry.field
    def event_type(self) -> Optional[EventType]:
        """Resolve the event type from MongoDB (only if requested)."""
        return get_event_type_resolver(self)

    @strawberry.field
    def custom_data(self) -> Optional[strawberry.scalars.JSON]:
        """Resolve custom field data from MongoDB (only if requested)."""
        return get_event_custom_data_resolver(self)

    @strawberry.field
    def registrations(self) -> List[Registration]:
        """Resolve registrations from MySQL (only if requested)."""
        return get_event_registrations_resolver(self)

    @strawberry.field
    def live_attendance(self) -> Optional[LiveAttendance]:
        """Resolve live attendance from Redis (only if requested)."""
        return get_event_live_attendance_resolver(self)


# --- Create the GraphQL Schema ---
schema = strawberry.Schema(query=Query, mutation=Mutation)

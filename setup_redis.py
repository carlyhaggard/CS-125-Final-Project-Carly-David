from database import get_redis_conn, get_mysql_pool, close_connections
from datetime import datetime
import mysql.connector

def student_checkin_edit(event_id: int, student_id: int):
    """
    Check in or out a student for an event.

    Args:
        event_id: The event ID
        student_id: The student ID (integer to match MySQL)

    Returns:
        Status string: "CHECKED IN" or "CHECKED OUT"
    """
    r = get_redis_conn()
    now = datetime.utcnow().isoformat(timespec="seconds")

    # Redis keys
    checked_in_key = f"event:{event_id}:checkedIn"
    checkin_times_key = f"event:{event_id}:checkInTimes"
    checkout_times_key = f"event:{event_id}:checkOutTimes"

    # Convert student_id to string for Redis storage
    student_id_str = str(student_id)

    is_checked_in = r.sismember(checked_in_key, student_id_str)

    if is_checked_in:
        r.srem(checked_in_key, student_id_str)
        r.hset(checkout_times_key, student_id_str, now)
        return "CHECKED OUT"
    else:
        r.sadd(checked_in_key, student_id_str)
        r.hset(checkin_times_key, student_id_str, now)
        r.hdel(checkout_times_key, student_id_str)
        return "CHECKED IN"

def get_live_attendance(event_id: int) -> dict:
    """
    Returns the current attendance status for an event.

    Args:
        event_id: The event ID

    Returns:
        Dictionary with event_id, checked_in_count, and list of students
    """
    r = get_redis_conn()
    checked_in_key = f"event:{event_id}:checkedIn"
    checkin_times_key = f"event:{event_id}:checkInTimes"

    # Get the current checked-in students and their check-in times
    pipe = r.pipeline()
    pipe.scard(checked_in_key)
    pipe.smembers(checked_in_key)
    pipe.hgetall(checkin_times_key)

    # Retrieve the results
    count, members, times = pipe.execute()
    current_members = [m for m in members]

    # Format the results for the API response
    status_list = []
    for student_id in current_members:
        status_list.append({"student_id": int(student_id), "check_in_time": times.get(student_id, "N/A")})

    return {"event_id": event_id, "checked_in_count": count, "students": status_list}

def finalize_event_attendance(event_id: int) -> dict:
    """
    Finalizes attendance for an event by:
    1. Reading all check-in/check-out data from Redis
    2. Writing permanent records to MySQL event_attendance table
    3. Deleting Redis keys for the event

    Args:
        event_id: The event ID

    Returns:
        Dictionary with summary of records persisted

    Raises:
        Exception: If MySQL write fails
    """
    r = get_redis_conn()

    # Redis keys
    checked_in_key = f"event:{event_id}:checkedIn"
    checkin_times_key = f"event:{event_id}:checkInTimes"
    checkout_times_key = f"event:{event_id}:checkOutTimes"

    # Get all data from Redis
    pipe = r.pipeline()
    pipe.smembers(checked_in_key)  # Currently checked in
    pipe.hgetall(checkin_times_key)  # All check-in times
    pipe.hgetall(checkout_times_key)  # All check-out times
    currently_checked_in, checkin_times, checkout_times = pipe.execute()

    # Combine all student IDs who ever checked in
    all_student_ids = set(checkin_times.keys())

    if not all_student_ids:
        # No attendance data to finalize
        r.delete(checked_in_key, checkin_times_key, checkout_times_key)
        return {
            "event_id": event_id,
            "records_persisted": 0,
            "message": "No attendance data found for this event"
        }

    # Prepare records for MySQL
    attendance_records = []
    for student_id_str in all_student_ids:
        student_id = int(student_id_str)
        checkin_time = checkin_times.get(student_id_str)
        checkout_time = checkout_times.get(student_id_str)

        # Convert ISO format strings to datetime objects for MySQL
        checkin_dt = datetime.fromisoformat(checkin_time) if checkin_time else None
        checkout_dt = datetime.fromisoformat(checkout_time) if checkout_time else None

        attendance_records.append((event_id, student_id, checkin_dt, checkout_dt))

    # Write to MySQL
    cnx = None
    try:
        cnx = get_mysql_pool().get_connection()
        cursor = cnx.cursor()

        insert_sql = """
            INSERT INTO event_attendance (EventID, StudentID, CheckInTime, CheckOutTime)
            VALUES (%s, %s, %s, %s)
        """

        cursor.executemany(insert_sql, attendance_records)
        cnx.commit()

        records_inserted = cursor.rowcount

        # Delete Redis keys only after successful MySQL write
        r.delete(checked_in_key, checkin_times_key, checkout_times_key)

        return {
            "event_id": event_id,
            "records_persisted": records_inserted,
            "message": f"Successfully persisted {records_inserted} attendance records to MySQL"
        }

    except mysql.connector.Error as err:
        if cnx:
            cnx.rollback()
        raise Exception(f"Failed to persist attendance to MySQL: {err}")

    finally:
        if cnx and cnx.is_connected():
            cursor.close()
            cnx.close()

def get_random_winner(event_id: int):
    r = get_redis_conn()
    key = f"event:{event_id}:checkedIn"
    try:
        result = r.srandmember(key)
        if result is None:
            return None
        return int(result)
    except Exception as e:
        raise ConnectionError(e)

def setup_redis_data():
    """Connects to Redis and sets up sample data."""
    try:
        r = get_redis_conn()
        event_id = 100

        checked_in_key = f"event:{event_id}:checkedIn"
        checkin_times_key = f"event:{event_id}:checkInTimes"
        checkout_times_key = f"event:{event_id}:checkOutTimes"

        # Clear existing check-in data
        r.delete(checked_in_key, checkin_times_key, checkout_times_key)

        # Create a few example students as "currently checked in"
        sample_students = ["stu-001", "stu-002", "stu-003"]
        now_str = datetime.utcnow().isoformat(timespec="seconds")

        for s in sample_students:
            r.sadd(checked_in_key, s)     # Add to the live checked-in set
            r.hset(checkin_times_key, s, now_str)     # Record check-in time

    except Exception as e:
        print(f"An error occurred during Redis setup: {e}")
    finally:
        close_connections()

if __name__ == "__main__":
    print("--- Starting Redis Data Setup ---")
    setup_redis_data()
    print("--- Redis Data Setup Finished ---")
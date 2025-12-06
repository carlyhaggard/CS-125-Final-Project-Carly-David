from database import get_redis_conn, close_connections
from datetime import datetime

def student_checkin_edit(event_id: int, student_id: str):
    """
    Check in or out a student for an event.
    """
    r = get_redis_conn()
    now = datetime.utcnow().isoformat(timespec="seconds")

    # Redis keys
    checked_in_key = f"event:{event_id}:checkedIn"
    checkin_times_key = f"event:{event_id}:checkInTimes"
    checkout_times_key = f"event:{event_id}:checkOutTimes"

    is_checked_in = r.sismember(checked_in_key, student_id)

    if is_checked_in:
        r.srem(checked_in_key, student_id)
        r.hset(checkout_times_key, student_id, now)
        return "CHECKED OUT"
    else:
        r.sadd(checked_in_key, student_id)
        r.hset(checkin_times_key, student_id, now)
        r.hdel(checkout_times_key, student_id)
        return "CHECKED IN"

def get_live_attendance(event_id: int) -> dict:
    """Returns the current attendance status for an event."""
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
        status_list.append({"student_id": student_id, "check_in_time": times.get(student_id, "N/A")})

    return {"event_id" : event_id, "checked_in_count": count, "students": status_list}


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
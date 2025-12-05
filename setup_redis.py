from database import get_redis_conn, close_connections
from datetime import datetime

def setup_redis_data():
    """
    Connects to Redis and sets up real-time event checkin
    """
    try:
        r = get_redis_conn()
        event_id = 100  # Hardcoded for now

        # Redis keys
        checked_in_key = f"event:{event_id}:checkedIn"
        checkin_times_key = f"event:{event_id}:checkInTimes"
        checkout_times_key = f"event:{event_id}:checkOutTimes"

        # Clear existing check-in data (just in case)
        r.delete(checked_in_key)
        r.delete(checkin_times_key)
        r.delete(checkout_times_key)

        # Create a few example students as "currently checked in"
        sample_students = ["stu-001", "stu-002", "stu-003"]
        now_str = datetime.utcnow().isoformat(timespec="seconds")

        for s in sample_students:
            r.sadd(checked_in_key, s)     # Add to the live checked-in set
            r.hset(checkin_times_key, s, now_str)     # Record check-in time

        # Verify that the data was added correctly
        current_members = r.smembers(checked_in_key)
        checkin_times = r.hgetall(checkin_times_key)

        # List of current checked-in students
        print("Currently checked in:", current_members)
        print("Check-in times:", checkin_times)

    except Exception as e:
        print(f"An error occurred during Redis setup: {e}")
    finally:
        close_connections()

if __name__ == "__main__":
    print("--- Starting Redis Data Setup ---")
    setup_redis_data()
    print("--- Redis Data Setup Finished ---")
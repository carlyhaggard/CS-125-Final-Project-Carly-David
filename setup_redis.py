from database import get_redis_conn, close_connections

def setup_redis_data():
    """
    Connects to Redis and sets up # TODO finish description
    """
    try:
        r = get_redis_conn()
        # TODO implement real time check-in for events
    except Exception as e:
        print(e)
    finally:
        close_connections()

if __name__ == "__main__":
    print("--- Starting Redis Data Setup ---")
    setup_redis_data()
    print("--- Redis Data Setup Finished ---")
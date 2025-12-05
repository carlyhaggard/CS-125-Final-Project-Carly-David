from database import get_mongo_db, close_connections

def setup_mongo_data():
    try:
        db = get_mongo_db()
    except Exception as e:
        print(e)
    finally:
        close_connections()

if __name__ == "__main__":
    print("--- Starting MongoDB Data Setup ---")
    setup_mongo_data()
    print("--- MongoDB Data Setup Finished ---")

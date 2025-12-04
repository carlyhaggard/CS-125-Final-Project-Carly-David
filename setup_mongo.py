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




## THIS WAS JUST THE FIRST ATTEMPT...
# # TODO implement mongo db functionality and check connection
# @app.get("POST/event-types", response_model=None)
# def create_event():
#     try:
#         cnx = db_pool.get_connection()
#         cursor = cnx.cursor(dictionary=True)
#         cursor.execute() #TODO WRITE SQL QUERY
#         event = cursor.fetchone()   #TODO DETERMINE RETURN TYPE
#     except Exception as e: #TODO MAKE MORE SPECIFIC EXCEPTION
#         print(e)
#     finally:
#         if 'cnx' in locals() and cnx.is_connected():
#             cursor.close()
#             cnx.close()
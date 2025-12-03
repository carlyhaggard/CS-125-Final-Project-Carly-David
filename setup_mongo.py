import os
from dotenv import load_dotenv
from YouthGroupAPI import app
from YouthGroupAPI import db_pool
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_NAME = os.getenv("MONGODB_NAME")

# TODO implement mongo db functionality and check connection
@app.get("POST/event-types", response_model=None)
def create_event():
    try:
        cnx = db_pool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute() #TODO WRITE SQL QUERY
        event = cursor.fetchone()   #TODO DETERMINE RETURN TYPE
    except Exception as e: #TODO MAKE MORE SPECIFIC EXCEPTION
        print(e)
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()
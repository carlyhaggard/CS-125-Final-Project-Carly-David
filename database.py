import os
import warnings
import certifi
from dotenv import load_dotenv
import mysql.connector.pooling
from pymongo import MongoClient
import redis

load_dotenv()

# --- Load Environment Variables ---
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_NAME = os.getenv("DB_NAME", "youth_group_program")
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_NAME = os.getenv("MONGODB_NAME", "youthgroup")
REDIS_URL = os.getenv("REDIS_URL")

# --- Warnings for missing variables ---
if not DB_PASSWORD:
    warnings.warn("DB_PASSWORD is not set in .env", UserWarning)
if not MONGODB_URI:
    warnings.warn("MONGODB_URI is not set in .env. MongoDB operations will fail.", UserWarning)
if not REDIS_URL:
    warnings.warn("REDIS_URL is not set. Redis connection will fail if used.", UserWarning)

# --- Connection clients/pools ---
db_pool = None
mongo_client = None
redis_client = None

def get_mysql_pool():
    """Initializes and returns the MySQL connection pool."""
    global db_pool
    if db_pool is None:
        try:
            db_pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="fastapi_pool",
                pool_size=5,
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                database=DB_NAME
            )
            print("Database connection pool created successfully.")
        except mysql.connector.Error as err:
            raise ConnectionError(f"Failed to create MySQL pool: {err}")
    return db_pool

def get_mongo_client():
    """Initializes and returns the MongoDB client, using certifi for SSL validation."""
    global mongo_client
    if mongo_client is None:
        if not MONGODB_URI:
            raise ConnectionError("MONGODB_URI is not set. Cannot connect to MongoDB.")
        try:
            # Use certifi's certificate bundle for TLS
            ca = certifi.where()
            mongo_client = MongoClient(
                MONGODB_URI,
                tlsCAFile=ca,
                serverSelectionTimeoutMS=5000
            )
            mongo_client.admin.command('ping')
            print("Pinged your deployment. You successfully connected to MongoDB!")
        except Exception as e:
            raise ConnectionError(f"Error connecting to MongoDB: {e}")
    return mongo_client

def get_redis_client():
    """Initializes and returns the Redis client."""
    global redis_client
    if redis_client is None:
        if not REDIS_URL:
            raise ConnectionError("REDIS_URL is not set. Cannot connect to Redis.")
        try:
            redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            redis_client.ping()
            print("Successfully connected to Redis!")
        except Exception as e:
            raise ConnectionError(f"Error connecting to Redis: {e}")
    return redis_client

# --- Functions to be called from the FastAPI app ---
def get_db_connection():
    """Gets a connection from the MySQL pool."""
    return get_mysql_pool().get_connection()

def get_mongo_db():
    """Gets the MongoDB database instance."""
    client = get_mongo_client()
    return client[MONGODB_NAME]

def get_redis_conn():
    """Gets the Redis client instance."""
    return get_redis_client()

def close_connections():
    """Placeholder function to close connections, satisfying imports."""
    global mongo_client
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")

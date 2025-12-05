import os
import warnings

from dotenv import load_dotenv
import mysql.connector.pooling
from pymongo import MongoClient
import redis

load_dotenv()

# MySQL Secrets
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_NAME = os.getenv("DB_NAME", "youth_group_program")

if DB_PASSWORD is None:
    warnings.warn(
        "DB_PASSWORD is not set in .env",
        UserWarning,
    )

# MongoDB Secrets
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_NAME = os.getenv("MONGODB_NAME", "youthgroup")

if MONGODB_URI is None:
    warnings.warn(
        "MONGODB_URI is not set in .env",
        UserWarning,
    )

# Load Redis Url
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL is None:
    warnings.warn(
        "REDIS_URL is not set in the environment. Redis connection will fail if used.",
        UserWarning,
    )

# Connection clients/pools
db_pool = None        # MySQL connection pool
mongo_client = None   # MongoDB client
redis_client = None   # Redis client

# MySQL pool connection
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
            print(f"Error creating connection pool: {err}")
            exit()
    return db_pool

def get_mongo_client():
    """Initializes and returns the MongoDB client."""
    global mongo_client
    if mongo_client is None:
        try:
            mongo_client = MongoClient(MONGODB_URI)
            # Send a ping to confirm a successful connection
            mongo_client.admin.command('ping')
            print("Pinged your deployment. You successfully connected to MongoDB!")
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")
            exit()
    return mongo_client

# Redis connection
def get_redis_client():
    """Initializes and returns the Redis client."""
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=True
            )
            # Check connection
            redis_client.ping()
            print("Successfully connected to Redis!")
        except Exception as e:
            print(f"Error connecting to Redis: {e}")
            exit()
    return redis_client

# --- Functions to be called from the FastAPI app ---
def get_db_connection():
    """Gets a connection from the MySQL pool."""
    pool = get_mysql_pool()
    return pool.get_connection()

def get_mongo_db():
    """Gets the MongoDB database instance."""
    client = get_mongo_client()
    return client[MONGODB_NAME]

def get_redis_conn():
    """Gets the Redis client instance."""
    return get_redis_client()

# Cleanup and close connections
def close_connections():
    """Close all database connections."""
    # MySQL pool doesn't have an explicit close, connections are returned to pool.
    # MongoDB client should be closed if the app is shutting down.
    global mongo_client
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")
    # Redis client doesn't require explicit closing for this library version
    # when used like this, but it's good practice if a close method is available.
    print("Connection cleanup finished.")
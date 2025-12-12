# Database Connection Manager
# Centralizes all database connections (MySQL, MongoDB, Redis)
# Uses connection pooling for MySQL to handle multiple concurrent requests efficiently
# Reads credentials from .env file for security

import os
import warnings
import certifi
from dotenv import load_dotenv
import mysql.connector.pooling
from pymongo import MongoClient
import redis

load_dotenv()  # pulls in variables from .env file

# Environment variable defaults - override these in .env
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

# Global connection objects - initialized on first use (lazy loading)
db_pool = None  # MySQL connection pool
mongo_client = None  # MongoDB client
redis_client = None  # Redis client

def get_mysql_pool():
    """
    Creates and returns MySQL connection pool (or returns existing one).
    Pool size of 5 means we can handle 5 concurrent database requests.
    """
    global db_pool
    if db_pool is None:
        try:
            db_pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="fastapi_pool",
                pool_size=5,  # max 5 connections in the pool
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
    """
    Initializes and returns MongoDB client with SSL fallback strategies.
    Python 3.12 + OpenSSL 3.0 can have SSL issues with MongoDB Atlas,
    so we try 3 methods in order: certifi -> system SSL -> insecure (dev only)
    """
    global mongo_client
    if mongo_client is None:
        if not MONGODB_URI:
            warnings.warn("MONGODB_URI is not set. MongoDB features will be disabled.", UserWarning)
            return None
        try:
            # Method 1: Use certifi's CA bundle (recommended for production)
            ca = certifi.where()
            try:
                print("Attempting MongoDB connection with certifi CA bundle...")
                mongo_client = MongoClient(
                    MONGODB_URI,
                    tlsCAFile=ca,  # explicit certificate file
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=5000,
                    retryWrites=True
                )
                mongo_client.admin.command('ping')  # test the connection
                print("✓ Successfully connected to MongoDB with certifi!")
            except Exception as certifi_error:
                print(f"Certifi method failed: {certifi_error}")
                print("Attempting connection without explicit CA file (using system defaults)...")
                # Method 2: Let OS handle SSL verification
                try:
                    mongo_client = MongoClient(
                        MONGODB_URI,
                        serverSelectionTimeoutMS=5000,
                        connectTimeoutMS=5000,
                        retryWrites=True
                    )
                    mongo_client.admin.command('ping')
                    print("✓ Successfully connected to MongoDB using system SSL!")
                except Exception as system_error:
                    print(f"System SSL method failed: {system_error}")
                    print("WARNING: Attempting insecure connection (development only)...")
                    # Method 3: Disable SSL verification (DEV ONLY - security risk!)
                    try:
                        mongo_client = MongoClient(
                            MONGODB_URI,
                            tlsAllowInvalidCertificates=True,
                            serverSelectionTimeoutMS=5000,
                            connectTimeoutMS=5000,
                            retryWrites=True
                        )
                        mongo_client.admin.command('ping')
                        print("✓ WARNING: Connected to MongoDB with SSL verification disabled!")
                        print("This should only be used for development/testing purposes!")
                    except Exception as insecure_error:
                        print(f"✗ All MongoDB connection methods failed: {insecure_error}")
                        print("This is likely a Python 3.12 + OpenSSL 3.0 + macOS compatibility issue.")
                        print("MongoDB features will be disabled. The app will continue without MongoDB.")
                        mongo_client = None
                        return None
        except Exception as e:
            print(f"✗ An unexpected error occurred with MongoDB: {e}")
            print("MongoDB features will be disabled. The app will continue without MongoDB.")
            mongo_client = None
            return None
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
    """
    Gets the MongoDB database instance.
    Returns None if MongoDB is unavailable.
    """
    client = get_mongo_client()
    if client is None:
        return None
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

# MongoDB Setup - Handles Flexible Event Type Schemas
# MongoDB is perfect for storing custom fields because it's schema-less
# MySQL stores the event type ID/name, MongoDB stores the flexible field definitions
# Example: One event type might have "theme" and "age_range", another might have "location_type"

from database import get_mongo_db, close_connections
from datetime import datetime
from typing import Optional, List, Dict

# --- Event Type Operations ---
# These functions manage the schemas (field definitions) for different event types

def create_event_type_schema(type_id: int, name: str, description: Optional[str], fields: List[Dict]) -> dict:
    """
    Creates an event type schema document in MongoDB.

    Args:
        type_id: The ID from MySQL event_type table
        name: Name of the event type
        description: Optional description
        fields: List of custom field definitions, e.g., [{"name": "age", "type": "number", "required": True}]

    Returns:
        The inserted document or None if MongoDB is unavailable
    """
    db = get_mongo_db()
    if db is None:
        print("MongoDB is unavailable. Skipping event type schema creation.")
        return None
    schema_doc = {
        "typeId": type_id,
        "name": name,
        "description": description,
        "fields": fields,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat()
    }
    result = db.eventTypes.insert_one(schema_doc)
    schema_doc["_id"] = str(result.inserted_id)
    return schema_doc

def get_event_type_schema(type_id: int) -> Optional[dict]:
    """
    Retrieves an event type schema by its MySQL type ID.

    Args:
        type_id: The ID from MySQL event_type table

    Returns:
        The schema document or None if not found or MongoDB unavailable
    """
    db = get_mongo_db()
    if db is None:
        return None
    schema = db.eventTypes.find_one({"typeId": type_id})
    if schema and "_id" in schema:
        schema["_id"] = str(schema["_id"])
    return schema

def get_all_event_type_schemas() -> List[dict]:
    """
    Retrieves all event type schemas.

    Returns:
        List of schema documents or empty list if MongoDB unavailable
    """
    db = get_mongo_db()
    if db is None:
        return []
    schemas = list(db.eventTypes.find())
    for schema in schemas:
        if "_id" in schema:
            schema["_id"] = str(schema["_id"])
    return schemas

def update_event_type_schema(type_id: int, name: Optional[str] = None,
                             description: Optional[str] = None,
                             fields: Optional[List[Dict]] = None) -> bool:
    """
    Updates an event type schema.

    Args:
        type_id: The ID from MySQL event_type table
        name: Optional new name
        description: Optional new description
        fields: Optional new field definitions

    Returns:
        True if update was successful, False if MongoDB unavailable or update failed
    """
    db = get_mongo_db()
    if db is None:
        return False
    update_doc = {"updatedAt": datetime.utcnow().isoformat()}

    if name is not None:
        update_doc["name"] = name
    if description is not None:
        update_doc["description"] = description
    if fields is not None:
        update_doc["fields"] = fields

    result = db.eventTypes.update_one(
        {"typeId": type_id},
        {"$set": update_doc}
    )
    return result.modified_count > 0

def delete_event_type_schema(type_id: int) -> bool:
    """
    Deletes an event type schema.

    Args:
        type_id: The ID from MySQL event_type table

    Returns:
        True if deletion was successful, False otherwise
    """
    db = get_mongo_db()
    result = db.eventTypes.delete_one({"typeId": type_id})
    return result.deleted_count > 0

# --- Per-Event Custom Field Operations ---
# Event type schemas define WHAT fields exist (e.g., "theme" is a string)
# Event custom data stores the ACTUAL values for a specific event (e.g., "theme": "80s Night")

def store_event_custom_data(event_id: int, custom_data: Dict) -> dict:
    """
    Stores custom field values for a specific event.

    Args:
        event_id: The ID from MySQL event table
        custom_data: Dictionary of custom field values

    Returns:
        The inserted document or None if MongoDB is unavailable
    """
    db = get_mongo_db()
    if db is None:
        print("MongoDB is unavailable. Skipping event custom data storage.")
        return None
    event_doc = {
        "eventId": event_id,
        "customData": custom_data,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat()
    }
    result = db.eventCustomData.insert_one(event_doc)
    event_doc["_id"] = str(result.inserted_id)
    return event_doc

def get_event_custom_data(event_id: int) -> Optional[dict]:
    """
    Retrieves custom field values for a specific event.

    Args:
        event_id: The ID from MySQL event table

    Returns:
        The custom data document or None if not found or MongoDB unavailable
    """
    db = get_mongo_db()
    if db is None:
        return None
    event_doc = db.eventCustomData.find_one({"eventId": event_id})
    if event_doc and "_id" in event_doc:
        event_doc["_id"] = str(event_doc["_id"])
    return event_doc

def update_event_custom_data(event_id: int, custom_data: Dict) -> bool:
    """
    Updates custom field values for a specific event.

    Args:
        event_id: The ID from MySQL event table
        custom_data: New dictionary of custom field values

    Returns:
        True if update was successful, False if MongoDB unavailable or update failed
    """
    db = get_mongo_db()
    if db is None:
        return False
    result = db.eventCustomData.update_one(
        {"eventId": event_id},
        {
            "$set": {
                "customData": custom_data,
                "updatedAt": datetime.utcnow().isoformat()
            }
        }
    )
    return result.modified_count > 0

def delete_event_custom_data(event_id: int) -> bool:
    """
    Deletes custom field values for a specific event.

    Args:
        event_id: The ID from MySQL event table

    Returns:
        True if deletion was successful, False otherwise
    """
    db = get_mongo_db()
    result = db.eventCustomData.delete_one({"eventId": event_id})
    return result.deleted_count > 0

# --- Setup and Initialization ---

def setup_mongo_indexes():
    """
    Creates indexes for faster queries on typeId and eventId.
    Unique indexes ensure we don't accidentally create duplicate schemas/data.
    """
    db = get_mongo_db()

    # Index on typeId lets us quickly find schemas by event type
    db.eventTypes.create_index("typeId", unique=True)
    print("Created unique index on eventTypes.typeId")

    # Index on eventId lets us quickly find custom data by event
    db.eventCustomData.create_index("eventId", unique=True)
    print("Created unique index on eventCustomData.eventId")

def setup_mongo_data():
    """
    Initializes MongoDB with indexes and optional sample data.
    """
    try:
        db = get_mongo_db()
        print("Successfully connected to MongoDB")

        # Create indexes
        setup_mongo_indexes()

        print("MongoDB setup completed successfully")
    except Exception as e:
        print(f"Error during MongoDB setup: {e}")
    finally:
        close_connections()

if __name__ == "__main__":
    print("--- Starting MongoDB Data Setup ---")
    setup_mongo_data()
    print("--- MongoDB Data Setup Finished ---")

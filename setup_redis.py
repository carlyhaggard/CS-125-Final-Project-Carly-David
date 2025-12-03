import os
from dotenv import load_dotenv
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
# TODO implement real time check-in for events
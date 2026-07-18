import os

BASE_URL = os.environ.get("BACKEND_BASE_URL", "").rstrip("/")

ADD_WORKOUT_ENDPOINT = "/api/workout/today"
ADD_MEDITATION_ENDPOINT = "/api/meditation/today"
ADD_SPORT_ENDPOINT = "/api/sport/today"

GET_ALL_VEHICLES_ENDPOINT = "/api/vehicles"

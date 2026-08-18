cat > test_firestore_provision.py <<'PY'
import google.auth
from google.auth.transport.requests import AuthorizedSession

PROJECT_ID = "samarth-8f5fca3e"

credentials, _ = google.auth.default(
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)

session = AuthorizedSession(credentials)

url = (
    f"https://firestore.googleapis.com/v1/projects/"
    f"{PROJECT_ID}/databases"
)

params = {
    "databaseId": "(default)",
}

payload = {
    "locationId": "asia-south1",
    "type": "FIRESTORE_NATIVE",
}

response = session.post(
    url,
    params=params,
    json=payload,
)

print("STATUS:", response.status_code)
print("RESPONSE:")
print(response.text)
PY
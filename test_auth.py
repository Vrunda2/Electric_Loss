import os
os.environ["AUTH_SECRET_KEY"] = "dummy_for_testing"

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

print("------------------------------------------")
print("1. SENDING REQUEST *WITHOUT* LOGIN...")
response = client.get("/energy/tariff/comparison")
print(f"Status Code: {response.status_code}")
if response.status_code == 401:
    print("SUCCESS! API is blocked correctly.")
    print(f"Error Message: {response.json()}")

print("------------------------------------------")
print("2. ATTEMPTING LOGIN WITH CORRECT CREDENTIALS...")
# Using the credentials from the .env snippet shown earlier
response = client.post("/auth/login", json={"username": "admin", "password": "admin123@"})
if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"SUCCESS! Login accepted. Received Token: Bearer {token[:20]}...")
    
    print("\n------------------------------------------")
    print("3. SENDING REQUEST *WITH* THE JWT TOKEN...")
    headers = {"Authorization": f"Bearer {token}"}
    response2 = client.get("/energy/city/summary", headers=headers)
    print(f"Status Code: {response2.status_code}")
    if response2.status_code == 200:
        print("SUCCESS! Data retrieved successfully using the token.")
    else:
         print("Failed to retrieve data.")
else:
    print(f"Login failed: {response.status_code} - {response.json()}")

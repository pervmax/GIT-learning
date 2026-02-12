
import requests
import json
import os
import time

def test_backend():
    url = "http://localhost:8000/classify"
    payload = {"text": "mitho"}
    
    print(f"Testing {url} with payload {payload}...")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        print("Response:", data)
        
        assert data["text"] == "mitho"
        assert data["sentiment"] in ["Positive", "Negative", "Neutral"]
        assert "timestamp" in data
        
        print("\nAPI Response verified.")
        
        # Check data.json
        print("Checking data.json...")
        if os.path.exists("data.json"):
            with open("data.json", "r") as f:
                records = json.load(f)
                latest = records[-1]
                assert latest["text"] == "mitho"
                print("data.json verified.")
        else:
            print("Error: data.json not found.")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response body: {response.text}")
    except Exception as e:
        print(f"Test failed: {e}")
        exit(1)

if __name__ == "__main__":
    # Wait for server to start if running immediately after
    time.sleep(2) 
    test_backend()


import google.generativeai as genai
import os

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    # Use the key provided by user directly for this test script if env var fails
    api_key = "AAIzaSyDAT7e2mok_kajlGi1s0r7sOf7lARif7rg"

genai.configure(api_key=api_key)

try:
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")

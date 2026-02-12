"""
Restaurant Feedback Backend with Sentiment Analysis

To run the server:
    uvicorn main:app --reload
"""

import os
import json
import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

# ⚠️ IMPORTANT: Replace this with your actual Gemini API key
GEMINI_API_KEY = "AIzaSyDAT7e2mok_kajlGi1s0r7sOf7lARif7rg"

app = FastAPI()

# CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input models
class FeedbackRequest(BaseModel):
    ratings: Dict[str, int]  # {food: 5, service: 4, ambiance: 5, cleanliness: 4}
    comments: str
    timestampISO: str
    date: str
    time: str

class SentimentRequest(BaseModel):
    text: str

DATA_FILE = "data.json"

def get_gemini_api_key():
    """Return the hardcoded API key"""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_API_KEY_HERE":
        raise ValueError("Please replace GEMINI_API_KEY with your actual API key at the top of main.py")
    return GEMINI_API_KEY

def classify_sentiment_with_gemini(text: str) -> str:
    """Classify sentiment using Gemini API - returns only Positive or Negative"""
    if not text or not text.strip():
        return "Negative"  # Default to Negative for empty text
    
    try:
        api_key = get_gemini_api_key()
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""You are a sentiment analysis expert for restaurant feedback. Analyze the sentiment of the following customer comment.

IMPORTANT INSTRUCTIONS:
- Classify as "Positive" if the comment expresses satisfaction, happiness, praise, or positive experience
- Classify as "Negative" if the comment expresses dissatisfaction, complaints, criticism, or negative experience
- Consider the context: this is restaurant feedback (food, service, ambiance, cleanliness)
- Analyze the comment in its original language - do not translate
- Look for emotional tone, not just keywords
- Respond with ONLY ONE WORD: either "Positive" or "Negative"

Examples:
- "The food was delicious!" → Positive
- "Service was terrible" → Negative
- "mitho" (Nepali for tasty/sweet) → Positive
- "namitho" (Nepali for not tasty) → Negative
- "खाना बकवास है" (Hindi for food is rubbish) → Negative
- "estaba muy sucio" (Spanish for it was very dirty) → Negative

Customer Comment: {text}

Sentiment:"""
        
        response = model.generate_content(prompt)
        sentiment = response.text.strip()
        
        # Validate response - only accept Positive or Negative
        if sentiment not in ["Positive", "Negative"]:
            # If response is ambiguous, default to Negative
            return "Negative"
        
        return sentiment
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback to Negative on error
        return "Negative"

def load_feedback_data() -> List[Dict[str, Any]]:
    """Load feedback from data.json"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []

def save_feedback_data(data: List[Dict[str, Any]]):
    """Save feedback to data.json"""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@app.post("/submit_feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Receive feedback from user form, classify sentiment, and save to data.json
    """
    try:
        # Classify sentiment if comments exist
        sentiment = "Negative"  # Default to Negative (binary classification)
        if feedback.comments and feedback.comments.strip():
            sentiment = classify_sentiment_with_gemini(feedback.comments)
        
        # Create feedback entry
        entry = {
            "ratings": feedback.ratings,
            "comments": feedback.comments,
            "timestampISO": feedback.timestampISO,
            "date": feedback.date,
            "time": feedback.time,
            "sentiment": sentiment,
            "timestamp": feedback.timestampISO  # For backward compatibility
        }
        
        # Load existing data
        all_feedback = load_feedback_data()
        
        # Append new entry
        all_feedback.append(entry)
        
        # Save to file
        save_feedback_data(all_feedback)
        
        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "sentiment": sentiment,
            "entry": entry
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving feedback: {str(e)}")

@app.get("/get_feedback")
async def get_all_feedback():
    """
    Return all feedback for admin dashboard
    """
    try:
        feedback = load_feedback_data()
        return {
            "success": True,
            "count": len(feedback),
            "feedback": feedback
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading feedback: {str(e)}")

# Keep the original /classify endpoint for backward compatibility
@app.post("/classify")
async def classify_sentiment(request: SentimentRequest):
    """
    Legacy endpoint for sentiment classification only
    """
    try:
        sentiment = classify_sentiment_with_gemini(request.text)
        timestamp = datetime.datetime.now().isoformat()
        
        return {
            "text": request.text,
            "sentiment": sentiment,
            "timestamp": timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

class SummarizeRequest(BaseModel):
    feedback: str
    count: int
    period: str

@app.post("/summarize_feedback")
async def summarize_feedback(request: SummarizeRequest):
    """
    Summarize feedback using Gemini API
    """
    try:
        if not request.feedback or request.feedback.strip() == "":
            return {
                "success": True,
                "summary": "No feedback available to summarize."
            }
        
        api_key = get_gemini_api_key()
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        period_label = {
            'today': 'Today',
            'week': 'Last 7 Days',
            'month': 'Last 30 Days',
            'all': 'All Time'
        }.get(request.period, 'Selected Period')
        
        prompt = f"""IMPORTANT OUTPUT RULES (must follow):
- Do NOT use **, *, -, bullet points, or numbering
- Do NOT use markdown of any kind
- Use ONLY plain text
- If you use ** or markdown, the output is wrong

Write a natural, human-friendly summary for a restaurant owner about customer feedback from {period_label}.
Total feedback count: {request.count}

Write in short paragraphs with simple plain-text headings.
Headings must be written like this:
Heading:
(not bold, not numbered)

Tone:
- Friendly
- Professional
- Natural
- Non-robotic

Content to include:
General customer mood
What customers liked
Repeated problems
Clear, practical suggestions

Do not analyze data inconsistencies.
Do not sound academic or formal.

Customer feedback:
{request.feedback}"""
        
        response = model.generate_content(prompt)
        summary = response.text.strip()
        
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

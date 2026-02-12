import google.generativeai as genai

GEMINI_API_KEY = "AIzaSyDAT7e2mok_kajlGi1s0r7sOf7lARif7rg"

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Test with the exact prompt from main.py
text = "Mithooo"

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

print(f"Testing sentiment for: '{text}'")
print("-" * 50)

response = model.generate_content(prompt)
sentiment = response.text.strip()

print(f"Raw API Response: '{sentiment}'")
print(f"After strip: '{sentiment}'")
print(f"Is 'Positive'? {sentiment == 'Positive'}")
print(f"Is 'Negative'? {sentiment == 'Negative'}")
print(f"Length: {len(sentiment)}")
print(f"Repr: {repr(sentiment)}")

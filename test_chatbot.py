import google.generativeai as genai

# 👉 STEP 1: Paste your Gemini API key here
API_KEY = "AIzaSyBYZKaOlrWo0U4YkePqEXYYV9IGtXPtZZM"

# Configure Gemini
genai.configure(api_key=API_KEY)

try:
    # 👉 STEP 2: List available models
    print("🔍 Available Models:")
    for model in genai.list_models():
        print(model.name)

    # 👉 STEP 3: Use a model
    model = genai.GenerativeModel("gemini-2.5-flash")

    # 👉 STEP 4: Test response
    response = model.generate_content("Hello, what is AI?")
    
    print("\n✅ Gemini Response:")
    print(response.text)

except Exception as e:
    print("\n❌ ERROR:")
    print(e)
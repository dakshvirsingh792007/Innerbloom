import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
import google.auth
import google.auth.transport.requests
import google.oauth2.id_token
import google.oauth2.service_account
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def index():
    return render_template('dashboard.html')

# @app.route('/app')
# def app_page():
#     return render_template('app.html')

@app.route('/ai_consultant')
def ai_consultant():
    return render_template('ai_consultant.html')

@app.route('/self_help_book')
def self_help_book():
    return render_template('self_help_book.html')

@app.route('/helpline')
def helpline():
    return render_template('helpline.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message')
    user_info = data.get('user_info', {})

    if not message:
        return jsonify({"error": "No prompt provided."}), 400

    # Use AI_MODEL_URL from environment variables for the deployed Cloud Run model
    api_url_from_env = os.environ.get("AI_MODEL_URL")
    if not api_url_from_env:
        return jsonify({"error": "AI_MODEL_URL not set in .env file."}), 500

    # The audience for fetch_id_token should be the base URL without query parameters.
    api_url = api_url_from_env.split('?')[0]

    # The payload for the custom Cloud Run service.
    # We construct a more detailed prompt for better, personalized responses.
    system_message = (
        "You are Innerbloom, a compassionate and empathetic AI mental wellness consultant. "
        "Your goal is to provide supportive, insightful, and non-judgmental guidance. "
        "You are not a licensed therapist, so you must not provide medical advice, diagnosis, or treatment. "
        "If a user seems to be in crisis, you should gently guide them to the Helpline page. "
        "Keep your responses concise, warm, and encouraging."
    )

    prompt = (
        f"{system_message}\n\n"
        f"A user who is {user_info.get('age', 'an unknown age')} and interested in {user_info.get('area_of_interest', 'general wellness')} "
        f"has sent the following message: \"{message}\"\n\n"
        f"Please provide a caring and helpful response."
    )

    payload = {
        "prompt": prompt
    }

    try:
        # Get an ID token to authenticate with the private Cloud Run service
        auth_req = google.auth.transport.requests.Request()
        id_token = google.oauth2.id_token.fetch_id_token(auth_req, api_url)


        headers = {
            'Authorization': f'Bearer {id_token}',
            'Content-Type': 'application/json'
        }
        # The actual request should go to the full URL from the environment, including any keys.
        response = requests.post(f"{api_url.rstrip('/')}/gradio_api/chat", headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

        # The response structure depends on the deployed model. Let's try a few common patterns.
        if 'response' in result:
            text_response = result['response']
        elif 'predictions' in result and len(result['predictions']) > 0: # Handle Vertex-style predictions
            prediction = result['predictions'][0]
            text_response = prediction.get('content', str(prediction)) if isinstance(prediction, dict) else str(prediction)
        else:
            text_response = str(result) # Fallback to returning the whole response

        return jsonify({"response": text_response})

    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        if hasattr(e, 'response') and e.response is not None:
            error_message += f" | Status Code: {e.response.status_code} | Response: {e.response.text}"
        print(error_message)
        return jsonify({"error": error_message}), 500

print("GOOGLE_APPLICATION_CREDENTIALS:", os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)

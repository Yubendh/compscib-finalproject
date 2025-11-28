import os
import requests
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables (to keep API key safe)
load_dotenv()

app = Flask(__name__)
# Enable CORS so your frontend can talk to this backend
CORS(app)

# --- TECHNICAL REQUIREMENT: API INTEGRATION ---
# Configuration
API_KEY = os.getenv("OMDB_API_KEY", "17c09ca2") 
OMDB_URL = "http://www.omdbapi.com/"

@app.route('/')
def home():
    return "Wat2Watch Python Backend is Running!"

@app.route('/api/recommend', methods=['GET'])
def recommend_movies():
    """
    1. Receives search filters from Frontend.
    2. Fetches data from OMDb API.
    3. Processes data using Pandas.
    4. Returns sorted JSON.
    """
    # 1. Get parameters from the frontend URL
    keyword = request.args.get('q', 'movie')
    genre_filter = request.args.get('genre', '').lower()
    min_rating = request.args.get('minRating', 0)
    min_year = request.args.get('minYear') # Added param
    max_year = request.args.get('maxYear') # Added param
    sort_order = request.args.get('sort', 'rating')
    
    # --- TECHNICAL REQUIREMENT: DATA STRUCTURES ---
    raw_movie_list = []

    try:
        # Step A: Search for movies
        search_params = {"apikey": API_KEY, "s": keyword, "type": "movie"}
        response = requests.get(OMDB_URL, params=search_params)
        data = response.json()

        if data.get("Response") == "False":
            return jsonify({"error": "No movies found."}), 404

        # Step B: Fetch details for each movie
        # Increased limit slightly to give filters more data to work with
        search_results = data.get("Search", [])[:15] 
        
        for item in search_results:
            imdb_id = item.get("imdbID")
            # Fetch full details
            details_response = requests.get(OMDB_URL, params={"apikey": API_KEY, "i": imdb_id})
            details = details_response.json()
            
            if details.get("Response") == "True":
                raw_movie_list.append(details)

        if not raw_movie_list:
            return jsonify({"results": []})

        # --- TECHNICAL REQUIREMENT: DATA MANIPULATION (Pandas) ---
        df = pd.DataFrame(raw_movie_list)

        # 1. Clean Numerical Data (Ratings)
        # Convert "7.4" string to float 7.4. Turn "N/A" into 0.
        df['imdbRating'] = pd.to_numeric(df['imdbRating'], errors='coerce').fillna(0)
        
        # 2. Clean Year Data
        # Extract the first 4 digits from "2023–" or "1998"
        # We convert to string first to be safe, then extract regex
        df['Year'] = df['Year'].astype(str).str.extract(r'(\d{4})').astype(float)
        df['Year'] = df['Year'].fillna(0)

        # 3. Filter by Genre
        if genre_filter and genre_filter != 'any':
            # Check if the genre string contains our filter (case insensitive)
            # fillna('') prevents crashes on movies missing genre data
            df = df[df['Genre'].fillna('').str.lower().str.contains(genre_filter, na=False)]

        # 4. Filter by Minimum Rating
        if min_rating:
            df = df[df['imdbRating'] >= float(min_rating)]

        # 5. Filter by Year (Min/Max)
        if min_year:
            df = df[df['Year'] >= float(min_year)]
        
        if max_year:
            df = df[df['Year'] <= float(max_year)]

        # 6. Sort Data
        if sort_order == 'newest':
            df = df.sort_values(by='Year', ascending=False)
        elif sort_order == 'oldest':
            df = df.sort_values(by='Year', ascending=True)
        else: # Default: Highest Rated
            df = df.sort_values(by='imdbRating', ascending=False)

        # Convert back to JSON
        final_results = df.to_dict('records')

        return jsonify({"results": final_results, "count": len(final_results)})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
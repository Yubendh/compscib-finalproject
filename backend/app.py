import os
import requests
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv


load_dotenv()

app = Flask(__name__)
CORS(app)

# --- TECHNICAL REQUIREMENT: API INTEGRATION ---
API_KEY = os.getenv("OMDB_API_KEY", "17c09ca2") 
OMDB_URL = "http://www.omdbapi.com/"

@app.route('/')
def home():
    return "Wat2Watch Python Backend is Running!"

@app.route('/api/recommend', methods=['GET'])
def recommend_movies():
    #Get parameters from the frontend URL
    keyword = request.args.get('q', 'movie')
    genre_filter = request.args.get('genre', '').lower()
    min_rating = request.args.get('minRating', 0)
    min_year = request.args.get('minYear') 
    max_year = request.args.get('maxYear') 
    sort_order = request.args.get('sort', 'rating')
    
    # --- TECHNICAL REQUIREMENT: DATA STRUCTURES ---
    raw_movie_list = []

    try:
        #Search for movies
        search_params = {"apikey": API_KEY, "s": keyword, "type": "movie"}
        response = requests.get(OMDB_URL, params=search_params)
        data = response.json()

        if data.get("Response") == "False":
            return jsonify({"error": "No movies found."}), 404

        #Fetch details for each movie
        search_results = data.get("Search", [])[:15] 
        
        for item in search_results:
            imdb_id = item.get("imdbID")
            details_response = requests.get(OMDB_URL, params={"apikey": API_KEY, "i": imdb_id})
            details = details_response.json()
            
            if details.get("Response") == "True":
                raw_movie_list.append(details)

        if not raw_movie_list:
            return jsonify({"results": []})

        # --- TECHNICAL REQUIREMENT: DATA MANIPULATION (Pandas) ---
        df = pd.DataFrame(raw_movie_list)

        #Clean Numerical Data (Ratings)
        df['imdbRating'] = pd.to_numeric(df['imdbRating'], errors='coerce').fillna(0)
        
        #Clean Year Data
        df['Year'] = df['Year'].astype(str).str.extract(r'(\d{4})').astype(float)
        df['Year'] = df['Year'].fillna(0)

        #Filter by Genre
        if genre_filter and genre_filter != 'any':
            df = df[df['Genre'].fillna('').str.lower().str.contains(genre_filter, na=False)]

        #Filter by Minimum Rating
        if min_rating:
            df = df[df['imdbRating'] >= float(min_rating)]

        #Filter by Year (Min/Max)
        if min_year:
            df = df[df['Year'] >= float(min_year)]
        
        if max_year:
            df = df[df['Year'] <= float(max_year)]

        #Sort Data
        if sort_order == 'newest':
            df = df.sort_values(by='Year', ascending=False)
        elif sort_order == 'oldest':
            df = df.sort_values(by='Year', ascending=True)
        else: 
            df = df.sort_values(by='imdbRating', ascending=False)

        #Convert back to JSON
        final_results = df.to_dict('records')

        return jsonify({"results": final_results, "count": len(final_results)})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

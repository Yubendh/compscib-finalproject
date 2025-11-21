# Wat2Watch – Movie Recommendation Website

Find movies that match your vibe with a clean front end and a lightweight Python API that proxies OMDb/IMDb data.

## Features
- Live search tied to OMDb with genre, rating, and year filtering powered by pandas
- Sort controls for highest-rated, newest, or oldest picks
- Responsive Netflix-inspired UI with isolated HTML/CSS/JS assets
- Secure API key loading from environment variables (ships with `.env.example`)

## Project Structure
```
compscib-finalproject/
├── index.html              # UI layout (links to external CSS/JS)
├── assets/
│   ├── css/styles.css      # Theme + layout styles
│   └── js/app.js           # Front-end logic + API calls
├── backend/app.py          # Flask API with pandas-based filtering
├── requirements.txt        # Python dependencies
└── .env.example            # Sample environment file for OMDb API key
```

## Getting Started
1. **Install dependencies**
	```bash
	python -m venv .venv
	.venv\Scripts\activate
	pip install -r requirements.txt
	```

2. **Configure the API key**
	```bash
	copy .env.example .env
	```
	Edit `.env` and replace the placeholder with your [OMDb API key](https://www.omdbapi.com/apikey.aspx). Keep this file out of source control.

3. **Run the Flask backend**
	```bash
	python backend/app.py
	```

4. **Serve the front end** (in a second terminal)
	```bash
	python -m http.server 8000
	```
	Visit `http://localhost:8000` and interact with the filters; the page will query `http://127.0.0.1:5000/api/recommend` under the hood.

## Environment Variables
| Name | Purpose |
| --- | --- |
| `OMDB_API_KEY` | Required to authenticate requests to OMDb. | 

## Notes
- The backend limits results to the top 10 matches to keep responses snappy.
- Extend `backend/app.py` if you need caching or pagination.
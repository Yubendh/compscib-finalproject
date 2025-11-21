import os
from functools import lru_cache
from typing import List, Dict, Any

import pandas as pd
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

OMDB_URL = os.getenv("OMDB_API_URL", "https://www.omdbapi.com/")
API_KEY = os.getenv("OMDB_API_KEY")

app = Flask(__name__)
CORS(app)


def require_api_key() -> None:
    if not API_KEY:
        raise RuntimeError("OMDB_API_KEY is missing. Add it to your environment.")


def parse_int(value: str) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def fetch_search_results(query: str, pages: int = 2) -> List[Dict[str, Any]]:
    payload = {"apikey": API_KEY, "type": "movie", "s": query or "movie"}
    results: List[Dict[str, Any]] = []
    for page in range(1, pages + 1):
        payload["page"] = page
        response = requests.get(OMDB_URL, params=payload, timeout=10)
        response.raise_for_status()
        try:
            data = response.json()
        except ValueError as exc:
            raise requests.RequestException("Invalid response from OMDb search endpoint") from exc
        if data.get("Response") == "True":
            results.extend(data.get("Search", []))
        else:
            break
    return results


@lru_cache(maxsize=256)
def fetch_movie_details(imdb_id: str) -> Dict[str, Any] | None:
    if not imdb_id:
        return None

    response = requests.get(
        OMDB_URL,
        params={"apikey": API_KEY, "i": imdb_id, "plot": "short"},
        timeout=10,
    )
    response.raise_for_status()
    try:
        data = response.json()
    except ValueError as exc:
        raise requests.RequestException("Invalid response from OMDb detail endpoint") from exc
    return data if data.get("Response") == "True" else None


def build_dataframe(records: List[Dict[str, Any]]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame()

    detailed: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for record in records:
        imdb_id = record.get("imdbID")
        if not imdb_id or imdb_id in seen:
            continue
        seen.add(imdb_id)
        details = fetch_movie_details(imdb_id)
        if details:
            detailed.append(details)
    return pd.DataFrame(detailed)


def filter_catalog(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    if df.empty:
        return df

    rating_series = df["imdbRating"] if "imdbRating" in df else pd.Series([None] * len(df), index=df.index)
    year_series = df["Year"].astype(str) if "Year" in df else pd.Series([None] * len(df), index=df.index)

    df = df.assign(
        numeric_rating=pd.to_numeric(rating_series, errors="coerce"),
        numeric_year=pd.to_numeric(year_series.str[:4], errors="coerce"),
    )

    genre = params.get("genre")
    if genre and "Genre" in df:
        df = df[df["Genre"].fillna("").str.contains(genre, case=False, na=False)]

    min_rating = parse_float(params.get("min_rating"))
    if min_rating is not None:
        df = df[df["numeric_rating"] >= min_rating]

    min_year = parse_int(params.get("min_year"))
    if min_year is not None:
        df = df[df["numeric_year"] >= min_year]

    max_year = parse_int(params.get("max_year"))
    if max_year is not None:
        df = df[df["numeric_year"] <= max_year]

    sort = params.get("sort")
    if sort == "newest":
        df = df.sort_values("numeric_year", ascending=False)
    elif sort == "oldest":
        df = df.sort_values("numeric_year", ascending=True)
    else:
        df = df.sort_values("numeric_rating", ascending=False)

    df = df.dropna(subset=["Title", "imdbID"]).head(10)
    return df.drop(columns=["numeric_rating", "numeric_year"], errors="ignore")


def format_movie(row: pd.Series) -> Dict[str, Any]:
    return {
        "title": row.get("Title"),
        "year": row.get("Year"),
        "rating": row.get("imdbRating"),
        "runtime": row.get("Runtime"),
        "genre": row.get("Genre"),
        "plot": row.get("Plot"),
        "poster": row.get("Poster"),
        "trailer": f"https://www.imdb.com/title/{row.get('imdbID')}/"
    }


@app.route("/api/recommend", methods=["GET"])
def recommend() -> Any:
    try:
        require_api_key()
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500

    query = request.args.get("q", "")
    params = {
        "genre": request.args.get("genre", ""),
        "min_rating": request.args.get("minRating", ""),
        "min_year": request.args.get("minYear", ""),
        "max_year": request.args.get("maxYear", ""),
        "sort": request.args.get("sort", "rating")
    }

    try:
        catalog = fetch_search_results(query)
        df = build_dataframe(catalog)
        filtered = filter_catalog(df, params)
        movies = [format_movie(row) for _, row in filtered.iterrows()]
        message = "Showing curated picks" if movies else "No matches found"
        return jsonify({"results": movies, "meta": {"count": len(movies), "message": message}})
    except requests.RequestException:
        return jsonify({"error": "Unable to reach OMDb API."}), 503


if __name__ == "__main__":
    app.run(debug=True)

// --- CONFIGURATION ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocal ? 'https://wat2watch-api.onrender.com' : 'https://wat2watch-api.onrender.com';

/* =========================================
   PART 1: SEARCH PAGE LOGIC (index.html)
   ========================================= */
const filtersForm = document.getElementById('filters-form');

if (filtersForm) {
    const submitButton = document.getElementById('submit-btn');
    const sortSelect = document.getElementById('sort-order');
    const resultsContainer = document.getElementById('results');
    const statusMessage = document.getElementById('status-message');
    const filterToggleBtn = document.getElementById('filter-toggle');
    const filtersSidebar = document.getElementById('filters-sidebar');

    let latestQuery = {};

    const getFilters = () => ({
        keyword: document.getElementById('keywords').value.trim(),
        genre: document.getElementById('genre').value,
        minYear: document.getElementById('year-from').value,
        maxYear: document.getElementById('year-to').value,
        minRating: document.getElementById('min-rating').value,
        sort: document.getElementById('sort-order').value
    });

    const setStatus = (text) => { statusMessage.textContent = text; statusMessage.hidden = !text; };
    const renderEmpty = (text) => { resultsContainer.innerHTML = `<div class="empty-state">${text}</div>`; };

    const createTag = (label) => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = label;
        return span;
    };

    // --- SHARED: Create Movie Card Function ---
    // We export this so the Watchlist page can use it too, 
    // but for simplicity in this file, we define it here.
    window.createMovieCard = (movie, isWatchlist = false) => {
        const card = document.createElement('article');
        card.className = 'movie-card';

        const posterWrapper = document.createElement('div');
        posterWrapper.className = 'poster-wrapper';
        const posterDiv = document.createElement('div');
        posterDiv.className = 'poster-placeholder';
        if (movie.Poster && movie.Poster !== 'N/A') {
            const img = document.createElement('img');
            img.src = movie.Poster;
            img.alt = `${movie.Title} poster`;
            posterDiv.replaceChildren(img);
        } else {
            posterDiv.innerHTML = `<div style="text-align:center"><i class="fas fa-film" style="font-size:3rem;margin-bottom:10px"></i><br>No Poster</div>`;
        }
        posterWrapper.appendChild(posterDiv);

        const info = document.createElement('div');
        info.className = 'movie-info';

        const meta = document.createElement('div');
        meta.className = 'movie-meta';
        const ratingVal = movie.imdbRating || 'N/A';
        meta.innerHTML = `<span class="rating-badge"><i class="fas fa-star"></i> ${ratingVal}</span><span>${movie.Year ? Math.floor(movie.Year) : '—'}</span>`;

        const title = document.createElement('h1');
        title.className = 'movie-title';
        title.textContent = movie.Title;

        const tags = document.createElement('div');
        tags.className = 'genre-tags';
        if(movie.Genre) {
            movie.Genre.split(',').slice(0, 3).forEach(g => tags.appendChild(createTag(g.trim())));
        }

        const plot = document.createElement('p');
        plot.className = 'movie-plot';
        plot.textContent = movie.Plot && movie.Plot !== 'N/A' ? movie.Plot : 'No plot available.';

        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        
        const imdbBtn = document.createElement('button');
        imdbBtn.className = 'btn-submit';
        imdbBtn.style.width = 'auto';
        imdbBtn.innerHTML = 'View on IMDb';
        imdbBtn.onclick = () => window.open(`https://www.imdb.com/title/${movie.imdbID}`, '_blank');
        
        // --- SAVE / REMOVE BUTTON LOGIC ---
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-outline';
        
        if (isWatchlist) {
            // If on Watchlist page, button is "Remove"
            saveBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
            saveBtn.style.borderColor = '#E50914';
            saveBtn.style.color = '#E50914';
            saveBtn.onclick = () => {
                removeFromWatchlist(movie.imdbID);
                card.remove(); // Remove from UI instantly
                if (document.getElementById('watchlist-results').children.length === 0) location.reload();
            };
        } else {
            // If on Search page, button is "Save"
            saveBtn.innerHTML = '<i class="far fa-heart"></i> Save';
            saveBtn.onclick = () => addToWatchlist(movie);
        }

        actions.append(imdbBtn, saveBtn);
        info.append(meta, title, tags, plot, actions);
        card.append(posterWrapper, info);
        return card;
    };

    const fetchRecommendations = async (filters) => {
        const searchTerm = filters.keyword || "movie"; 
        setStatus('Connecting to Python Backend...');
        renderEmpty('<i class="fas fa-spinner fa-spin"></i> Analyzing data...');

        try {
            const url = new URL(`${API_BASE}/api/recommend`);
            url.searchParams.append('q', searchTerm);
            if (filters.genre) url.searchParams.append('genre', filters.genre);
            if (filters.minRating) url.searchParams.append('minRating', filters.minRating);
            if (filters.minYear) url.searchParams.append('minYear', filters.minYear);
            if (filters.maxYear) url.searchParams.append('maxYear', filters.maxYear);
            if (filters.sort) url.searchParams.append('sort', filters.sort);

            const response = await fetch(url);
            if (!response.ok) throw new Error("Backend Error");
            const data = await response.json();
            const movies = data.results || [];

            if (movies.length === 0) {
                renderEmpty(`No matches found.`);
                setStatus('');
                return;
            }

            resultsContainer.innerHTML = '';
            movies.forEach(movie => resultsContainer.appendChild(window.createMovieCard(movie, false)));
            setStatus(`Found ${movies.length} results.`);

        } catch (error) {
            renderEmpty(`Connection Error. Make sure 'app.py' is running!`);
            setStatus('');
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        latestQuery = getFilters();
        fetchRecommendations(latestQuery);
    };

    filtersForm.addEventListener('submit', handleSubmit);
    submitButton.addEventListener('click', () => filtersForm.requestSubmit());
    sortSelect.addEventListener('change', () => filtersForm.requestSubmit());
    
    // Mobile Toggle
    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', () => {
            filtersSidebar.style.display = filtersSidebar.style.display === 'block' ? 'none' : 'block';
        });
    }
}

/* =========================================
   PART 2: WATCHLIST LOGIC (watchlist.html)
   ========================================= */
const watchlistContainer = document.getElementById('watchlist-results');
if (watchlistContainer) {
    const savedMovies = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
    const clearBtn = document.getElementById('clear-list');

    if (savedMovies.length === 0) {
        // Keep the HTML empty state
    } else {
        watchlistContainer.innerHTML = ''; // Clear empty state
        // Re-use the createMovieCard function but with isWatchlist = true
        // We need to define createMovieCard globally or copy it. 
        // For simplicity, we assume window.createMovieCard is available 
        // (but since this script runs fresh, we need to redefine a simple version or include the logic).
        // To fix scope, we will just use the render logic here:
        
        savedMovies.forEach(movie => {
            // Using the same card generator
             watchlistContainer.appendChild(window.createMovieCard(movie, true)); 
        });
    }

    clearBtn.addEventListener('click', () => {
        if(confirm("Clear your entire list?")) {
            localStorage.removeItem('wat2watch_list');
            location.reload();
        }
    });
}

// --- LOCAL STORAGE HELPERS ---
function addToWatchlist(movie) {
    let list = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
    // Check duplicates
    if (!list.some(m => m.imdbID === movie.imdbID)) {
        list.push(movie);
        localStorage.setItem('wat2watch_list', JSON.stringify(list));
        alert(`${movie.Title} saved to your list!`);
    } else {
        alert("Movie is already in your list.");
    }
}

function removeFromWatchlist(id) {
    let list = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
    list = list.filter(m => m.imdbID !== id);
    localStorage.setItem('wat2watch_list', JSON.stringify(list));
}

// Make createMovieCard globally available if on Watchlist page
if (watchlistContainer && !window.createMovieCard) {
    window.createMovieCard = (movie, isWatchlist) => {
        const card = document.createElement('article');
        card.className = 'movie-card';
        const posterWrapper = document.createElement('div');
        posterWrapper.className = 'poster-wrapper';
        const img = document.createElement('img');
        img.src = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : '';
        img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
        posterWrapper.appendChild(img);
        
        const info = document.createElement('div');
        info.className = 'movie-info';
        
        const title = document.createElement('h1');
        title.className = 'movie-title';
        title.textContent = movie.Title;

        const actions = document.createElement('div');
        actions.className = 'action-buttons';
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-outline';
        removeBtn.innerHTML = 'Remove';
        removeBtn.style.color = 'red';
        removeBtn.style.borderColor = 'red';
        removeBtn.onclick = () => {
             removeFromWatchlist(movie.imdbID);
             card.remove();
             if (JSON.parse(localStorage.getItem('wat2watch_list')).length === 0) location.reload();
        };
        actions.appendChild(removeBtn);

        info.append(title, actions);
        card.append(posterWrapper, info);
        return card;
    };
}
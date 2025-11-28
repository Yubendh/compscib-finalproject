// --- CONFIGURATION ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocal ? 'https://wat2watch-api.onrender.com' : 'https://wat2watch-api.onrender.com';

/* =========================================
   GLOBAL HELPER: Create Movie Card
   (Must be at the top so ALL pages can use it)
   ========================================= */
const createMovieCard = (movie, isWatchlist = false) => {
    const card = document.createElement('article');
    card.className = 'movie-card';

    // 1. Poster
    const posterWrapper = document.createElement('div');
    posterWrapper.className = 'poster-wrapper';
    const posterDiv = document.createElement('div');
    posterDiv.className = 'poster-placeholder';
    
    if (movie.Poster && movie.Poster !== 'N/A') {
        const img = document.createElement('img');
        img.src = movie.Poster;
        img.alt = `${movie.Title} poster`;
        img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
        posterDiv.replaceChildren(img);
    } else {
        posterDiv.innerHTML = `<div style="text-align:center; padding-top: 40%;"><i class="fas fa-film" style="font-size:3rem;margin-bottom:10px"></i><br>No Poster</div>`;
    }
    posterWrapper.appendChild(posterDiv);

    // 2. Info Section
    const info = document.createElement('div');
    info.className = 'movie-info';

    // Meta Data
    const meta = document.createElement('div');
    meta.className = 'movie-meta';
    const ratingVal = movie.imdbRating || 'N/A';
    // Handle Year (could be number or string depending on where it came from)
    let yearDisplay = '—';
    if (movie.Year) {
        // If it comes from OMDb it might be "2014", if from Python it might be 2014.0
        yearDisplay = String(movie.Year).split('.')[0]; 
    }
    
    meta.innerHTML = `<span class="rating-badge"><i class="fas fa-star"></i> ${ratingVal}</span><span>${yearDisplay}</span>`;

    // Title
    const title = document.createElement('h1');
    title.className = 'movie-title';
    title.textContent = movie.Title;

    // Genres (Only show on Search page usually, or if data exists)
    const tags = document.createElement('div');
    tags.className = 'genre-tags';
    if(movie.Genre) {
        movie.Genre.split(',').slice(0, 3).forEach(g => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = g.trim();
            tags.appendChild(span);
        });
    }

    // Plot
    const plot = document.createElement('p');
    plot.className = 'movie-plot';
    // Truncate plot for watchlist to save space
    const plotText = movie.Plot && movie.Plot !== 'N/A' ? movie.Plot : 'No plot available.';
    plot.textContent = isWatchlist ? plotText.substring(0, 100) + '...' : plotText;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    
    const imdbBtn = document.createElement('button');
    imdbBtn.className = 'btn-submit';
    imdbBtn.style.width = 'auto';
    imdbBtn.innerHTML = 'View on IMDb';
    imdbBtn.onclick = () => window.open(`https://www.imdb.com/title/${movie.imdbID}`, '_blank');
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-outline';
    
    if (isWatchlist) {
        // --- REMOVE BUTTON (For Watchlist Page) ---
        saveBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
        saveBtn.style.borderColor = '#E50914'; // Red border
        saveBtn.style.color = '#E50914';       // Red text
        saveBtn.onmouseover = () => { saveBtn.style.background = '#E50914'; saveBtn.style.color = 'white'; };
        saveBtn.onmouseout = () => { saveBtn.style.background = 'transparent'; saveBtn.style.color = '#E50914'; };
        
        saveBtn.onclick = () => {
            removeFromWatchlist(movie.imdbID);
            card.remove(); // Remove from UI immediately
            // If list becomes empty, reload to show empty state
            const remaining = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
            if (remaining.length === 0) location.reload();
        };
    } else {
        // --- SAVE BUTTON (For Search Page) ---
        saveBtn.innerHTML = '<i class="far fa-heart"></i> Save';
        saveBtn.onclick = () => addToWatchlist(movie);
    }

    actions.append(imdbBtn, saveBtn);
    info.append(meta, title, tags, plot, actions);
    card.append(posterWrapper, info);
    
    return card;
};

/* =========================================
   PART 2: LOCAL STORAGE HELPERS
   ========================================= */
function addToWatchlist(movie) {
    let list = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
    // Check for duplicates
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

/* =========================================
   PART 3: SEARCH PAGE LOGIC (index.html)
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
            movies.forEach(movie => resultsContainer.appendChild(createMovieCard(movie, false)));
            setStatus(`Found ${movies.length} results.`);

        } catch (error) {
            console.error(error);
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
    
    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', () => {
            filtersSidebar.style.display = filtersSidebar.style.display === 'block' ? 'none' : 'block';
        });
    }
}

/* =========================================
   PART 4: WATCHLIST PAGE LOGIC (watchlist.html)
   ========================================= */
const watchlistContainer = document.getElementById('watchlist-results');

if (watchlistContainer) {
    // 1. Load movies immediately on page load
    const savedMovies = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
    const clearBtn = document.getElementById('clear-list');

    if (savedMovies.length > 0) {
        watchlistContainer.innerHTML = ''; // Remove "Empty" placeholder
        
        savedMovies.forEach(movie => {
            // Add the movie card to the UI
            watchlistContainer.appendChild(createMovieCard(movie, true)); 
        });
    }

    // 2. Fixed Clear All Logic
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            // Check the storage DIRECTLY right now (don't trust the variable from page load)
            const currentList = JSON.parse(localStorage.getItem('wat2watch_list')) || [];
            
            if (currentList.length === 0) {
                alert("Your list is already empty!");
                return;
            }

            if(confirm("Are you sure you want to clear your entire list?")) {
                // Force it to be an empty array
                localStorage.setItem('wat2watch_list', '[]');
                // Reload the page to show the empty state
                location.reload();
            }
        });
    }
}

/* =========================================
   PART 5: LOGIN LOGIC (Global)
   ========================================= */
const loginModal = document.getElementById('login-modal');
if (loginModal) {
    const userMenuBtn = document.querySelector('.user-menu'); 
    const closeModalBtn = document.querySelector('.close-modal');
    const loginForm = document.getElementById('login-form');
    const userIcon = userMenuBtn.querySelector('i');

    let userNameSpan = document.createElement('span');
    userNameSpan.className = 'user-name';
    userMenuBtn.appendChild(userNameSpan);

    const savedUser = localStorage.getItem('wat2watch_user');
    if (savedUser) updateUIForLogin(savedUser);

    userMenuBtn.addEventListener('click', () => {
        if (localStorage.getItem('wat2watch_user')) {
            if (confirm("Do you want to log out?")) {
                localStorage.removeItem('wat2watch_user');
                window.location.reload();
            }
        } else {
            loginModal.style.display = 'flex';
        }
    });

    closeModalBtn.addEventListener('click', () => loginModal.style.display = 'none');
    window.onclick = (event) => { if (event.target === loginModal) loginModal.style.display = 'none'; };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        localStorage.setItem('wat2watch_user', email);
        updateUIForLogin(email);
        loginModal.style.display = 'none';
        alert(`Welcome back, ${email}!`);
    });

    function updateUIForLogin(email) {
        userIcon.style.color = '#E50914';
        const shortName = email.split('@')[0];
        userNameSpan.textContent = shortName;
        userNameSpan.style.display = 'block';
    }
}
// --- CONFIGURATION ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// PASTE YOUR RENDER URL BELOW (Make sure there is NO slash '/' at the end)
const API_BASE = isLocal ? 'http://127.0.0.1:5000' : 'https://wat2watch-api.onrender.com';

/* =========================================
   PART 1: SEARCH PAGE LOGIC
   (Only runs if we are on index.html)
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

    // Helper: Collect inputs from the form
    const getFilters = () => ({
        keyword: document.getElementById('keywords').value.trim(),
        genre: document.getElementById('genre').value, // Backend handles lowercase
        minYear: document.getElementById('year-from').value,
        maxYear: document.getElementById('year-to').value,
        minRating: document.getElementById('min-rating').value,
        sort: document.getElementById('sort-order').value
    });

    // Helper: Show status text
    const setStatus = (text) => {
        statusMessage.textContent = text;
        statusMessage.hidden = !text;
    };

    // Helper: Show empty state / error
    const renderEmpty = (text) => {
        resultsContainer.innerHTML = `<div class="empty-state">${text}</div>`;
    };

    // Helper: Create HTML for Genre tags
    const createTag = (label) => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = label;
        return span;
    };

    // Helper: Build the Movie Card HTML
    const createMovieCard = (movie) => {
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
        
        // Handle float ratings coming from backend
        const ratingVal = movie.imdbRating || 'N/A';
        const ratingHtml = `<span class="rating-badge"><i class="fas fa-star"></i> ${ratingVal}</span>`;
        // Handle float years coming from backend (remove decimals if present)
        const yearVal = movie.Year ? Math.floor(movie.Year) : '—';
        const yearSpan = `<span>${yearVal}</span>`;
        const runtimeSpan = `<span>${movie.Runtime || ''}</span>`;
        
        meta.innerHTML = ratingHtml + yearSpan + runtimeSpan;

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
        
        // Save Button Logic
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-outline';
        saveBtn.innerHTML = '<i class="far fa-heart"></i> Save';
        saveBtn.onclick = () => {
             alert("Saved feature would connect to database here.");
        };

        actions.append(imdbBtn, saveBtn);
        info.append(meta, title, tags, plot, actions);
        card.append(posterWrapper, info);
        
        return card;
    };

    // CORE LOGIC: Talk to Python Backend
    const fetchRecommendations = async (filters) => {
        const searchTerm = filters.keyword || "movie"; 

        setStatus('Connecting to Python Backend...');
        renderEmpty('<i class="fas fa-spinner fa-spin"></i> Analyzing data...');

        try {
            // Construct URL parameters
            const url = new URL(`${API_BASE}/api/recommend`);
            url.searchParams.append('q', searchTerm);
            if (filters.genre) url.searchParams.append('genre', filters.genre);
            if (filters.minRating) url.searchParams.append('minRating', filters.minRating);
            if (filters.sort) url.searchParams.append('sort', filters.sort);

            // Fetch from backend
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Backend Error");
            }

            const data = await response.json();
            const movies = data.results || [];

            if (movies.length === 0) {
                renderEmpty(`Backend processed the data but found no matches for your filters.`);
                setStatus('');
                return;
            }

            // Render Results
            resultsContainer.innerHTML = '';
            movies.forEach(movie => resultsContainer.appendChild(createMovieCard(movie)));
            setStatus(`Showing ${movies.length} results sorted by ${filters.sort}.`);

        } catch (error) {
            console.error(error);
            renderEmpty(`Connection Error: ${error.message}. <br><br>Make sure 'app.py' is running!`);
            setStatus('');
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        latestQuery = getFilters();
        fetchRecommendations(latestQuery);
    };

    // Event Listeners
    filtersForm.addEventListener('submit', handleSubmit);
    submitButton.addEventListener('click', () => filtersForm.requestSubmit());
    sortSelect.addEventListener('change', () => filtersForm.requestSubmit());

    // Mobile Toggle Logic
    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', () => {
            if (filtersSidebar.style.display === 'block') {
                filtersSidebar.style.display = 'none';
                filterToggleBtn.innerHTML = '<i class="fas fa-sliders-h"></i> Show Filters';
            } else {
                filtersSidebar.style.display = 'block';
                filterToggleBtn.innerHTML = '<i class="fas fa-times"></i> Close Filters';
            }
        });
    }
}

/* =========================================
   PART 2: GLOBAL LOGIC (Login, Menu)
   (Runs on all pages: Home, About, Contact)
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

    // Check Login State
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
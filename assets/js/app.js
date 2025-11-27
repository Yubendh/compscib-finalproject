// 1. PUT YOUR OMDB API KEY HERE
const API_KEY = '17c09ca2'; 
const API_URL = 'https://www.omdbapi.com/';

const filtersForm = document.getElementById('filters-form');
const submitButton = document.getElementById('submit-btn');
const sortSelect = document.getElementById('sort-order');
const resultsContainer = document.getElementById('results');
const statusMessage = document.getElementById('status-message');

let latestQuery = {};

const getFilters = () => ({
    keyword: document.getElementById('keywords').value.trim(),
    genre: document.getElementById('genre').value.toLowerCase(),
    minYear: document.getElementById('year-from').value,
    maxYear: document.getElementById('year-to').value,
    minRating: document.getElementById('min-rating').value,
    sort: document.getElementById('sort-order').value
});

const setStatus = (text) => {
    statusMessage.textContent = text;
    statusMessage.hidden = !text;
};

const renderEmpty = (text) => {
    resultsContainer.innerHTML = `<div class="empty-state">${text}</div>`;
};

const createTag = (label) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = label;
    return span;
};

const createMovieCard = (movie) => {
    const card = document.createElement('article');
    card.className = 'movie-card';

    const posterWrapper = document.createElement('div');
    posterWrapper.className = 'poster-wrapper';
    
    // Poster Handling
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

    // Meta: Rating, Year, Runtime
    const meta = document.createElement('div');
    meta.className = 'movie-meta';
    
    const ratingHtml = `<span class="rating-badge"><i class="fas fa-star"></i> ${movie.imdbRating || 'N/A'}</span>`;
    const yearSpan = `<span>${movie.Year}</span>`;
    const runtimeSpan = `<span>${movie.Runtime}</span>`;
    
    meta.innerHTML = ratingHtml + yearSpan + runtimeSpan;

    const title = document.createElement('h1');
    title.className = 'movie-title';
    title.textContent = movie.Title;

    // Genres
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
    
    actions.appendChild(imdbBtn);
    info.append(meta, title, tags, plot, actions);
    card.append(posterWrapper, info);
    
    return card;
};

const fetchRecommendations = async (filters) => {
    // OMDB requires a search term (s=). If user leaves it blank, we can't search easily.
    // We will default to a common word like "love" or "star" if empty, 
    // or alert the user.
    const searchTerm = filters.keyword || "movie"; 

    setStatus('Searching OMDB database...');
    renderEmpty('<i class="fas fa-spinner fa-spin"></i> Loading...');

    try {
        // 1. Initial Search to get a list of IDs
        const searchUrl = `${API_URL}?apikey=${API_KEY}&s=${searchTerm}&type=movie`;
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.Response === "False") {
            throw new Error(data.Error || "No movies found.");
        }

        setStatus('Filtering details...');
        
        // 2. Fetch detailed info for every movie found (to check Genre and Rating)
        // OMDB Search doesn't return Rating/Genre, so we must fetch by ID
        const detailedPromises = data.Search.slice(0, 10).map(item => 
            fetch(`${API_URL}?apikey=${API_KEY}&i=${item.imdbID}`).then(res => res.json())
        );

        let detailedMovies = await Promise.all(detailedPromises);

        // 3. Client-side Filtering
        let filtered = detailedMovies.filter(movie => {
            // Filter by Genre
            if (filters.genre && !movie.Genre.toLowerCase().includes(filters.genre)) return false;
            
            // Filter by Rating
            const rating = parseFloat(movie.imdbRating);
            if (filters.minRating && (isNaN(rating) || rating < parseFloat(filters.minRating))) return false;

            // Filter by Year
            const year = parseInt(movie.Year);
            if (filters.minYear && year < parseInt(filters.minYear)) return false;
            if (filters.maxYear && year > parseInt(filters.maxYear)) return false;

            return true;
        });

        // 4. Sorting
        if (filters.sort === 'rating') {
            filtered.sort((a, b) => parseFloat(b.imdbRating) - parseFloat(a.imdbRating));
        } else if (filters.sort === 'newest') {
            filtered.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
        } else if (filters.sort === 'oldest') {
            filtered.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
        }

        // 5. Render
        if (filtered.length === 0) {
            renderEmpty(`Found movies for "${searchTerm}", but none matched your Genre/Rating filters.`);
            setStatus('');
            return;
        }

        resultsContainer.innerHTML = '';
        filtered.forEach(movie => resultsContainer.appendChild(createMovieCard(movie)));
        setStatus(`Found ${filtered.length} matches.`);

    } catch (error) {
        renderEmpty(error.message);
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

// Note: Removed the auto-load on DOMContentLoaded to save API calls, 
// or you can leave it but ensure a default keyword is set.

/* --- MOBILE FILTER TOGGLE LOGIC --- */
const filterToggleBtn = document.getElementById('filter-toggle');
const filtersSidebar = document.getElementById('filters-sidebar');

if (filterToggleBtn) {
    filterToggleBtn.addEventListener('click', () => {
        // Toggle logic
        if (filtersSidebar.style.display === 'block') {
            filtersSidebar.style.display = 'none';
            filterToggleBtn.innerHTML = '<i class="fas fa-sliders-h"></i> Show Filters';
        } else {
            filtersSidebar.style.display = 'block';
            filterToggleBtn.innerHTML = '<i class="fas fa-times"></i> Close Filters';
        }
    });
}

// Ensure filters reset when switching back to desktop view
window.addEventListener('resize', () => {
    if (window.innerWidth > 850) {
        filtersSidebar.style.display = 'block';
    } else {
        filtersSidebar.style.display = 'none';
        if(filterToggleBtn) filterToggleBtn.innerHTML = '<i class="fas fa-sliders-h"></i> Show Filters';
    }
});

/* --- LOGIN MOCKUP LOGIC --- */

const loginModal = document.getElementById('login-modal');
const userMenuBtn = document.querySelector('.user-menu'); // The icon in header
const closeModalBtn = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const userIcon = userMenuBtn.querySelector('i');

// Create a span for the username if it doesn't exist
let userNameSpan = document.createElement('span');
userNameSpan.className = 'user-name';
userMenuBtn.appendChild(userNameSpan);

// 1. Check if user is already "logged in" from previous session
const savedUser = localStorage.getItem('wat2watch_user');
if (savedUser) {
    updateUIForLogin(savedUser);
}

// 2. Open Modal Function
userMenuBtn.addEventListener('click', () => {
    // If already logged in, clicking the icon asks to Logout
    if (localStorage.getItem('wat2watch_user')) {
        const doLogout = confirm("Do you want to log out?");
        if (doLogout) {
            localStorage.removeItem('wat2watch_user');
            window.location.reload();
        }
    } else {
        // If not logged in, show modal
        loginModal.style.display = 'flex';
    }
});

// 3. Close Modal Function
closeModalBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

// Close if clicking outside the box
window.onclick = (event) => {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
};

// 4. Handle Login Submit
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    // Note: Since this is static, we accept ANY password.
    // In a real app, you would send this to a python backend to verify.
    
    // Save to browser memory
    localStorage.setItem('wat2watch_user', email);
    
    // Update UI
    updateUIForLogin(email);
    
    // Close Modal
    loginModal.style.display = 'none';
    alert(`Welcome back, ${email}!`);
});

function updateUIForLogin(email) {
    // Change Icon Color
    userIcon.style.color = '#E50914'; // Red (Logged in)
    
    // Show Name (Split email to get name before @)
    const shortName = email.split('@')[0];
    userNameSpan.textContent = shortName;
    userNameSpan.style.display = 'block';
}
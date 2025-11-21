const localHostnames = ['localhost', '127.0.0.1'];
const API_BASE = localHostnames.includes(window.location.hostname) ? 'http://127.0.0.1:5000' : '';

const filtersForm = document.getElementById('filters-form');
const submitButton = document.getElementById('submit-btn');
const sortSelect = document.getElementById('sort-order');
const resultsContainer = document.getElementById('results');
const statusMessage = document.getElementById('status-message');

let latestQuery = {};

const buildQuery = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '') params.append(key, value);
    });
    return params.toString();
};

const getFilters = () => ({
    q: document.getElementById('keywords').value.trim(),
    genre: document.getElementById('genre').value,
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

    const poster = document.createElement('div');
    poster.className = 'poster-placeholder';

    if (movie.poster && movie.poster !== 'N/A') {
        const img = document.createElement('img');
        img.src = movie.poster;
        img.alt = `${movie.title} poster`;
        poster.replaceChildren(img);
    } else {
        poster.innerHTML = `<div style="text-align:center"><i class="fas fa-film" style="font-size:3rem;margin-bottom:10px"></i><br>Movie Poster</div>`;
    }

    posterWrapper.appendChild(poster);

    const info = document.createElement('div');
    info.className = 'movie-info';

    const meta = document.createElement('div');
    meta.className = 'movie-meta';

    const rating = document.createElement('span');
    rating.className = 'rating-badge';
    rating.innerHTML = `<i class="fas fa-star"></i> ${movie.rating ?? 'N/A'}`;

    const year = document.createElement('span');
    year.textContent = movie.year ?? '—';

    const runtime = document.createElement('span');
    runtime.textContent = movie.runtime ?? '';

    meta.append(rating, year, runtime);

    const title = document.createElement('h1');
    title.className = 'movie-title';
    title.textContent = movie.title;

    const tags = document.createElement('div');
    tags.className = 'genre-tags';
    movie.genre?.split(',').slice(0, 3).map((tag) => tag.trim()).forEach((tag) => tags.appendChild(createTag(tag)));

    const plot = document.createElement('p');
    plot.className = 'movie-plot';
    plot.textContent = movie.plot ?? '';

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    if (movie.trailer) {
        const trailerBtn = document.createElement('button');
        trailerBtn.className = 'btn-submit';
        trailerBtn.style.width = 'auto';
        trailerBtn.type = 'button';
        trailerBtn.textContent = 'Watch Trailer';
        trailerBtn.onclick = () => window.open(movie.trailer, '_blank');
        actions.appendChild(trailerBtn);
    }

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-outline';
    saveBtn.type = 'button';
    saveBtn.innerHTML = '<i class="far fa-heart"></i> Save';
    saveBtn.onclick = () => alert('Add this movie to your personal list.');
    actions.appendChild(saveBtn);

    info.append(meta, title, tags, plot, actions);
    card.append(posterWrapper, info);
    return card;
};

const renderMovies = (movies) => {
    if (!movies.length) {
        renderEmpty('No movies matched your filters. Try another search.');
        return;
    }
    resultsContainer.innerHTML = '';
    movies.forEach((movie) => resultsContainer.appendChild(createMovieCard(movie)));
};

const fetchRecommendations = async (filters) => {
    setStatus('Finding the right movie...');
    renderEmpty('Loading results...');
    try {
        const query = buildQuery(filters);
        const response = await fetch(`${API_BASE}/api/recommend?${query}`);
        if (!response.ok) throw new Error('Unable to fetch recommendations');
        const data = await response.json();
        renderMovies(data.results ?? []);
        setStatus(data.meta?.message ?? '');
    } catch (error) {
        renderEmpty('Something went wrong. Check the backend server.');
        setStatus(error.message);
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

window.addEventListener('DOMContentLoaded', () => {
    latestQuery = getFilters();
    fetchRecommendations(latestQuery);
});

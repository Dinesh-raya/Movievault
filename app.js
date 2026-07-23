const OMDB_API_KEY = "82e034db";

const firebaseConfig = {
  apiKey: "AIzaSyA7q8CwpYI7wPjVFDOGfHcki__L4NZYOys",
  authDomain: "mymovievalult.firebaseapp.com",
  databaseURL: "https://mymovievalult-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mymovievalult",
  storageBucket: "mymovievalult.firebasestorage.app",
  messagingSenderId: "835718859866",
  appId: "1:835718859866:web:af843b0cf3a81004629c63"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let moviesData = [];
let loading = true;
let isOwner = false;
let currentUser = null;

const movieInput = document.getElementById('movieInput');
const statusInput = document.getElementById('statusInput');
const myRating = document.getElementById('myRating');
const myNotes = document.getElementById('myNotes');
const addBtn = document.getElementById('addBtn');
const movieGrid = document.getElementById('movieGrid');
const filterSearch = document.getElementById('filterSearch');
const filterStatus = document.getElementById('filterStatus');
const filterGenre = document.getElementById('filterGenre');
const filterSort = document.getElementById('filterSort');
const modal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const movieCount = document.getElementById('movieCount');
const sidebarGenres = document.getElementById('sidebarGenres');
const statsGroup = document.getElementById('statsGroup');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const authLoading = document.getElementById('authLoading');
const authLoggedOut = document.getElementById('authLoggedOut');
const authLoggedIn = document.getElementById('authLoggedIn');
const authUser = document.getElementById('authUser');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarAdd = document.querySelector('.sidebar-add');
const sidebarBatch = document.getElementById('sidebarBatch');
const batchToggle = document.getElementById('batchToggle');
const batchSection = document.getElementById('batchSection');
const batchInput = document.getElementById('batchInput');
const batchBtn = document.getElementById('batchBtn');
const batchProgress = document.getElementById('batchProgress');
const exportBtn = document.getElementById('exportBtn');
const OWNER_EMAIL = "dineshraya365@gmail.com";

document.getElementById('closeModal').addEventListener('click', () => closeModal());
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.addEventListener('click', e => {
  if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
    sidebar.classList.remove('open');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault(); filterSearch.focus();
  }
  if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault(); movieInput.focus();
  }
});

// Auth
const auth = firebase.auth();
auth.useDeviceLanguage();

loginBtn.addEventListener('click', async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') toast('Sign in failed', 'error');
  }
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
  currentUser = user;
  authLoading.style.display = 'none';
  if (user) {
    isOwner = user.email === OWNER_EMAIL;
    authLoggedOut.style.display = 'none';
    authLoggedIn.style.display = 'flex';
    authUser.innerHTML = `
      ${user.photoURL ? `<img class="auth-avatar" src="${user.photoURL}" alt="">` : `<div class="auth-avatar" style="background:var(--accent-gold);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;">${user.email[0].toUpperCase()}</div>`}
      <div><div>${user.displayName || 'User'}</div><div class="auth-email">${user.email}</div></div>
    `;
    if (!isOwner) {
      toast('Signed in as viewer. Only the owner can modify movies.', 'info');
    }
  } else {
    isOwner = false;
    authLoggedOut.style.display = 'flex';
    authLoggedIn.style.display = 'none';
  }
  updateAuthUI();
});

function updateAuthUI() {
  sidebarAdd.style.display = isOwner ? '' : 'none';
  sidebarBatch.style.display = isOwner ? '' : 'none';
}

function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '\u2705', error: '\u274C', info: '\u2139\uFE0F' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span class="toast-message">${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease both';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function closeModal() {
  modal.classList.remove('active');
}

// Add Movie
addBtn.addEventListener('click', async () => {
  if (!isOwner) return toast('Only the owner can add movies', 'error');
  const query = movieInput.value.trim();
  if (!query) return toast('Enter a movie title', 'error');

  const exists = moviesData.some(m => m.title.toLowerCase() === query.toLowerCase());
  if (exists) {
    const addAnyway = confirm(`"${query}" is already in your vault. Add it again?`);
    if (!addAnyway) return;
  }

  addBtn.disabled = true;
  addBtn.textContent = '...';

  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`);
    const data = await res.json();

    if (data.Response === 'False') {
      toast('Movie not found on OMDb', 'error');
    } else {
      const newMovie = {
        title: data.Title,
        year: data.Year,
        poster: data.Poster !== 'N/A' ? data.Poster : '',
        imdbRating: data.imdbRating,
        imdbID: data.imdbID || '',
        genres: data.Genre ? data.Genre.split(', ') : [],
        plot: data.Plot,
        status: statusInput.value,
        myRating: myRating.value || '',
        myNotes: myNotes.value.trim() || '',
        createdAt: new Date().toISOString()
      };

      await db.ref('movies').push(newMovie);
      movieInput.value = '';
      myRating.value = '';
      myNotes.value = '';
      toast(`Added "${data.Title}"`, 'success');
    }
  } catch (err) {
    toast('Error adding movie. Check your connection.', 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Add';
  }
});

// Listen to Realtime Data
db.ref('movies').on('value', snapshot => {
  loading = false;
  const data = snapshot.val();
  moviesData = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
  updateGenreDropdown();
  renderMovies();
});

function getSortedMovies(list) {
  const sort = filterSort ? filterSort.value : 'recent';
  const sorted = [...list];
  switch (sort) {
    case 'rating': sorted.sort((a, b) => parseFloat(b.imdbRating || 0) - parseFloat(a.imdbRating || 0)); break;
    case 'myrating': sorted.sort((a, b) => parseFloat(b.myRating || 0) - parseFloat(a.myRating || 0)); break;
    case 'year': sorted.sort((a, b) => parseInt(b.year) - parseInt(a.year)); break;
    case 'title': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
    default: sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
  }
  return sorted;
}

// Render Movies Grid
function renderMovies() {
  if (loading) {
    movieGrid.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p>Loading your vault...</p></div>';
    movieCount.textContent = '...';
    return;
  }

  if (moviesData.length === 0) {
    movieGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎬</div><h3>Your vault is empty</h3><p>Search for a movie and add it to get started!</p></div>';
    movieCount.textContent = '0 movies';
    statsGroup.innerHTML = '';
    return;
  }

  const search = filterSearch.value.toLowerCase();
  const status = filterStatus.value;
  const genre = filterGenre.value;

  let filtered = moviesData.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search);
    const matchesStatus = status === 'All' || m.status === status;
    const matchesGenre = genre === 'All' || (m.genres && m.genres.includes(genre));
    return matchesSearch && matchesStatus && matchesGenre;
  });

  filtered = getSortedMovies(filtered);

  // Stats
  const total = moviesData.length;
  const watched = moviesData.filter(m => m.status === 'Watched').length;
  const avgRating = moviesData.filter(m => m.myRating).reduce((s, m) => s + parseFloat(m.myRating), 0);
  const avgCount = moviesData.filter(m => m.myRating).length;
  const avg = avgCount ? (avgRating / avgCount).toFixed(1) : '--';
  statsGroup.innerHTML = `
    <span class="stat-pill"><strong>${total}</strong> total</span>
    <span class="stat-pill"><strong>${watched}</strong> watched</span>
    <span class="stat-pill"><strong>${total - watched}</strong> plan to watch</span>
    <span class="stat-pill">Avg <strong>${avg}</strong>/10</span>
  `;

  if (filtered.length === 0) {
    movieGrid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No matches found</h3><p>Try a different search or filter.</p></div>';
    movieCount.textContent = '0 movies';
    return;
  }

  movieCount.textContent = `${filtered.length} movie${filtered.length !== 1 ? 's' : ''}`;

  movieGrid.innerHTML = filtered.map((m, i) => {
    const posterSrc = m.poster || 'https://via.placeholder.com/300x450/15181e/6b7280?text=No+Poster';
    return `<div class="movie-card" onclick="openMovieModal('${m.id}')" style="animation-delay:${(i % 20) * 0.04}s">
      <div class="poster-wrapper">
        <img src="${posterSrc}" alt="${m.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/15181e/6b7280?text=No+Poster'">
        <span class="badge-year">${m.year}</span>
        <span class="badge-rating"><span>★</span> ${m.imdbRating || 'N/A'}</span>
      </div>
      <div class="card-title-box">
        <h4>${m.title}</h4>
        ${m.myRating ? `<div class="my-rating-badge">★ ${m.myRating}/10</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// Open Detail Modal
function openMovieModal(id) {
  const movie = moviesData.find(m => m.id === id);
  if (!movie) return;

  modalBody.innerHTML = `
    <div style="border-radius:12px; overflow:hidden; margin-bottom:16px;">
      <img src="${movie.poster || 'https://via.placeholder.com/300x450/15181e/6b7280?text=No+Poster'}" style="width:100%; max-height:300px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300x450/15181e/6b7280?text=No+Poster'" />
    </div>
    <h2>${movie.title}</h2>
    <div class="modal-meta">
      ${movie.imdbID ? `<a href="https://www.imdb.com/title/${movie.imdbID}" target="_blank" class="rating" title="Open on IMDb">★ ${movie.imdbRating || 'N/A'}</a>` : `<span class="rating">★ ${movie.imdbRating || 'N/A'}</span>`}
      <span>${movie.year}</span>
      <span class="status-badge">${movie.status}</span>
    </div>
    ${displayRating(movie)}
    ${movie.myNotes ? `<div class="my-notes-modal">${movie.myNotes}</div>` : ''}
    <p class="modal-plot">${movie.plot || 'No plot available.'}</p>
    ${isOwner ? `<div class="modal-actions">
      <button class="edit-action-btn" onclick="editMovieModal('${movie.id}')">Edit</button>
      <button class="delete-action-btn" onclick="deleteMovie('${movie.id}')">Delete</button>
    </div>` : ''}
  `;

  modal.classList.add('active');
}

function displayRating(movie) {
  if (!movie.myRating) return '';
  return `<div class="my-rating-modal"><span class="label">My Rating:</span><span class="value">★ ${movie.myRating}/10</span></div>`;
}

// Edit Movie in Modal
function editMovieModal(id) {
  const movie = moviesData.find(m => m.id === id);
  if (!movie) return;
  modalBody.innerHTML = `
    <div style="border-radius:12px; overflow:hidden; margin-bottom:16px;">
      <img src="${movie.poster || 'https://via.placeholder.com/300x450/15181e/6b7280?text=No+Poster'}" style="width:100%; max-height:300px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300x450/15181e/6b7280?text=No+Poster'" />
    </div>
    <h2>${movie.title}</h2>
    <div class="modal-meta">
      <span class="rating">★ ${movie.imdbRating || 'N/A'}</span>
      <span>${movie.year}</span>
      <select class="modal-edit-select" id="editStatus">
        <option value="Watched" ${movie.status === 'Watched' ? 'selected' : ''}>Watched</option>
        <option value="Plan to Watch" ${movie.status === 'Plan to Watch' ? 'selected' : ''}>Plan to Watch</option>
      </select>
    </div>
    <div style="margin-bottom:10px;">
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">My Rating (1-10)</div>
      <input type="number" class="modal-edit-input" id="editRating" value="${movie.myRating || ''}" min="1" max="10" step="0.5" style="width:120px;">
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">My Notes</div>
      <textarea class="modal-edit-textarea" id="editNotes" rows="3">${movie.myNotes || ''}</textarea>
    </div>
    <p class="modal-plot">${movie.plot || 'No plot available.'}</p>
    <div class="modal-actions">
      <button class="cancel-action-btn" onclick="openMovieModal('${movie.id}')">Cancel</button>
      <button class="save-action-btn" onclick="saveEditMovie('${movie.id}')">Save Changes</button>
    </div>
  `;
}

// Save Edit
async function saveEditMovie(id) {
  if (!isOwner) return toast('Only the owner can edit movies', 'error');
  const status = document.getElementById('editStatus').value;
  const rating = document.getElementById('editRating').value;
  const notes = document.getElementById('editNotes').value.trim();

  try {
    await db.ref(`movies/${id}`).update({
      status,
      myRating: rating || '',
      myNotes: notes || ''
    });
    toast('Movie updated', 'success');
    closeModal();
  } catch (err) {
    toast('Error saving changes', 'error');
  }
}

// Delete Movie
async function deleteMovie(id) {
  if (!isOwner) return toast('Only the owner can delete movies', 'error');
  if (confirm('Remove this movie from your vault?')) {
    try {
      await db.ref(`movies/${id}`).remove();
      closeModal();
      toast('Movie removed', 'success');
    } catch (err) {
      toast('Error deleting movie', 'error');
    }
  }
}

// Export as JSON
exportBtn.addEventListener('click', () => {
  if (moviesData.length === 0) return toast('No movies to export', 'error');
  const blob = new Blob([JSON.stringify(moviesData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `movievault-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Vault exported', 'success');
});

// Batch Toggle
batchToggle.addEventListener('click', () => {
  batchSection.style.display = batchSection.style.display === 'none' ? '' : 'none';
});

// Batch Add
batchBtn.addEventListener('click', async () => {
  if (!isOwner) return toast('Only the owner can add movies', 'error');
  const titles = batchInput.value.split(',').map(t => t.trim()).filter(Boolean);
  if (!titles.length) return toast('Paste at least one title', 'error');

  batchBtn.disabled = true;
  let added = 0, failed = 0;

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    batchProgress.textContent = `${i + 1}/${titles.length}: ${title}`;

    const exists = moviesData.some(m => m.title.toLowerCase() === title.toLowerCase());
    if (exists) { failed++; continue; }

    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`);
      const data = await res.json();
      if (data.Response === 'False') { failed++; continue; }

      await db.ref('movies').push({
        title: data.Title, year: data.Year,
        poster: data.Poster !== 'N/A' ? data.Poster : '',
        imdbRating: data.imdbRating, imdbID: data.imdbID || '',
        genres: data.Genre ? data.Genre.split(', ') : [],
        plot: data.Plot, status: 'Watched',
        myRating: '', myNotes: '', createdAt: new Date().toISOString()
      });
      added++;
    } catch { failed++; }
  }

  batchBtn.disabled = false;
  batchInput.value = '';
  batchSection.style.display = 'none';
  batchProgress.textContent = '';
  toast(`Added ${added}, failed ${failed}`, failed ? 'error' : 'success');
});

// Dynamic Genre Dropdown & Sidebar
function updateGenreDropdown() {
  const genres = new Set();
  moviesData.forEach(m => m.genres && m.genres.forEach(g => genres.add(g)));
  const sorted = [...genres].sort();

  const currentSelection = filterGenre.value;
  filterGenre.innerHTML = '<option value="All">All Genres</option>';
  sorted.forEach(g => {
    filterGenre.innerHTML += `<option value="${g}">${g}</option>`;
  });
  filterGenre.value = currentSelection;
  const actualSelection = filterGenre.value;

  sidebarGenres.innerHTML = '<a href="#" class="nav-item all-genre" data-genre="All">All Genres</a>';
  sorted.forEach(g => {
    sidebarGenres.innerHTML += `<a href="#" class="nav-item" data-genre="${g}">${g}</a>`;
  });
  if (actualSelection === 'All') {
    sidebarGenres.querySelector('.all-genre').classList.add('active');
  } else {
    const active = sidebarGenres.querySelector(`[data-genre="${actualSelection}"]`);
    if (active) active.classList.add('active');
  }
}

// Event Listeners
filterSearch.addEventListener('input', renderMovies);
filterStatus.addEventListener('change', renderMovies);
filterGenre.addEventListener('change', () => {
  const active = sidebarGenres.querySelector(`[data-genre="${filterGenre.value}"]`);
  sidebarGenres.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (active) active.classList.add('active');
  else sidebarGenres.querySelector('.all-genre')?.classList.add('active');
  renderMovies();
});
filterSort.addEventListener('change', renderMovies);

sidebarGenres.addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  e.preventDefault();
  const genre = item.dataset.genre;
  filterGenre.value = genre;
  sidebarGenres.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  renderMovies();
});

// --- CONFIGURATION ---
const OMDB_API_KEY = "http://www.omdbapi.com/?i=tt3896198&apikey=82e034db"; 

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "movie1089",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let moviesData = [];

// DOM Elements
const movieInput = document.getElementById('movieInput');
const statusInput = document.getElementById('statusInput');
const addBtn = document.getElementById('addBtn');
const movieGrid = document.getElementById('movieGrid');
const filterSearch = document.getElementById('filterSearch');
const filterStatus = document.getElementById('filterStatus');
const filterGenre = document.getElementById('filterGenre');

// Create Modal Element
const modalHTML = `
  <div id="movieModal" class="modal-overlay">
    <div class="modal-content">
      <button class="close-btn" id="closeModal">&times;</button>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

const modal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('active'));

// Add Movie
addBtn.addEventListener('click', async () => {
  const query = movieInput.value.trim();
  if (!query) return alert('Enter a title');

  addBtn.disabled = true;
  addBtn.innerText = 'Searching...';

  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=${OMDB_API_KEY}`);
    const data = await res.json();

    if (data.Response === 'False') {
      alert('Movie not found!');
    } else {
      const newMovie = {
        title: data.Title,
        year: data.Year,
        poster: data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/300x450?text=No+Poster',
        imdbRating: data.imdbRating,
        genres: data.Genre.split(', '),
        plot: data.Plot,
        status: statusInput.value,
        createdAt: new Date()
      };

      await db.collection('movies').add(newMovie);
      movieInput.value = '';
    }
  } catch (err) {
    alert('Error adding movie');
  } finally {
    addBtn.disabled = false;
    addBtn.innerText = 'Add Movie';
  }
});

// Firestore Listener
db.collection('movies').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  moviesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  updateGenreDropdown();
  renderMovies();
});

// Render Movies Grid (Matching Image 1)
function renderMovies() {
  const search = filterSearch.value.toLowerCase();
  const status = filterStatus.value;
  const genre = filterGenre.value;

  const filtered = moviesData.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search);
    const matchesStatus = status === 'All' || m.status === status;
    const matchesGenre = genre === 'All' || (m.genres && m.genres.includes(genre));
    return matchesSearch && matchesStatus && matchesGenre;
  });

  movieGrid.innerHTML = filtered.map(m => `
    <div class="movie-card" onclick="openMovieModal('${m.id}')">
      <div class="poster-wrapper">
        <img src="${m.poster}" alt="${m.title}">
        <span class="badge-year">${m.year}</span>
        <span class="badge-rating"><span>★</span> ${m.imdbRating}</span>
      </div>
      <div class="card-title-box">
        <h4>${m.title}</h4>
      </div>
    </div>
  `).join('');
}

// Open Detail Modal (Matching Image 2)
function openMovieModal(id) {
  const movie = moviesData.find(m => m.id === id);
  if (!movie) return;

  modalBody.innerHTML = `
    <div style="border-radius:12px; overflow:hidden; margin-bottom:16px;">
      <img src="${movie.poster}" style="width:100%; max-height:300px; object-fit:cover;" />
    </div>
    <h2>${movie.title}</h2>
    <div class="modal-meta">
      <span class="rating">★ ${movie.imdbRating}</span>
      <span>${movie.year}</span>
      <span style="background:#21262d; padding:2px 8px; border-radius:4px; font-size:12px;">${movie.status}</span>
    </div>
    <p class="modal-plot">${movie.plot}</p>
    <button class="delete-action-btn" onclick="deleteMovie('${movie.id}')">Delete Movie</button>
  `;

  modal.classList.add('active');
}

// Delete Movie
async function deleteMovie(id) {
  if (confirm('Remove this movie from your vault?')) {
    await db.collection('movies').doc(id).delete();
    modal.classList.remove('active');
  }
}

// Dynamic Genre Dropdown
function updateGenreDropdown() {
  const genres = new Set();
  moviesData.forEach(m => m.genres && m.genres.forEach(g => genres.add(g)));
  
  const currentSelection = filterGenre.value;
  filterGenre.innerHTML = '<option value="All">All Genres</option>';
  genres.forEach(g => {
    filterGenre.innerHTML += `<option value="${g}">${g}</option>`;
  });
  filterGenre.value = currentSelection;
}

filterSearch.addEventListener('input', renderMovies);
filterStatus.addEventListener('change', renderMovies);
filterGenre.addEventListener('change', renderMovies);

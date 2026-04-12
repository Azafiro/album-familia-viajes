const allowedNames = {
  neizan: 'Neizan',
  laura: 'Laura',
  sheyla: 'Sheyla',
  victor: 'Víctor',
  'víctor': 'Víctor',
  'maria jose': 'María José',
  'maría josé': 'María José'
};
const storageKey = 'albumFamiliaData';
let currentUser = null;
let appData = loadData();

const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginNameInput = document.getElementById('login-name');
const loginError = document.getElementById('login-error');
const userNameDisplay = document.getElementById('user-name');
const albumsList = document.getElementById('albums-list');
const entriesList = document.getElementById('entries-list');
const newAlbumBtn = document.getElementById('new-album-btn');
const addAlbumTop = document.getElementById('add-album-top');
const logoutBtn = document.getElementById('logout-btn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = loginNameInput.value.trim();
  const normalized = normalize(name);
  if (!allowedNames[normalized]) {
    loginError.textContent = 'Nombre no válido. Usa Neizan, Laura, Sheyla, Víctor o María José.';
    return;
  }
  currentUser = allowedNames[normalized];
  sessionStorage.setItem('albumFamiliaUser', currentUser);
  loginError.textContent = '';
  loginNameInput.value = '';
  openApp();
});

newAlbumBtn.addEventListener('click', openNewAlbumModal);
addAlbumTop.addEventListener('click', openNewAlbumModal);
logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('albumFamiliaUser');
  currentUser = null;
  showScreen(loginScreen);
});
closeModal.addEventListener('click', hideModal);
modal.addEventListener('click', event => {
  if (event.target === modal) hideModal();
});

function normalize(text) {
  return text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { users: {} };
  } catch {
    return { users: {} };
  }
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(appData));
}

function ensureUserData() {
  if (!appData.users[currentUser]) {
    appData.users[currentUser] = { albums: [] };
  }
}

function openApp() {
  if (!currentUser) {
    currentUser = sessionStorage.getItem('albumFamiliaUser');
  }
  if (!currentUser) {
    showScreen(loginScreen);
    return;
  }
  ensureUserData();
  userNameDisplay.textContent = currentUser;
  showScreen(appScreen);
  renderAlbums();
  renderEntries();
}

function showScreen(screen) {
  [loginScreen, appScreen].forEach(item => item.classList.remove('active'));
  screen.classList.add('active');
}

function renderAlbums() {
  const albums = appData.users[currentUser]?.albums || [];
  albumsList.innerHTML = '';
  if (albums.length === 0) {
    albumsList.innerHTML = '<div class="album-card"><h3>Aún no tienes álbumes</h3><p>Crea un álbum de viaje con fotos y textos.</p></div>';
    return;
  }
  albums.forEach(album => {
    const card = document.createElement('article');
    card.className = 'album-card';
    card.innerHTML = `
      <h3>${album.emoji || '📘'} ${album.title}</h3>
      <p>${album.description || 'Álbum familiar creado por ' + currentUser}.</p>
      <div class="album-actions">
        <span>${album.entries.length} recuerdos</span>
        <button type="button" data-album-id="${album.id}">Agregar foto</button>
      </div>
    `;
    const button = card.querySelector('button');
    button.addEventListener('click', () => openAddEntryModal(album.id));
    albumsList.appendChild(card);
  });
}

function renderEntries() {
  const allEntries = [];
  Object.entries(appData.users).forEach(([user, userData]) => {
    userData.albums.forEach(album => {
      album.entries.forEach(entry => {
        allEntries.push({ ...entry, albumTitle: album.title, author: user });
      });
    });
  });
  allEntries.sort((a, b) => b.uploadedAt - a.uploadedAt);
  entriesList.innerHTML = '';
  if (allEntries.length === 0) {
    entriesList.innerHTML = '<div class="entry-card"><h3>El álbum está listo</h3><p>Sube tu primera foto y compártela con la familia.</p></div>';
    return;
  }
  allEntries.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'entry-card';
    card.innerHTML = `
      <h3>${entry.emoji || '📷'} ${entry.title}</h3>
      <p>${entry.text || 'Sin descripción extra.'}</p>
      <img src="${entry.imageData}" alt="${entry.title}">
      <div class="entry-footer">
        <span class="entry-avatar">${entry.author}</span>
        <span>${entry.date}</span>
      </div>
    `;
    entriesList.appendChild(card);
  });
}

function openNewAlbumModal() {
  showModal(`
    <h2>Crear nuevo álbum</h2>
    <form id="album-form">
      <div class="field">
        <label for="album-title">Título del álbum</label>
        <input id="album-title" required placeholder="Ej. Viaje a la playa">
      </div>
      <div class="field">
        <label for="album-emoji">Emoji del álbum</label>
        <input id="album-emoji" placeholder="Ej. 🏝️">
      </div>
      <div class="field">
        <label for="album-description">Descripción</label>
        <textarea id="album-description" placeholder="Escribe un texto breve sobre este álbum..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="ghost-btn" id="cancel-album">Cancelar</button>
        <button type="submit" class="primary-btn">Guardar álbum</button>
      </div>
    </form>
  `);
  document.getElementById('cancel-album').addEventListener('click', hideModal);
  document.getElementById('album-form').addEventListener('submit', event => {
    event.preventDefault();
    const title = document.getElementById('album-title').value.trim();
    const emoji = document.getElementById('album-emoji').value.trim();
    const description = document.getElementById('album-description').value.trim();
    if (!title) return;
    const album = {
      id: crypto.randomUUID(),
      title,
      emoji,
      description,
      entries: []
    };
    appData.users[currentUser].albums.push(album);
    saveData();
    renderAlbums();
    hideModal();
  });
}

function openAddEntryModal(albumId) {
  showModal(`
    <h2>Añadir foto al álbum</h2>
    <form id="entry-form">
      <div class="field">
        <label for="entry-image">Selecciona una imagen</label>
        <input id="entry-image" type="file" accept="image/*" required>
      </div>
      <div class="field">
        <label for="entry-title">Título</label>
        <input id="entry-title" required placeholder="Ej. Atardecer en la montaña">
      </div>
      <div class="field">
        <label for="entry-emoji">Emoji</label>
        <input id="entry-emoji" placeholder="Ej. 🌄">
      </div>
      <div class="field">
        <label for="entry-date">Fecha</label>
        <input id="entry-date" type="date" required>
      </div>
      <div class="field">
        <label for="entry-text">Texto o recuerdo</label>
        <textarea id="entry-text" placeholder="Describe el momento o pon emojis"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="ghost-btn" id="cancel-entry">Cancelar</button>
        <button type="submit" class="primary-btn">Guardar foto</button>
      </div>
    </form>
  `);
  document.getElementById('cancel-entry').addEventListener('click', hideModal);
  document.getElementById('entry-form').addEventListener('submit', event => {
    event.preventDefault();
    const fileInput = document.getElementById('entry-image');
    const title = document.getElementById('entry-title').value.trim();
    const emoji = document.getElementById('entry-emoji').value.trim();
    const date = document.getElementById('entry-date').value;
    const text = document.getElementById('entry-text').value.trim();
    if (!fileInput.files.length || !title || !date) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const entry = {
        id: crypto.randomUUID(),
        title,
        emoji,
        date,
        text,
        imageData: reader.result,
        uploadedAt: Date.now()
      };
      const album = appData.users[currentUser].albums.find(item => item.id === albumId);
      if (!album) return;
      album.entries.push(entry);
      saveData();
      renderAlbums();
      renderEntries();
      hideModal();
    };
    reader.readAsDataURL(file);
  });
}

function showModal(html) {
  modalBody.innerHTML = html;
  modal.classList.remove('hidden');
}

function hideModal() {
  modal.classList.add('hidden');
  modalBody.innerHTML = '';
}

openApp();

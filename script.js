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
const CLOUD_API_URL = 'https://album-familia-viajes.vercel.app/api/data';
let currentUser = null;
let appData = { users: {} };

const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginNameInput = document.getElementById('login-name');
const loginError = document.getElementById('login-error');
const albumsList = document.getElementById('albums-list');
const entriesList = document.getElementById('entries-list');
const addAlbumTop = document.getElementById('add-album-top');
const logoutBtn = document.getElementById('logout-btn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

loginForm.addEventListener('submit', async event => {
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
  await openApp();
});

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
  const normalized = text.trim().toLowerCase();
  return normalized
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ñ/g, 'n');
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

async function loadData() {
  try {
    const response = await fetch(CLOUD_API_URL);
    if (!response.ok) {
      throw new Error('Cloud sync failed');
    }
    const result = await response.json();
    const data = result.data || { users: {} };
    return data.users ? data : { users: {} };
  } catch (error) {
    console.warn('Cloud load failed, falling back to localStorage.', error);
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || { users: {} };
    } catch {
      return { users: {} };
    }
  }
}

async function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(appData));
  try {
    await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appData)
    });
  } catch (error) {
    console.warn('Cloud save failed, data kept locally.', error);
  }
}

function ensureUserData() {
  if (!appData.users[currentUser]) {
    appData.users[currentUser] = { albums: [] };
  }
  if (!appData.users[currentUser].albums.length) {
    appData.users[currentUser].albums.push({
      id: createId(),
      title: 'Recuerdos',
      emoji: '📸',
      description: 'Álbum familiar principal para tus fotos.',
      entries: []
    });
    saveData();
  }
}

async function openApp() {
  if (!currentUser) {
    currentUser = sessionStorage.getItem('albumFamiliaUser');
  }
  if (!currentUser) {
    showScreen(loginScreen);
    return;
  }
  appData = await loadData();
  ensureUserData();
  await saveData();
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
        <button type="button" class="add-photo" data-album-id="${album.id}">Agregar foto</button>
      </div>
    `;
    const button = card.querySelector('.add-photo');
    button.addEventListener('click', () => openAddEntryModal(album.id));

    if (album.entries.length) {
      const entryList = document.createElement('div');
      entryList.className = 'album-entry-list';
      album.entries.forEach(entry => {
        const entryItem = document.createElement('div');
        entryItem.className = 'album-entry-item';
        entryItem.innerHTML = `
          <span>${entry.emoji || '📷'} ${entry.title}</span>
          <button type="button" class="delete-entry small" data-album-id="${album.id}" data-entry-id="${entry.id}" aria-label="Borrar publicación">🗑️</button>
        `;
        entryList.appendChild(entryItem);
      });
      entryList.querySelectorAll('.delete-entry').forEach(deleteButton => {
        deleteButton.addEventListener('click', () => deleteEntry(deleteButton.dataset.albumId, deleteButton.dataset.entryId));
      });
      card.appendChild(entryList);
    }

    albumsList.appendChild(card);
  });
}

function renderEntries() {
  const allEntries = [];
  Object.entries(appData.users).forEach(([user, userData]) => {
    userData.albums.forEach(album => {
      album.entries.forEach(entry => {
        allEntries.push({ ...entry, albumTitle: album.title, author: user, albumId: album.id });
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
      <div class="entry-title-row">
        <h3>${entry.emoji || '📷'} ${entry.title}</h3>
        ${entry.author === currentUser ? `<button type="button" class="delete-entry" data-album-id="${entry.albumId}" data-entry-id="${entry.id}" aria-label="Borrar publicación">🗑️</button>` : ''}
      </div>
      <p>${entry.text || 'Sin descripción extra.'}</p>
      <img src="${entry.imageData}" alt="${entry.title}">
      <div class="entry-footer">
        <span class="entry-avatar">${entry.author}</span>
        <span>${entry.date}</span>
      </div>
    `;
    const deleteButton = card.querySelector('.delete-entry');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        deleteEntry(deleteButton.dataset.albumId, deleteButton.dataset.entryId);
      });
    }
    entriesList.appendChild(card);
  });
}

function deleteEntry(albumId, entryId) {
  if (!currentUser) return;
  const album = appData.users[currentUser]?.albums.find(item => item.id === albumId);
  if (!album) return;
  album.entries = album.entries.filter(item => item.id !== entryId);
  saveData();
  renderAlbums();
  renderEntries();
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
      id: createId(),
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
      <p class="modal-error" id="modal-error"></p>
      <div class="form-actions">
        <button type="button" class="ghost-btn" id="cancel-entry">Cancelar</button>
        <button type="submit" class="primary-btn">Guardar foto</button>
      </div>
    </form>
  `);
  const modalError = document.getElementById('modal-error');
  const fileInput = document.getElementById('entry-image');
  fileInput.addEventListener('change', () => {
    if (modalError) modalError.textContent = '';
  });
  document.getElementById('cancel-entry').addEventListener('click', hideModal);
  document.getElementById('entry-form').addEventListener('submit', event => {
    event.preventDefault();
    const fileInput = document.getElementById('entry-image');
    const title = document.getElementById('entry-title').value.trim();
    const emoji = document.getElementById('entry-emoji').value.trim();
    const date = document.getElementById('entry-date').value;
    const text = document.getElementById('entry-text').value.trim();
    if (!fileInput.files.length) {
      modalError.textContent = 'Selecciona una imagen para continuar.';
      return;
    }
    if (!title) {
      modalError.textContent = 'Escribe un título para la foto.';
      return;
    }
    if (!date) {
      modalError.textContent = 'Selecciona una fecha para la publicación.';
      return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const entry = {
        id: createId(),
        title,
        emoji,
        date,
        text,
        imageData: reader.result,
        uploadedAt: Date.now()
      };
      const album = appData.users[currentUser].albums.find(item => item.id === albumId);
      if (!album) {
        modalError.textContent = 'No se encontró el álbum. Intenta de nuevo.';
        return;
      }
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

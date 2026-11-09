const state = {
  token: localStorage.getItem('booknestToken') || '',
  user: JSON.parse(localStorage.getItem('booknestUser') || 'null'),
  editingId: null,
  authMode: 'login',
  searchTimeout: null
};

const elements = {
  bookList: document.querySelector('#bookList'),
  catalogueMessage: document.querySelector('#catalogueMessage'),
  searchInput: document.querySelector('#searchInput'),
  manageSection: document.querySelector('#manage'),
  manageLink: document.querySelector('#manageLink'),
  bookForm: document.querySelector('#bookForm'),
  formHeading: document.querySelector('#formHeading'),
  cancelEditButton: document.querySelector('#cancelEditButton'),
  openAuthButton: document.querySelector('#openAuthButton'),
  logoutButton: document.querySelector('#logoutButton'),
  userGreeting: document.querySelector('#userGreeting'),
  authDialog: document.querySelector('#authDialog'),
  closeAuthButton: document.querySelector('#closeAuthButton'),
  authForm: document.querySelector('#authForm'),
  authTitle: document.querySelector('#authTitle'),
  authEyebrow: document.querySelector('#authEyebrow'),
  authHelp: document.querySelector('#authHelp'),
  authMessage: document.querySelector('#authMessage'),
  nameField: document.querySelector('#nameField'),
  switchAuthMode: document.querySelector('#switchAuthMode'),
  switchPrompt: document.querySelector('#switchPrompt')
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[character]));
}

async function request(url, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function updateAccountView() {
  const signedIn = Boolean(state.token && state.user);
  elements.openAuthButton.hidden = signedIn;
  elements.logoutButton.hidden = !signedIn;
  elements.userGreeting.hidden = !signedIn;
  elements.manageSection.hidden = !signedIn;
  elements.userGreeting.textContent = signedIn ? `Hi, ${state.user.name.split(' ')[0]}` : '';
}

function renderBooks(books) {
  if (!books.length) {
    elements.bookList.innerHTML = '';
    elements.catalogueMessage.textContent = 'No books match that search.';
    return;
  }

  elements.catalogueMessage.textContent = `${books.length} book${books.length === 1 ? '' : 's'} shown`;
  elements.bookList.innerHTML = books.map((book) => {
    const canManage = state.user && (state.user.role === 'admin' || state.user.id === book.createdBy);
    return `
      <article class="book-card">
        <div class="book-meta"><span>${escapeHtml(book.category || 'Uncategorised')}</span><span class="status status-${escapeHtml(book.status)}">${escapeHtml(book.status)}</span></div>
        <h3>${escapeHtml(book.title)}</h3>
        <p class="author">${escapeHtml(book.author)}${book.publishedYear ? `, ${escapeHtml(book.publishedYear)}` : ''}</p>
        <p class="description">${escapeHtml(book.description || 'No description has been added for this book.')}</p>
        <div class="card-footer">
          <span>ISBN ${escapeHtml(book.isbn)}</span>
          ${canManage ? `<span class="card-actions"><button data-action="edit" data-id="${book.id}" type="button">Edit</button><button class="danger" data-action="delete" data-id="${book.id}" type="button">Delete</button></span>` : ''}
        </div>
      </article>`;
  }).join('');
}

async function loadBooks() {
  elements.catalogueMessage.textContent = 'Loading books...';
  try {
    const term = elements.searchInput.value.trim();
    const data = await request(`/api/books?limit=30${term ? `&q=${encodeURIComponent(term)}` : ''}`);
    renderBooks(data.books);
  } catch (error) {
    elements.bookList.innerHTML = '';
    elements.catalogueMessage.textContent = error.message;
  }
}

function resetBookForm() {
  state.editingId = null;
  elements.bookForm.reset();
  elements.formHeading.textContent = 'Add a book';
  elements.cancelEditButton.hidden = true;
}

async function startEdit(id) {
  try {
    const { book } = await request(`/api/books/${id}`);
    state.editingId = book.id;
    for (const [key, value] of Object.entries(book)) {
      const input = elements.bookForm.elements[key];
      if (input && value !== null) input.value = value;
    }
    elements.formHeading.textContent = 'Edit book';
    elements.cancelEditButton.hidden = false;
    elements.manageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteBook(id) {
  if (!window.confirm('Delete this book from the collection?')) return;
  try {
    await request(`/api/books/${id}`, { method: 'DELETE' });
    await loadBooks();
  } catch (error) {
    window.alert(error.message);
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  const registering = mode === 'register';
  elements.authEyebrow.textContent = registering ? 'Create an account' : 'Welcome back';
  elements.authTitle.textContent = registering ? 'Start managing your books' : 'Sign in to manage books';
  elements.authHelp.textContent = registering ? 'Create a staff account to add books to the collection.' : 'Use your staff account to add or edit the collection.';
  elements.nameField.hidden = !registering;
  elements.nameField.querySelector('input').required = registering;
  elements.authForm.querySelector('button[type="submit"]').textContent = registering ? 'Create account' : 'Sign in';
  elements.switchPrompt.textContent = registering ? 'Already have an account?' : 'New here?';
  elements.switchAuthMode.textContent = registering ? 'Sign in instead' : 'Create an account';
  elements.authMessage.textContent = '';
}

function signOut(message = '') {
  state.token = '';
  state.user = null;
  localStorage.removeItem('booknestToken');
  localStorage.removeItem('booknestUser');
  updateAccountView();
  resetBookForm();
  loadBooks();
  if (message) window.alert(message);
}

elements.searchInput.addEventListener('input', () => {
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(loadBooks, 250);
});

elements.bookList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit') startEdit(button.dataset.id);
  if (button.dataset.action === 'delete') deleteBook(button.dataset.id);
});

elements.bookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(elements.bookForm));
  if (!formData.publishedYear) delete formData.publishedYear;
  try {
    await request(state.editingId ? `/api/books/${state.editingId}` : '/api/books', {
      method: state.editingId ? 'PUT' : 'POST',
      body: JSON.stringify(formData)
    });
    resetBookForm();
    await loadBooks();
  } catch (error) {
    window.alert(error.message);
  }
});

elements.cancelEditButton.addEventListener('click', resetBookForm);
elements.openAuthButton.addEventListener('click', () => elements.authDialog.showModal());
elements.closeAuthButton.addEventListener('click', () => elements.authDialog.close());
elements.logoutButton.addEventListener('click', () => signOut());
elements.switchAuthMode.addEventListener('click', () => setAuthMode(state.authMode === 'login' ? 'register' : 'login'));
elements.manageLink.addEventListener('click', (event) => {
  if (!state.user) {
    event.preventDefault();
    elements.authDialog.showModal();
  }
});

elements.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  elements.authMessage.textContent = '';
  const formData = Object.fromEntries(new FormData(elements.authForm));
  try {
    const data = await request(`/api/auth/${state.authMode}`, { method: 'POST', body: JSON.stringify(formData) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('booknestToken', state.token);
    localStorage.setItem('booknestUser', JSON.stringify(state.user));
    updateAccountView();
    elements.authForm.reset();
    elements.authDialog.close();
    loadBooks();
    document.querySelector('#manage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    elements.authMessage.textContent = error.message;
  }
});

updateAccountView();
setAuthMode('login');
loadBooks();


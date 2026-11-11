/**
 * Frontend Application Controller for Secure Note-Taking System
 * Handles authentication, RBAC views, notes CRUD, admin operations,
 * and calls to the MongoDB Aggregation endpoints.
 */

const API_BASE = 'http://localhost:5000/api';

// Application State
const state = {
  token: localStorage.getItem('notes_jwt_token') || null,
  user: null,
  notesPage: 1,
  notesLimit: 6,
  notesTotalPages: 1,
  adminViewAllNotes: false,
  usersPage: 1,
  usersLimit: 5,
  usersTotalPages: 1,
  postsPage: 1,
  postsLimit: 6,
  postsTotalPages: 1
};

// ============================================================================
// HELPER FUNCTIONS & API CLIENT
// ============================================================================

const showAlert = (message, type = 'info') => {
  const banner = document.getElementById('alert-banner');
  banner.textContent = message;
  banner.className = `alert-banner ${type}`;
  banner.classList.remove('hidden');

  setTimeout(() => {
    banner.classList.add('hidden');
  }, 5000);
};

const apiFetch = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401 && state.token) {
        logout();
        showAlert('Session expired. Please log in again.', 'error');
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    showAlert(err.message, 'error');
    throw err;
  }
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

const checkAuth = async () => {
  if (!state.token) {
    showAuthView();
    return;
  }

  try {
    const response = await apiFetch('/auth/me');
    state.user = response.data;
    showDashboardView();
  } catch (err) {
    logout();
  }
};

const login = async (email, password) => {
  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('notes_jwt_token', state.token);

    showAlert('Welcome back, ' + state.user.username + '!', 'success');
    showDashboardView();
  } catch (err) {
    // Error handled in apiFetch
  }
};

const register = async (username, email, password, role, interests) => {
  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role, interests })
    });

    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('notes_jwt_token', state.token);

    showAlert('Account created successfully! Logged in as ' + state.user.username, 'success');
    showDashboardView();
  } catch (err) {
    // Error handled in apiFetch
  }
};

const logout = () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('notes_jwt_token');
  showAuthView();
  showAlert('You have been logged out.', 'info');
};

// ============================================================================
// VIEW SWITCHING
// ============================================================================

const showAuthView = () => {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
  document.getElementById('user-header-info').classList.add('hidden');
};

const showDashboardView = () => {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('user-header-info').classList.remove('hidden');

  // Update header info
  document.getElementById('header-username').textContent = state.user.username;
  const roleBadge = document.getElementById('header-role-badge');
  roleBadge.textContent = state.user.role.toUpperCase();
  roleBadge.className = `badge ${state.user.role}`;

  // Render interests chips
  const interestsBox = document.getElementById('header-interests');
  interestsBox.innerHTML = '';
  if (state.user.interests && state.user.interests.length > 0) {
    state.user.interests.forEach(interest => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `#${interest}`;
      interestsBox.appendChild(chip);
    });
  }

  // Handle Admin privileges
  const adminTabBtn = document.getElementById('tab-btn-admin');
  const adminNotesToggle = document.getElementById('admin-notes-toggle');

  if (state.user.role === 'admin') {
    adminTabBtn.classList.remove('hidden');
    adminNotesToggle.classList.remove('hidden');
  } else {
    adminTabBtn.classList.add('hidden');
    adminNotesToggle.classList.add('hidden');
    state.adminViewAllNotes = false;
  }

  // Switch to default Notes tab
  switchTab('tab-notes');
  loadNotes(1);
  loadUsersForAggDropdown();
};

const switchTab = (tabId) => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });

  if (tabId === 'tab-notes') {
    loadNotes(state.notesPage);
  } else if (tabId === 'tab-admin') {
    loadUsers(state.usersPage);
  } else if (tabId === 'tab-aggregations') {
    loadUsersForAggDropdown();
  } else if (tabId === 'tab-posts') {
    loadPosts(state.postsPage);
  }
};

// ============================================================================
// NOTES MANAGEMENT
// ============================================================================

const loadNotes = async (page = 1) => {
  state.notesPage = page;
  let url = `/notes?page=${page}&limit=${state.notesLimit}`;

  if (state.user.role === 'admin' && !state.adminViewAllNotes) {
    url += '&scope=mine';
  }

  try {
    const res = await apiFetch(url);
    const notes = res.data;
    state.notesTotalPages = res.pagination.totalPages;

    document.getElementById('notes-count-info').textContent =
      `Total: ${res.pagination.total} note${res.pagination.total === 1 ? '' : 's'}`;
    document.getElementById('notes-page-info').textContent =
      `Page ${res.pagination.page} of ${res.pagination.totalPages || 1}`;

    document.getElementById('notes-prev-btn').disabled = state.notesPage <= 1;
    document.getElementById('notes-next-btn').disabled = state.notesPage >= state.notesTotalPages;

    const container = document.getElementById('notes-container');
    container.innerHTML = '';

    if (notes.length === 0) {
      container.innerHTML = '<p class="subtitle">No notes found. Create your first note above!</p>';
      return;
    }

    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const isOwner = note.owner && (note.owner._id === state.user._id || note.owner === state.user._id);
      const canManage = isOwner || state.user.role === 'admin';

      card.innerHTML = `
        <div class="item-card-header">
          <h4 class="item-title">${escapeHtml(note.title)}</h4>
          ${note.owner ? `<span class="badge ${note.owner.role || 'user'}">${escapeHtml(note.owner.username || 'user')}</span>` : ''}
        </div>
        <p class="item-content">${escapeHtml(note.content)}</p>
        <div class="item-meta">
          <span>${new Date(note.createdAt).toLocaleString()}</span>
          ${canManage ? `
            <div class="item-actions">
              <button class="btn btn-xs btn-outline edit-note-btn" data-id="${note._id}" data-title="${escapeHtml(note.title)}" data-content="${escapeHtml(note.content)}">Edit</button>
              <button class="btn btn-xs btn-danger delete-note-btn" data-id="${note._id}">Delete</button>
            </div>
          ` : ''}
        </div>
      `;

      container.appendChild(card);
    });

    // Attach actions
    container.querySelectorAll('.edit-note-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('note-edit-id').value = btn.dataset.id;
        document.getElementById('note-title').value = btn.dataset.title;
        document.getElementById('note-content').value = btn.dataset.content;
        document.getElementById('note-form-heading').textContent = 'Edit Note';
        document.getElementById('note-submit-btn').textContent = 'Update Note';
        document.getElementById('note-cancel-edit-btn').classList.remove('hidden');
        window.scrollTo({ top: document.getElementById('note-form').offsetTop - 50, behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.delete-note-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this note?')) {
          await deleteNote(btn.dataset.id);
        }
      });
    });
  } catch (err) {
    // Handled in apiFetch
  }
};

const saveNote = async (id, title, content) => {
  try {
    if (id) {
      await apiFetch(`/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content })
      });
      showAlert('Note updated successfully!', 'success');
    } else {
      await apiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content })
      });
      showAlert('Note created successfully!', 'success');
    }
    resetNoteForm();
    loadNotes(state.notesPage);
  } catch (err) {
    // Handled in apiFetch
  }
};

const deleteNote = async (id) => {
  try {
    await apiFetch(`/notes/${id}`, { method: 'DELETE' });
    showAlert('Note deleted successfully.', 'success');
    loadNotes(state.notesPage);
  } catch (err) {
    // Handled in apiFetch
  }
};

const resetNoteForm = () => {
  document.getElementById('note-edit-id').value = '';
  document.getElementById('note-form').reset();
  document.getElementById('note-form-heading').textContent = 'Create New Note';
  document.getElementById('note-submit-btn').textContent = 'Save Note';
  document.getElementById('note-cancel-edit-btn').classList.add('hidden');
};

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

const loadUsers = async (page = 1) => {
  if (state.user.role !== 'admin') return;
  state.usersPage = page;

  try {
    const res = await apiFetch(`/users?page=${page}&limit=${state.usersLimit}`);
    const users = res.data;
    state.usersTotalPages = res.pagination.totalPages;

    document.getElementById('users-count-info').textContent =
      `Total: ${res.pagination.total} user${res.pagination.total === 1 ? '' : 's'}`;
    document.getElementById('users-page-info').textContent =
      `Page ${res.pagination.page} of ${res.pagination.totalPages || 1}`;

    document.getElementById('users-prev-btn').disabled = state.usersPage <= 1;
    document.getElementById('users-next-btn').disabled = state.usersPage >= state.usersTotalPages;

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    users.forEach(u => {
      const tr = document.createElement('tr');
      const isSelf = u._id === state.user._id;

      tr.innerHTML = `
        <td><strong>${escapeHtml(u.username)}</strong> ${isSelf ? '(You)' : ''}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge ${u.role}">${u.role.toUpperCase()}</span></td>
        <td>${u.interests && u.interests.length > 0 ? u.interests.map(i => `<span class="chip">#${escapeHtml(i)}</span>`).join(' ') : '<em>None</em>'}</td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          ${!isSelf ? `
            <button class="btn btn-xs btn-outline toggle-role-btn" data-id="${u._id}" data-role="${u.role}">
              Make ${u.role === 'admin' ? 'User' : 'Admin'}
            </button>
            <button class="btn btn-xs btn-danger delete-user-btn" data-id="${u._id}">
              Delete
            </button>
          ` : '<span class="subtitle">Active Session</span>'}
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.toggle-role-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newRole = btn.dataset.role === 'admin' ? 'user' : 'admin';
        await updateUserRole(btn.dataset.id, newRole);
      });
    });

    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete user and all their associated notes/posts?')) {
          await deleteUser(btn.dataset.id);
        }
      });
    });
  } catch (err) {
    // Handled in apiFetch
  }
};

const createAdminUser = async (username, email, password, role, interests) => {
  try {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role, interests })
    });
    showAlert('User added successfully.', 'success');
    document.getElementById('admin-add-user-form').reset();
    loadUsers(1);
    loadUsersForAggDropdown();
  } catch (err) {
    // Handled in apiFetch
  }
};

const updateUserRole = async (userId, newRole) => {
  try {
    await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    showAlert(`User role updated to ${newRole}.`, 'success');
    loadUsers(state.usersPage);
  } catch (err) {
    // Handled in apiFetch
  }
};

const deleteUser = async (userId) => {
  try {
    await apiFetch(`/users/${userId}`, { method: 'DELETE' });
    showAlert('User removed successfully.', 'success');
    loadUsers(state.usersPage);
    loadUsersForAggDropdown();
  } catch (err) {
    // Handled in apiFetch
  }
};

// ============================================================================
// AGGREGATION SCENARIOS
// ============================================================================

/**
 * Scenario 1: Group by Interests
 * Constraint: Exactly one collection.aggregate() call.
 */
const runAggregation1 = async () => {
  const container = document.getElementById('agg-1-results');
  container.innerHTML = '<p class="subtitle">Executing aggregation pipeline on User collection...</p>';

  try {
    const res = await apiFetch('/aggregations/group-by-interests');
    const groups = res.data;

    if (groups.length === 0) {
      container.innerHTML = '<p class="subtitle">No interest groups found.</p>';
      return;
    }

    let html = `<p class="subtitle">Found <strong>${groups.length}</strong> distinct interest groups across users:</p>`;

    groups.forEach(g => {
      const userList = g.users.map(u => `<strong>${escapeHtml(u.username)}</strong> (${u.email})`).join(', ');
      html += `
        <div class="interest-group-card">
          <div class="interest-title"># ${escapeHtml(g.interest)} <span class="badge user">${g.userCount} user${g.userCount === 1 ? '' : 's'}</span></div>
          <div style="font-size: 0.85rem; color: #334155;">
            Members: ${userList}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color: var(--danger)">Error: ${err.message}</p>`;
  }
};

/**
 * Populate users select for Scenario 2
 */
const loadUsersForAggDropdown = async () => {
  const select = document.getElementById('agg-user-select');
  if (!select) return;

  try {
    // We can fetch users or public posts authors
    const res = await apiFetch('/aggregations/group-by-interests');
    const allUsersMap = new Map();

    res.data.forEach(g => {
      g.users.forEach(u => allUsersMap.set(u._id, u));
    });

    select.innerHTML = '';
    allUsersMap.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u._id;
      opt.textContent = `${u.username} (${u.email})`;
      select.appendChild(opt);
    });

    if (allUsersMap.size === 0) {
      const opt = document.createElement('option');
      opt.value = state.user ? state.user._id : '';
      opt.textContent = state.user ? `${state.user.username} (Current User)` : 'No users';
      select.appendChild(opt);
    }
  } catch (err) {
    // Dropdown fallback to current user
    if (state.user) {
      select.innerHTML = `<option value="${state.user._id}">${state.user.username} (Current User)</option>`;
    }
  }
};

/**
 * Scenario 2: User Posts ($lookup)
 * Constraint: Single aggregation pipeline with a $lookup stage.
 */
const runAggregation2 = async () => {
  const select = document.getElementById('agg-user-select');
  const userId = select.value;
  if (!userId) {
    showAlert('Please select a user first.', 'error');
    return;
  }

  const container = document.getElementById('agg-2-results');
  container.innerHTML = '<p class="subtitle">Executing $lookup aggregation pipeline on MongoDB...</p>';

  try {
    const res = await apiFetch(`/aggregations/user-posts/${userId}`);
    const userData = res.data;
    const posts = userData.posts || [];

    let html = `
      <div class="card" style="background:#f8fafc; border-color:#cbd5e1; margin-top:10px;">
        <h4>User Profile Joined with Posts:</h4>
        <p><strong>Username:</strong> ${escapeHtml(userData.username)} | <strong>Email:</strong> ${escapeHtml(userData.email)} | <strong>Role:</strong> ${escapeHtml(userData.role)}</p>
        <p><strong>Total Posts Found via $lookup:</strong> ${posts.length}</p>
      </div>
    `;

    if (posts.length === 0) {
      html += '<p class="subtitle">This user has not written any posts yet. You can create one in the "Public Posts" tab!</p>';
    } else {
      posts.forEach(p => {
        html += `
          <div class="item-card" style="margin-bottom: 10px;">
            <div class="item-card-header">
              <h4 class="item-title">${escapeHtml(p.title)}</h4>
              <span class="count-badge">${new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="item-content">${escapeHtml(p.content)}</p>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color: var(--danger)">Error: ${err.message}</p>`;
  }
};

// ============================================================================
// PUBLIC POSTS
// ============================================================================

const loadPosts = async (page = 1) => {
  state.postsPage = page;
  try {
    const res = await apiFetch(`/posts?page=${page}&limit=${state.postsLimit}`);
    const posts = res.data;
    state.postsTotalPages = res.pagination.totalPages;

    document.getElementById('posts-count-info').textContent =
      `Total: ${res.pagination.total} post${res.pagination.total === 1 ? '' : 's'}`;
    document.getElementById('posts-page-info').textContent =
      `Page ${res.pagination.page} of ${res.pagination.totalPages || 1}`;

    document.getElementById('posts-prev-btn').disabled = state.postsPage <= 1;
    document.getElementById('posts-next-btn').disabled = state.postsPage >= state.postsTotalPages;

    const container = document.getElementById('posts-container');
    container.innerHTML = '';

    if (posts.length === 0) {
      container.innerHTML = '<p class="subtitle">No posts published yet. Share a post above!</p>';
      return;
    }

    posts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'item-card';

      card.innerHTML = `
        <div class="item-card-header">
          <h4 class="item-title">${escapeHtml(p.title)}</h4>
          ${p.author ? `<span class="badge ${p.author.role || 'user'}">${escapeHtml(p.author.username || 'author')}</span>` : ''}
        </div>
        <p class="item-content">${escapeHtml(p.content)}</p>
        <div class="item-meta">
          <span>Author: ${p.author ? escapeHtml(p.author.email) : 'Unknown'}</span>
          <span>${new Date(p.createdAt).toLocaleString()}</span>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    // Handled in apiFetch
  }
};

const createPost = async (title, content) => {
  try {
    await apiFetch('/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    showAlert('Post published successfully!', 'success');
    document.getElementById('post-form').reset();
    loadPosts(1);
    loadUsersForAggDropdown();
  } catch (err) {
    // Handled in apiFetch
  }
};

// ============================================================================
// UTILITIES & EVENT LISTENERS
// ============================================================================

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Setup DOM Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Auth Forms
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    login(
      document.getElementById('login-email').value.trim(),
      document.getElementById('login-password').value
    );
  });

  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    register(
      document.getElementById('reg-username').value.trim(),
      document.getElementById('reg-email').value.trim(),
      document.getElementById('reg-password').value,
      document.getElementById('reg-role').value,
      document.getElementById('reg-interests').value.trim()
    );
  });

  // Quick Demo Buttons
  document.getElementById('fill-admin-btn').addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@example.com';
    document.getElementById('login-password').value = 'Password123!';
  });

  document.getElementById('fill-user-btn').addEventListener('click', () => {
    document.getElementById('login-email').value = 'alice@example.com';
    document.getElementById('login-password').value = 'Password123!';
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  // Admin View All Notes toggle
  document.getElementById('toggle-all-notes').addEventListener('change', (e) => {
    state.adminViewAllNotes = e.target.checked;
    document.getElementById('notes-view-desc').textContent = state.adminViewAllNotes
      ? 'Viewing all notes across all registered users (Admin Mode).'
      : 'Viewing only your personal notes.';
    loadNotes(1);
  });

  // Note form submit
  document.getElementById('note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveNote(
      document.getElementById('note-edit-id').value,
      document.getElementById('note-title').value.trim(),
      document.getElementById('note-content').value.trim()
    );
  });

  document.getElementById('note-cancel-edit-btn').addEventListener('click', resetNoteForm);

  // Notes pagination buttons
  document.getElementById('notes-prev-btn').addEventListener('click', () => {
    if (state.notesPage > 1) loadNotes(state.notesPage - 1);
  });
  document.getElementById('notes-next-btn').addEventListener('click', () => {
    if (state.notesPage < state.notesTotalPages) loadNotes(state.notesPage + 1);
  });

  // Admin add user form
  document.getElementById('admin-add-user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    createAdminUser(
      document.getElementById('admin-user-name').value.trim(),
      document.getElementById('admin-user-email').value.trim(),
      document.getElementById('admin-user-password').value,
      document.getElementById('admin-user-role').value,
      document.getElementById('admin-user-interests').value.trim()
    );
  });

  // Admin users pagination buttons
  document.getElementById('users-prev-btn').addEventListener('click', () => {
    if (state.usersPage > 1) loadUsers(state.usersPage - 1);
  });
  document.getElementById('users-next-btn').addEventListener('click', () => {
    if (state.usersPage < state.usersTotalPages) loadUsers(state.usersPage + 1);
  });

  // Aggregation triggers
  document.getElementById('run-agg-1-btn').addEventListener('click', runAggregation1);
  document.getElementById('run-agg-2-btn').addEventListener('click', runAggregation2);

  // Post form
  document.getElementById('post-form').addEventListener('submit', (e) => {
    e.preventDefault();
    createPost(
      document.getElementById('post-title').value.trim(),
      document.getElementById('post-content').value.trim()
    );
  });

  // Posts pagination buttons
  document.getElementById('posts-prev-btn').addEventListener('click', () => {
    if (state.postsPage > 1) loadPosts(state.postsPage - 1);
  });
  document.getElementById('posts-next-btn').addEventListener('click', () => {
    if (state.postsPage < state.postsTotalPages) loadPosts(state.postsPage + 1);
  });

  // Check initial session
  checkAuth();
});

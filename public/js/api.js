// API helper functies
export async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    //console.log(token);
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    return fetch(url, { ...defaultOptions, ...options });
}

// API endpoints voor pagina's
export async function loadPages() {
    const response = await fetchWithAuth('/api/pages');
    if (!response.ok) throw new Error('Fout bij ophalen pagina\'s');
    return response.json();
}

export async function deletePage(pageId) {
    const response = await fetchWithAuth(`/api/pages/${pageId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fout bij verwijderen van pagina');
    return response.json();
}

export async function editPage(pageId, title) {
    const response = await fetchWithAuth(`/api/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify({ title })
    });
    if (!response.ok) throw new Error('Fout bij bewerken van pagina');
    return response.json();
}

export async function updatePageTheme(pageId, themeId) {
    const response = await fetchWithAuth(`/api/pages/${pageId}/theme`, {
        method: 'PUT',
        body: JSON.stringify({ themeId })
    });
    if (!response.ok) throw new Error('Fout bij bijwerken pagina thema');
    return response.json();
}

// API endpoints voor albums
export async function loadAlbums() {
    const response = await fetchWithAuth('/api/albums');
    if (!response.ok) throw new Error('Fout bij ophalen albums');
    return response.json();
}

export async function deleteAlbum(albumId) {
    const response = await fetchWithAuth(`/api/albums/${albumId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fout bij verwijderen van album');
    return response.json();
}

export async function editAlbum(albumId, updates) {
    const response = await fetchWithAuth(`/api/albums/${albumId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Fout bij bewerken van album');
    return response.json();
}

// API endpoints voor foto's
export async function loadPhotos() {
    const response = await fetchWithAuth('/api/photos');
    if (!response.ok) throw new Error('Fout bij ophalen foto\'s');
    return response.json();
}

export async function deletePhoto(photoId) {
    const response = await fetchWithAuth(`/api/photos/${photoId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fout bij verwijderen van foto');
    return response.json();
}

export async function editPhoto(photoId, title) {
    const response = await fetchWithAuth(`/api/photos/${photoId}`, {
        method: 'PUT',
        body: JSON.stringify({ title })
    });
    if (!response.ok) throw new Error('Fout bij bewerken van foto');
    return response.json();
}

// User management functies
export async function getUsers() {
    const response = await fetchWithAuth('/api/users');
    if (!response.ok) throw new Error('Fout bij ophalen gebruikers');
    return response.json();
}

export async function createUser(userData) {
    const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error('Fout bij aanmaken gebruiker');
    return response.json();
}

export async function updateUser(userId, updates) {
    const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Fout bij bijwerken gebruiker');
    return response.json();
}

export async function updateUserRole(userId, role) {
    const response = await fetchWithAuth(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Fout bij wijzigen rol');
    return response.json();
}

export async function toggleUserActive(userId) {
    const response = await fetchWithAuth(`/api/users/${userId}/toggle-active`, {
        method: 'PUT'
    });
    if (!response.ok) throw new Error('Fout bij activeren/deactiveren gebruiker');
    return response.json();
}

export async function changePassword(userId, currentPassword, newPassword) {
    const response = await fetchWithAuth(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!response.ok) throw new Error('Fout bij wijzigen wachtwoord');
    return response.json();
}

export async function deleteUser(userId) {
    const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fout bij verwijderen gebruiker');
    return response.json();
}

// Theme management functies
export async function getThemes() {
    const response = await fetchWithAuth('/api/themes');
    if (!response.ok) throw new Error('Fout bij ophalen thema\'s');
    return response.json();
}

export async function getActiveTheme() {
    const response = await fetchWithAuth('/api/themes/active');
    if (!response.ok) throw new Error('Fout bij ophalen actief thema');
    return response.json();
}

export async function createTheme(themeData) {
    const response = await fetchWithAuth('/api/themes', {
        method: 'POST',
        body: JSON.stringify(themeData)
    });
    if (!response.ok) throw new Error('Fout bij aanmaken thema');
    return response.json();
}

export async function updateTheme(themeId, updates) {
    const response = await fetchWithAuth(`/api/themes/${themeId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Fout bij bijwerken thema');
    return response.json();
}

export async function activateTheme(themeId) {
    const response = await fetchWithAuth(`/api/themes/${themeId}/activate`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Fout bij activeren thema');
    return response.json();
}

export async function deleteTheme(themeId) {
    const response = await fetchWithAuth(`/api/themes/${themeId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fout bij verwijderen thema');
    return response.json();
} 
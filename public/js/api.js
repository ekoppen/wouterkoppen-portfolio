// API helper functies
export async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
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

export async function editAlbum(albumId, title) {
    const response = await fetchWithAuth(`/api/albums/${albumId}`, {
        method: 'PUT',
        body: JSON.stringify({ title })
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
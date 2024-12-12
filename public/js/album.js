// UI helper functies
function showMessage(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

function showConfirmDialog(callback, options = {}) {
    const {
        message = 'Weet je het zeker?',
        confirmText = 'Bevestigen',
        cancelText = 'Annuleren',
        inputField = false,
        inputValue = '',
        isDangerous = false
    } = options;

    const overlay = document.getElementById('overlay');
    const dialog = document.getElementById('confirmDialog');
    const messageElement = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmDelete');
    const cancelButton = document.getElementById('cancelDelete');
    
    messageElement.textContent = message;
    confirmButton.textContent = confirmText;
    cancelButton.textContent = cancelText;
    
    if (isDangerous) {
        confirmButton.classList.add('btn-danger');
    } else {
        confirmButton.classList.remove('btn-danger');
    }

    let input = null;
    if (inputField) {
        input = document.createElement('input');
        input.type = 'text';
        input.value = inputValue;
        input.className = 'confirm-dialog-input';
        messageElement.appendChild(input);
    }

    overlay.classList.add('show');
    dialog.classList.add('show');

    const handleConfirm = () => {
        const value = input ? input.value.trim() : null;
        cleanup();
        callback(true, value);
    };

    const handleCancel = () => {
        cleanup();
        callback(false);
    };

    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);

    const handleKeydown = (e) => {
        if (e.key === 'Enter' && (!input || input.value.trim())) {
            handleConfirm();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };
    document.addEventListener('keydown', handleKeydown);

    const cleanup = () => {
        overlay.classList.remove('show');
        dialog.classList.remove('show');
        if (input) {
            input.remove();
        }
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleKeydown);
    };
}

// Drag and drop helpers
function handleDragStart(e) {
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggedCard = document.querySelector('.dragging');
    const card = e.target.closest('.photo-card');
    
    if (draggedCard && card && draggedCard !== card) {
        const container = card.parentElement;
        const draggedIndex = Array.from(container.children).indexOf(draggedCard);
        const cardIndex = Array.from(container.children).indexOf(card);
        
        // Voeg een visuele indicator toe voor de drop positie
        card.classList.add('drag-over');
        
        if (draggedIndex < cardIndex) {
            card.parentNode.insertBefore(draggedCard, card.nextSibling);
        } else {
            card.parentNode.insertBefore(draggedCard, card);
        }
    }
}

// Helper functie voor authenticated requests
async function fetchWithAuth(url, options = {}) {
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

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        return;
    }

    return response;
}

// Album beheer functionaliteit
let album = null;
let photos = [];
const albumId = new URLSearchParams(window.location.search).get('id');

// Album laden
async function loadAlbum() {
    try {
        const response = await fetchWithAuth(`/api/albums/${albumId}`);
        if (!response.ok) throw new Error('Fout bij ophalen album');
        
        album = await response.json();
        document.getElementById('albumTitle').textContent = album.title;
        document.title = `${album.title} - Album Beheer`;
        await loadPhotos();
    } catch (error) {
        console.error('Error loading album:', error);
        showMessage('Fout bij het laden van het album', 'error');
    }
}

// Foto's laden
async function loadPhotos() {
    try {
        const response = await fetchWithAuth(`/api/albums/${albumId}/photos`);
        if (!response.ok) throw new Error('Fout bij ophalen foto\'s');
        
        photos = await response.json();
        renderPhotos();
        initializeDragAndDrop();
    } catch (error) {
        console.error('Error loading photos:', error);
        showMessage('Fout bij het laden van foto\'s', 'error');
    }
}

// Foto's renderen
function renderPhotos() {
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';
    
    photos.forEach(photo => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.draggable = true;
        photoCard.dataset.id = photo._id;
        
        photoCard.innerHTML = `
            <div class="photo-container">
                <img src="${photo.thumbPath || photo.path}" alt="${photo.title || 'Geen titel'}" draggable="false">
                <div class="photo-overlay">
                    <div class="photo-actions">
                        <button class="btn-icon" onclick="window.handleEditPhoto('${photo._id}')" title="Bewerk foto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="window.handleRemovePhoto('${photo._id}')" title="Verwijder uit album">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(photoCard);
    });
}

// Drag & Drop initialisatie
function initializeDragAndDrop() {
    const grid = document.getElementById('photoGrid');
    const items = grid.getElementsByClassName('photo-card');

    Array.from(items).forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });

    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);
}

// Drop handler
async function handleDrop(e) {
    e.preventDefault();
    const grid = document.getElementById('photoGrid');
    const newOrder = Array.from(grid.children).map(card => card.dataset.id);

    try {
        const response = await fetchWithAuth(`/api/albums/${albumId}/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ photoIds: newOrder })
        });

        if (!response.ok) {
            throw new Error('Fout bij herordenen van foto\'s');
        }

        showMessage('Volgorde succesvol aangepast');
    } catch (error) {
        console.error('Error reordering photos:', error);
        showMessage('Fout bij aanpassen volgorde', 'error');
        await loadPhotos(); // Herstel originele volgorde bij fout
    }
}

// Album bewerken
async function editAlbum() {
    if (!album) return;

    showConfirmDialog(async (confirmed, value) => {
        if (!confirmed || !value) return;

        try {
            const response = await fetchWithAuth(`/api/albums/${albumId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: value })
            });

            if (!response.ok) throw new Error('Fout bij bewerken van album');

            await loadAlbum();
            showMessage('Album succesvol bijgewerkt');
        } catch (error) {
            console.error('Error editing album:', error);
            showMessage('Fout bij bewerken van album', 'error');
        }
    }, {
        message: 'Voer een nieuwe naam in voor het album:',
        inputField: true,
        inputValue: album.title,
        confirmText: 'Opslaan',
        cancelText: 'Annuleren'
    });
}

// Album verwijderen
async function deleteAlbum() {
    showConfirmDialog(async (confirmed) => {
        if (!confirmed) return;

        try {
            const response = await fetchWithAuth(`/api/albums/${albumId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Fout bij verwijderen van album');

            showMessage('Album succesvol verwijderd');
            setTimeout(() => {
                window.location.href = '/admin';
            }, 1000);
        } catch (error) {
            console.error('Error deleting album:', error);
            showMessage('Fout bij verwijderen van album', 'error');
        }
    }, {
        message: 'Weet je zeker dat je dit album wilt verwijderen?',
        confirmText: 'Verwijderen',
        cancelText: 'Annuleren',
        isDangerous: true
    });
}

// Foto bewerken
async function handleEditPhoto(photoId) {
    const photo = photos.find(p => p._id === photoId);
    if (!photo) return;

    showConfirmDialog(async (confirmed, value) => {
        if (!confirmed || !value) return;

        try {
            const response = await fetchWithAuth(`/api/photos/${photoId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: value })
            });

            if (!response.ok) throw new Error('Fout bij bewerken van foto');

            await loadPhotos();
            showMessage('Foto succesvol bijgewerkt');
        } catch (error) {
            console.error('Error editing photo:', error);
            showMessage('Fout bij bewerken van foto', 'error');
        }
    }, {
        message: 'Voer een nieuwe titel in voor de foto:',
        inputField: true,
        inputValue: photo.title || '',
        confirmText: 'Opslaan',
        cancelText: 'Annuleren'
    });
}

// Foto uit album verwijderen
async function handleRemovePhoto(photoId) {
    showConfirmDialog(async (confirmed) => {
        if (!confirmed) return;

        try {
            const response = await fetchWithAuth(`/api/albums/${albumId}/photos/${photoId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Fout bij verwijderen van foto uit album');

            await loadPhotos();
            showMessage('Foto succesvol verwijderd uit album');
        } catch (error) {
            console.error('Error removing photo from album:', error);
            showMessage('Fout bij verwijderen van foto uit album', 'error');
        }
    }, {
        message: 'Weet je zeker dat je deze foto uit het album wilt verwijderen?',
        confirmText: 'Verwijderen',
        cancelText: 'Annuleren',
        isDangerous: true
    });
}

// Thumbnail grootte aanpassen
function initializeThumbnailSize() {
    const thumbnailSize = document.getElementById('thumbnailSize');
    if (thumbnailSize) {
        // Herstel opgeslagen grootte
        const savedSize = localStorage.getItem('thumbnailSize') || 200;
        thumbnailSize.value = savedSize;
        document.documentElement.style.setProperty('--thumbnail-size', `${savedSize}px`);

        thumbnailSize.addEventListener('input', (e) => {
            const size = e.target.value;
            document.documentElement.style.setProperty('--thumbnail-size', `${size}px`);
            localStorage.setItem('thumbnailSize', size);
        });
    }
}

// Uitloggen
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadAlbum();
    initializeThumbnailSize();
    
    // Logout knop
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

// Initialisatie
document.addEventListener('DOMContentLoaded', loadAlbum);

// Maak functies globaal beschikbaar voor HTML event handlers
window.editAlbum = editAlbum;
window.deleteAlbum = deleteAlbum;
window.handleEditPhoto = handleEditPhoto;
window.handleRemovePhoto = handleRemovePhoto; 
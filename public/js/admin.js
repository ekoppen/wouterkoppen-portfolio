import { fetchWithAuth, loadPages as apiLoadPages, loadPhotos as apiLoadPhotos, loadAlbums as apiLoadAlbums, deletePhoto, editPhoto, deleteAlbum, editAlbum, deletePage, editPage } from './api.js';
import { showMessage, showConfirmDialog } from './ui.js';

// State management
let pages = [];
let photos = [];
let albums = [];
let isSelectMode = false;
let selectedPhotos = new Set();

// Auth check functie
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Niet ingelogd');
    }

    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token ongeldig');
        }
    } catch (error) {
        localStorage.removeItem('token');
        throw new Error('Auth check mislukt');
    }
}

// Initialisatie
async function initialize() {
    // Debug code voor hover events
    console.log('Admin interface initialiseren...');
    const albumCards = document.querySelectorAll('.album-card');
    console.log('Gevonden album cards:', albumCards.length);
    
    albumCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            console.log('Hover start op album card:', card);
            const photos = card.querySelectorAll('.preview-photo');
            photos.forEach((photo, index) => {
                console.log(`Preview photo ${index + 1} transform:`, getComputedStyle(photo).transform);
            });
        });
        
        card.addEventListener('mouseleave', () => {
            console.log('Hover einde op album card:', card);
            const photos = card.querySelectorAll('.preview-photo');
            photos.forEach((photo, index) => {
                console.log(`Preview photo ${index + 1} transform:`, getComputedStyle(photo).transform);
            });
        });
    });

    try {
        await checkAuth();
        await Promise.all([
            loadPages(),
            loadAlbums(),
            loadPhotos()
        ]);
        initializeDragAndDrop();
        initializeThumbnailSizeControl();
    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = '/login.html';
    }
}

// Data loading functions
async function loadPages() {
    try {
        pages = await apiLoadPages();
        renderPages();
    } catch (error) {
        console.error('Error loading pages:', error);
        showMessage('Fout bij laden van pagina\'s', 'error');
    }
}

async function loadPhotos() {
    try {
        photos = await apiLoadPhotos();
        renderPhotos();
    } catch (error) {
        console.error('Error loading photos:', error);
        showMessage('Fout bij laden van foto\'s', 'error');
    }
}

async function loadAlbums() {
    try {
        albums = await apiLoadAlbums();
        const container = document.getElementById('albumsContainer');
        if (!container) return;

        container.innerHTML = '';
        renderAlbums();
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

// Thumbnail size control
function initializeThumbnailSizeControl() {
    const thumbnailSize = document.getElementById('thumbnailSize');
    const thumbnailSizeValue = document.getElementById('thumbnailSizeValue');
    const photosGrid = document.getElementById('photosGrid');

    if (thumbnailSize && thumbnailSizeValue) {
        // Configuratie
        const defaultSize = 200;
        thumbnailSize.min = 100;
        thumbnailSize.max = 400;
        thumbnailSize.step = 50;

        // Laad opgeslagen grootte of gebruik standaard
        const savedSize = parseInt(localStorage.getItem('thumbnailSize')) || defaultSize;
        thumbnailSize.value = savedSize;
        
        // Update CSS variabele en tekst
        const updateThumbnailSize = (size) => {
            document.documentElement.style.setProperty('--thumbnail-size', `${size}px`);
            thumbnailSizeValue.textContent = `${size}px`;
            localStorage.setItem('thumbnailSize', size);
            requestAnimationFrame(() => {
                photosGrid.style.gridTemplateColumns = `repeat(auto-fill, ${size}px)`;
            });
        };

        // Stel initiële waarde in
        updateThumbnailSize(savedSize);

        // Event listener voor de slider
        thumbnailSize.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            updateThumbnailSize(size);
        });
    }
}

// Drag and drop initialisatie
function initializeDragAndDrop() {
    document.querySelectorAll('.photo-card').forEach(card => {
        card.setAttribute('draggable', true);
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    document.querySelectorAll('.album-card').forEach(card => {
        const albumId = card.dataset.id;
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            handlePhotoDropOnAlbum(e, albumId);
        });
    });
}

// Upload functies
async function handleFileUpload(files) {
    try {
        const newFormData = new FormData();
        Array.from(files).forEach(file => newFormData.append('photos', file));

        const response = await fetch('/api/photos/upload', {
            method: 'POST',
            body: newFormData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Server response:', response.status, errorData);
            throw new Error(`Fout bij uploaden van foto's: ${errorData}`);
        }

        const uploadedPhotos = await response.json();
        await loadPhotos();
        showMessage(`${uploadedPhotos.length} foto's succesvol geüpload`);
    } catch (error) {
        console.error('Error uploading photos:', error);
        if (error.message.includes('Fout bij uploaden')) {
            showMessage(error.message, 'error');
        } else {
            showMessage('Fout bij uploaden van foto\'s', 'error');
        }
    }
}

// Event handlers voor foto en album acties
async function handleEditPhoto(photoId, currentTitle) {
    showConfirmDialog(async (confirmed, newTitle) => {
        if (confirmed && newTitle) {
            try {
                await editPhoto(photoId, newTitle);
                await loadPhotos();
                showMessage('Foto succesvol bewerkt');
            } catch (error) {
                console.error('Error editing photo:', error);
                showMessage('Fout bij bewerken van foto', 'error');
            }
        }
    }, {
        message: 'Voer een nieuwe titel in:',
        inputField: true,
        inputValue: currentTitle,
        confirmText: 'Opslaan',
        isDangerous: false
    });
}

async function handleDeletePhoto(photoId) {
    showConfirmDialog(async (confirmed) => {
        if (confirmed) {
            try {
                await deletePhoto(photoId);
                await loadPhotos();
                showMessage('Foto succesvol verwijderd');
            } catch (error) {
                console.error('Error deleting photo:', error);
                showMessage('Fout bij verwijderen van foto', 'error');
            }
        }
    }, {
        message: 'Weet je zeker dat je deze foto wilt verwijderen?',
        isDangerous: true
    });
}

async function handleEditAlbum(albumId, currentTitle) {
    showConfirmDialog(async (confirmed, newTitle) => {
        if (confirmed && newTitle) {
            try {
                await editAlbum(albumId, newTitle);
                await loadAlbums();
                showMessage('Album succesvol bewerkt');
            } catch (error) {
                console.error('Error editing album:', error);
                showMessage('Fout bij bewerken van album', 'error');
            }
        }
    }, {
        message: 'Voer een nieuwe titel in:',
        inputField: true,
        inputValue: currentTitle,
        confirmText: 'Opslaan',
        isDangerous: false
    });
}

async function handleDeleteAlbum(albumId) {
    showConfirmDialog(async (confirmed) => {
        if (confirmed) {
            try {
                await deleteAlbum(albumId);
                await loadAlbums();
                showMessage('Album succesvol verwijderd');
            } catch (error) {
                console.error('Error deleting album:', error);
                showMessage('Fout bij verwijderen van album', 'error');
            }
        }
    }, {
        message: 'Weet je zeker dat je dit album wilt verwijderen?',
        isDangerous: true
    });
}

async function handlePhotoDropOnAlbum(event, albumId) {
    event.preventDefault();
    console.log('Drop event op album:', albumId);
    
    // Probeer eerst JSON data te krijgen, val terug op text/plain
    let photoId;
    try {
        const jsonData = event.dataTransfer.getData('application/json');
        if (jsonData) {
            const data = JSON.parse(jsonData);
            photoId = data.photoId;
        }
    } catch (e) {
        console.log('Geen JSON data gevonden, probeer text/plain');
    }

    // Val terug op text/plain als JSON niet werkt
    if (!photoId) {
        photoId = event.dataTransfer.getData('text/plain');
    }

    console.log('Opgehaalde photoId:', photoId);
    
    if (!photoId) {
        console.error('Geen photoId gevonden in drag data');
        return;
    }

    // Vind het album waar de foto naartoe wordt gesleept
    const targetAlbum = albums.find(album => album._id === albumId);
    if (!targetAlbum) {
        console.error('Album niet gevonden:', albumId);
        return;
    }

    // Check of de foto al in het album zit
    if (targetAlbum.photos && targetAlbum.photos.some(photo => photo._id === photoId)) {
        showMessage(`Deze foto zit al in het album "${targetAlbum.title || 'Geen titel'}"`, 'warning');
        return;
    }

    try {
        console.log('API aanroep met albumId:', albumId, 'photoId:', photoId);
        const response = await fetch(`/api/albums/${albumId}/photos/${photoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API response niet ok:', response.status, response.statusText, errorText);
            throw new Error('Fout bij toevoegen van foto aan album');
        }

        await loadAlbums();
        showMessage('Foto succesvol toegevoegd aan album');
    } catch (error) {
        console.error('Error adding photo to album:', error);
        showMessage('Fout bij toevoegen van foto aan album', 'error');
    }
}

// Update de render functies om de nieuwe event handlers te gebruiken
function renderPhotos() {
    const photosGrid = document.getElementById('photosGrid');
    if (!photosGrid) return;

    photosGrid.innerHTML = '';
    photos.forEach(photo => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.draggable = true;
        
        // Voeg de dragstart event listener direct toe aan de photoCard
        photoCard.addEventListener('dragstart', (e) => {
            console.log('Drag start - photoId:', photo._id);
            // Stel meerdere data formaten in voor betere compatibiliteit
            e.dataTransfer.setData('application/json', JSON.stringify({ photoId: photo._id }));
            e.dataTransfer.setData('text/plain', photo._id);
            e.target.classList.add('dragging');
            
            // Voeg drag-hover class toe aan albums sectie
            const albumsSection = document.getElementById('albums-section');
            if (albumsSection && albumsSection.classList.contains('collapsed')) {
                albumsSection.classList.add('drag-hover');
            }
        });
        
        photoCard.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            const albumsSection = document.getElementById('albums-section');
            if (albumsSection) {
                albumsSection.classList.remove('drag-hover');
            }
        });

        photoCard.innerHTML = `
            <div class="photo-container">
                <img src="/uploads/${photo.filename}" alt="${photo.filename}" draggable="false">
                <div class="photo-overlay">
                    <h3>${photo.filename}</h3>
                    <div class="photo-actions">
                        <button onclick="handleEditPhoto('${photo._id}')" class="btn-edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="handleDeletePhoto('${photo._id}')" class="btn-delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        photosGrid.appendChild(photoCard);
    });
}

function renderAlbums() {
    const albumsContainer = document.getElementById('albumsContainer');
    if (!albumsContainer) return;
    if (!albums || !Array.isArray(albums)) return;

    albumsContainer.innerHTML = '';
    
    albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.dataset.id = album._id;

        // Drop event handlers
        albumCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            albumCard.classList.add('drop-target');
        });

        albumCard.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            albumCard.classList.remove('drop-target');
        });

        albumCard.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            albumCard.classList.remove('drop-target');
            handlePhotoDropOnAlbum(e, album._id);
        });

        const previewHTML = album.photos && album.photos.length > 0
            ? [...album.photos].reverse().slice(0, 8).map((photo, index) => {
                return `
                    <div class="preview-photo">
                        <img src="/uploads/${photo.filename}" alt="${album.title}">
                    </div>
                `;
            }).join('')
            : '<div class="empty-album">Geen foto\'s</div>';

        albumCard.innerHTML = `
            <div class="album-header">
                <div class="album-info">
                    <h3>${album.title || 'Geen titel'}</h3>
                    ${album.photos && album.photos.length > 0 
                        ? `<span class="photo-count">${album.photos.length} foto${album.photos.length !== 1 ? '\'s' : ''}</span>`
                        : ''
                    }
                </div>
                <div class="album-actions">
                    <button class="btn-edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="album-preview">
                ${previewHTML}
            </div>
        `;

        // Event listeners voor de knoppen
        const editBtn = albumCard.querySelector('.btn-edit');
        const deleteBtn = albumCard.querySelector('.btn-delete');

        editBtn.addEventListener('click', () => handleEditAlbum(album._id));
        deleteBtn.addEventListener('click', () => handleDeleteAlbum(album._id));

        albumsContainer.appendChild(albumCard);
    });
}

// Album functies
async function createAlbum() {
    showConfirmDialog(async (confirmed, title) => {
        if (confirmed && title) {
            try {
                const response = await fetchWithAuth('/api/albums', {
                    method: 'POST',
                    body: JSON.stringify({ title })
                });

                if (!response.ok) throw new Error('Fout bij aanmaken album');

                await loadAlbums();
                showMessage('Album succesvol aangemaakt');
            } catch (error) {
                console.error('Error creating album:', error);
                showMessage('Fout bij aanmaken album', 'error');
            }
        }
    }, {
        message: 'Voer een titel in voor het nieuwe album:',
        inputField: true,
        confirmText: 'Aanmaken',
        isDangerous: false
    });
}

// Pagina functies
async function createPage() {
    showConfirmDialog(async (confirmed, title) => {
        if (confirmed && title) {
            try {
                const response = await fetchWithAuth('/api/pages', {
                    method: 'POST',
                    body: JSON.stringify({ title })
                });

                if (!response.ok) throw new Error('Fout bij aanmaken pagina');

                await loadPages();
                showMessage('Pagina succesvol aangemaakt');
            } catch (error) {
                console.error('Error creating page:', error);
                showMessage('Fout bij aanmaken pagina', 'error');
            }
        }
    }, {
        message: 'Voer een titel in voor de nieuwe pagina:',
        inputField: true,
        confirmText: 'Aanmaken',
        isDangerous: false
    });
}

// Upload functies
function openUploadDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = async (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            await handleFileUpload(files);
        }
    };
    
    input.click();
}

// Selectie functies
function toggleSelectMode() {
    isSelectMode = !isSelectMode;
    const deleteSelectedBtn = document.querySelector('[onclick="deleteSelectedPhotos()"]');
    const deselectAllBtn = document.querySelector('[onclick="deselectAll()"]');
    const selectModeBtn = document.querySelector('[onclick="toggleSelectMode()"]');
    
    if (isSelectMode) {
        deleteSelectedBtn.style.display = 'inline-block';
        deselectAllBtn.style.display = 'inline-block';
        selectModeBtn.textContent = 'Stop Selecteren';
        document.querySelectorAll('.photo-card').forEach(card => {
            card.classList.add('selectable');
        });
    } else {
        deleteSelectedBtn.style.display = 'none';
        deselectAllBtn.style.display = 'none';
        selectModeBtn.textContent = 'Selecteer Meerdere';
        selectedPhotos.clear();
        document.querySelectorAll('.photo-card').forEach(card => {
            card.classList.remove('selectable', 'selected');
        });
    }
}

function deselectAll() {
    selectedPhotos.clear();
    document.querySelectorAll('.photo-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
}

async function deleteSelectedPhotos() {
    if (selectedPhotos.size === 0) return;

    showConfirmDialog(async (confirmed) => {
        if (confirmed) {
            try {
                const deletePromises = Array.from(selectedPhotos).map(photoId =>
                    deletePhoto(photoId)
                );

                await Promise.all(deletePromises);
                await loadPhotos();
                selectedPhotos.clear();
                showMessage(`${deletePromises.length} foto's succesvol verwijderd`);
            } catch (error) {
                console.error('Error deleting selected photos:', error);
                showMessage('Fout bij verwijderen van foto\'s', 'error');
            }
        }
    }, {
        message: `Weet je zeker dat je ${selectedPhotos.size} foto's wilt verwijderen?`,
        isDangerous: true
    });
}

// Pagina event handlers
async function handleEditPage(pageId, currentTitle) {
    showConfirmDialog(async (confirmed, newTitle) => {
        if (confirmed && newTitle) {
            try {
                await editPage(pageId, newTitle);
                await loadPages();
                showMessage('Pagina succesvol bewerkt');
            } catch (error) {
                console.error('Error editing page:', error);
                showMessage('Fout bij bewerken van pagina', 'error');
            }
        }
    }, {
        message: 'Voer een nieuwe titel in:',
        inputField: true,
        inputValue: currentTitle,
        confirmText: 'Opslaan',
        isDangerous: false
    });
}

async function handleDeletePage(pageId) {
    showConfirmDialog(async (confirmed) => {
        if (confirmed) {
            try {
                await deletePage(pageId);
                await loadPages();
                showMessage('Pagina succesvol verwijderd');
            } catch (error) {
                console.error('Error deleting page:', error);
                showMessage('Fout bij verwijderen van pagina', 'error');
            }
        }
    }, {
        message: 'Weet je zeker dat je deze pagina wilt verwijderen?',
        isDangerous: true
    });
}

// Render functies
function renderPages() {
    const pagesContainer = document.getElementById('pagesContainer');
    if (!pagesContainer) return;

    pagesContainer.innerHTML = '';
    pages.forEach(page => {
        const pageCard = document.createElement('div');
        pageCard.className = 'page-card';
        pageCard.dataset.id = page._id;

        pageCard.innerHTML = `
            <div class="page-header">
                <h3>${page.title || 'Geen titel'}</h3>
                <div class="page-actions">
                    <button class="btn-edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        const editBtn = pageCard.querySelector('.btn-edit');
        const deleteBtn = pageCard.querySelector('.btn-delete');
        
        editBtn.addEventListener('click', () => handleEditPage(page._id, page.title || ''));
        deleteBtn.addEventListener('click', () => handleDeletePage(page._id));
        
        pagesContainer.appendChild(pageCard);
    });
}

// Drag and drop handlers
export function handleDragStart(event, photoId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', photoId);
    event.target.classList.add('dragging');
    
    // Voeg drag-hover class toe aan albums sectie
    const albumsSection = document.getElementById('albums-section');
    if (albumsSection && albumsSection.classList.contains('collapsed')) {
        albumsSection.classList.add('drag-hover');
    }
}

export function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    // Reset de expand timeout en hover status
    if (window.expandTimeout) {
        clearTimeout(window.expandTimeout);
        window.expandTimeout = null;
    }
    document.getElementById('albums-section')?.classList.remove('drag-hover');
}

export function handleDragOver(e) {
    e.preventDefault();
    const albumsSection = document.getElementById('albums-section');
    
    if (albumsSection) {
        const rect = albumsSection.getBoundingClientRect();
        const isOverSection = (
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right
        );

        if (isOverSection) {
            albumsSection.classList.add('drag-hover');
            
            // Als de sectie ingeklapt is, klap hem uit na een korte vertraging
            if (albumsSection.classList.contains('collapsed') && !window.expandTimeout) {
                window.expandTimeout = setTimeout(() => {
                    toggleSection('albums-section');
                }, 500);
            }
        } else {
            albumsSection.classList.remove('drag-hover');
            if (window.expandTimeout) {
                clearTimeout(window.expandTimeout);
                window.expandTimeout = null;
            }
        }
    }

    // Highlight het specifieke album als we erover hoveren
    const albumCard = e.target.closest('.album-card');
    if (albumCard) {
        albumCard.classList.add('drop-target');
    }
}

export function handleDragLeave(e) {
    const albumsSection = document.getElementById('albums-section');
    const albumCard = e.target.closest('.album-card');
    const relatedTarget = e.relatedTarget?.closest('.album-card');
    
    // Controleer of we echt de albums sectie verlaten
    if (albumsSection && !albumsSection.contains(e.relatedTarget)) {
        albumsSection.classList.remove('drag-hover');
        if (window.expandTimeout) {
            clearTimeout(window.expandTimeout);
            window.expandTimeout = null;
        }
    }
    
    if (albumCard && albumCard !== relatedTarget) {
        albumCard.classList.remove('drop-target');
    }
}

// Helper functie voor het uitklappen/inklappen van secties
export function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('collapsed');
        const isCollapsed = section.classList.contains('collapsed');
        localStorage.setItem(`${sectionId}-collapsed`, isCollapsed);
    }
}

// Exporteer de functies die nodig zijn in de HTML
export {
    initialize,
    createPage,
    createAlbum,
    openUploadDialog,
    deleteSelectedPhotos,
    deselectAll,
    toggleSelectMode,
    handleEditPage,
    handleDeletePage,
    handleEditAlbum,
    handleDeleteAlbum,
    handleEditPhoto,
    handleDeletePhoto,
    handleFileUpload,
    handlePhotoDropOnAlbum
}; 

document.addEventListener('DOMContentLoaded', function() {
    // Bestaande code blijft hier ...

    // Debug code voor hover events
    const albumCards = document.querySelectorAll('.album-card');
    albumCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            console.log('Hover start op album card:', card);
            const photos = card.querySelectorAll('.preview-photo');
            photos.forEach((photo, index) => {
                console.log(`Preview photo ${index + 1} transform:`, getComputedStyle(photo).transform);
            });
        });
        
        card.addEventListener('mouseleave', () => {
            console.log('Hover einde op album card:', card);
            const photos = card.querySelectorAll('.preview-photo');
            photos.forEach((photo, index) => {
                console.log(`Preview photo ${index + 1} transform:`, getComputedStyle(photo).transform);
            });
        });
    });
}); 
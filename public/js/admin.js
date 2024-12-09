import { 
    fetchWithAuth, 
    loadPages as apiLoadPages, 
    loadPhotos as apiLoadPhotos, 
    loadAlbums as apiLoadAlbums,
    deletePhoto,
    editPhoto,
    deleteAlbum,
    editAlbum,
    deletePage,
    editPage,
    getThemes,
    createTheme,
    updateTheme,
    activateTheme,
    deleteTheme
} from './api.js';

import {
    showMessage,
    showConfirmDialog,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    getLocalState,
    setLocalState
} from './ui.js';

import { initializeTheme } from './theme.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initialize();

    // Add event listeners
    document.querySelectorAll('[data-action]').forEach(element => {
        const action = element.getAttribute('data-action');
        switch (action) {
            case 'createPage':
                element.addEventListener('click', createPage);
                break;
            case 'createAlbum':
                element.addEventListener('click', createAlbum);
                break;
            case 'createTheme':
                element.addEventListener('click', handleCreateTheme);
                break;
            case 'openUploadDialog':
                element.addEventListener('click', openUploadDialog);
                break;
            case 'toggleSelectMode':
                element.addEventListener('click', toggleSelectMode);
                break;
            case 'deleteSelectedPhotos':
                element.addEventListener('click', deleteSelectedPhotos);
                break;
            case 'deselectAll':
                element.addEventListener('click', deselectAll);
                break;
            case 'addAlbum':
                element.addEventListener('click', addAlbum);
                break;
        }
    });

    // Logout functionaliteit
    document.getElementById('logoutButton')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    // Thumbnail grootte aanpassen
    const thumbnailSize = document.getElementById('thumbnailSize');
    const thumbnailSizeValue = document.getElementById('thumbnailSizeValue');
    const photosGrid = document.getElementById('photosGrid');

    if (thumbnailSize && photosGrid) {
        thumbnailSize.addEventListener('input', (e) => {
            const size = e.target.value;
            document.documentElement.style.setProperty('--thumbnail-size', `${size}px`);
        });
    }

    // Make functions available globally for inline event handlers
    Object.assign(window, {
        handleEditPage,
        handleDeletePage,
        handleEditAlbum,
        handleDeleteAlbum,
        handleEditPhoto,
        handleDeletePhoto,
        handleCreateTheme,
        handleEditTheme,
        handleActivateTheme,
        handleDeleteTheme,
        handleEditColor,
        showColorPickerDialog,
        closeColorPickerDialog,
        updateColorPreview,
        saveColorChange,
        handlePageThemeChange
    });
});

// State management
let pages = [];
let photos = [];
let albums = [];
let themes = [];
let isSelectMode = false;
let selectedPhotos = new Set();
let currentEditingTheme = null;
let currentEditingColor = null;

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
            loadThemes(),
            loadPages(),
            loadPhotos(),
            loadAlbums()
        ]);
        initializeDragAndDrop();
        initializeThumbnailSizeControl();
        initializeCollapsibleSections();
        await initializeTheme();
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
        updateItemCounts();
    } catch (error) {
        console.error('Error loading pages:', error);
        showMessage('Fout bij laden van pagina\'s', 'error');
    }
}

async function loadPhotos() {
    try {
        photos = await apiLoadPhotos();
        renderPhotos();
        updateItemCounts();
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
        updateItemCounts();
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

// Thumbnail size control
function initializeThumbnailSizeControl() {
    const thumbnailSize = document.getElementById('thumbnailSize');
    const photosGrid = document.getElementById('photosGrid');

    if (thumbnailSize && photosGrid) {
        // Configuratie
        const defaultSize = 200;
        thumbnailSize.min = 100;
        thumbnailSize.max = 400;
        thumbnailSize.step = 50;

        // Laad opgeslagen grootte of gebruik standaard
        const savedSize = parseInt(localStorage.getItem('thumbnailSize')) || defaultSize;
        thumbnailSize.value = savedSize;
        
        // Update CSS variabele en grid
        const updateThumbnailSize = (size) => {
            document.documentElement.style.setProperty('--thumbnail-size', `${size}px`);
            localStorage.setItem('thumbnailSize', size);
            if (photosGrid) {
                photosGrid.style.gridTemplateColumns = `repeat(auto-fill, ${size}px)`;
            }
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
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', (e) => {
            handleDrop(e, handlePhotoDropOnAlbum);
        });
    });
}

// Upload functies
async function handleFileUpload(files) {
    try {
        const newFormData = new FormData();
        Array.from(files).forEach(file => newFormData.append('photos', file));

        const response = await fetch('/api/upload', {
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
async function handleEditPhoto(photoId, currentFilename) {
    showConfirmDialog(async (confirmed, newFilename) => {
        if (confirmed && newFilename) {
            try {
                await fetch(`/api/photos/${photoId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title: newFilename })
                });

                await loadPhotos();
                showMessage('Foto succesvol hernoemd');
            } catch (error) {
                console.error('Error editing photo:', error);
                showMessage('Fout bij hernoemen van foto', 'error');
            }
        }
    }, {
        message: 'Voer een nieuwe naam in voor de foto:',
        inputField: true,
        inputValue: currentFilename,
        confirmText: 'Opslaan',
        isDangerous: false
    });
}

async function handleDeletePhoto(photoId) {
    showConfirmDialog(async (confirmed) => {
        if (confirmed) {
            try {
                await fetch(`/api/photos/${photoId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

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

// Foto naar album verplaatsen
async function handlePhotoDropOnAlbum(photoId, albumId) {
    try {
        const response = await fetchWithAuth(`/api/albums/${albumId}/photos/${photoId}`, {
            method: 'PUT'
        });

        if (!response.ok) {
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
    const container = document.getElementById('photosGrid');
    if (!container) return;

    container.innerHTML = '';
    photos.forEach(photo => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.draggable = true;
        photoCard.dataset.id = photo._id;
        
        photoCard.innerHTML = `
            <div class="photo-container">
                <img src="${photo.path}" alt="${photo.title}" draggable="false">
                <div class="photo-overlay">
                    <div class="photo-actions">
                        <button class="btn-edit" onclick="handleEditPhoto('${photo._id}')" title="Bewerk foto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="handleDeletePhoto('${photo._id}')" title="Verwijder foto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners voor drag & drop
        photoCard.addEventListener('dragstart', handleDragStart);
        photoCard.addEventListener('dragend', handleDragEnd);

        // Voeg click handler toe voor foto details
        photoCard.querySelector('img').addEventListener('click', () => {
            showPhotoDetails(photo);
        });

        container.appendChild(photoCard);
    });
    updateItemCounts();
}

// Albums renderen
function renderAlbums() {
    const container = document.getElementById('albumsContainer');
    if (!container) return;

    container.innerHTML = '';
    albums.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';
        albumCard.dataset.id = album._id;

        // Laad opgeslagen staat
        const isExpanded = getLocalState(`album_${album._id}_expanded`, false);
        if (isExpanded) {
            albumCard.classList.add('expanded');
        }

        // Album header
        const albumHeader = document.createElement('div');
        albumHeader.className = 'album-header';
        albumHeader.innerHTML = `
            <div class="album-title">
                <h3>${album.title}</h3>
                <p class="photo-count">${album.photos ? album.photos.length : 0} foto's</p>
            </div>
            <div class="album-actions">
                <button class="btn-icon" onclick="handleEditAlbum('${album._id}', '${album.title}')" title="Album bewerken">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="handleDeleteAlbum('${album._id}')" title="Album verwijderen">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Album preview
        const albumPreview = document.createElement('div');
        albumPreview.className = 'album-preview';
        
        // Voeg foto previews toe
        if (album.photos && album.photos.length > 0) {
            // Neem de laatste 8 foto's en draai ze om zodat de nieuwste bovenop komt
            const previewPhotos = album.photos.slice(-8).reverse();
            
            // Gebruik de laatste foto voor de achtergrondkleur
            const lastPhoto = album.photos[album.photos.length - 1];
            if (lastPhoto) {
                // Laad de afbeelding en bereken de gemiddelde kleur
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    const avgColor = getAverageColor(img);
                    // Pas de achtergrondkleur toe met lage opacity voor een subtiel effect
                    albumCard.style.backgroundColor = `rgba(${avgColor.r}, ${avgColor.g}, ${avgColor.b}, 0.1)`;
                };
                img.src = lastPhoto.thumbPath;
            }

            previewPhotos.forEach(photo => {
                const previewContainer = document.createElement('div');
                previewContainer.className = 'preview-photo';
                
                const img = document.createElement('img');
                img.src = photo.thumbPath;
                img.alt = photo.title || 'Preview';
                
                previewContainer.appendChild(img);
                albumPreview.appendChild(previewContainer);
            });
        } else {
            albumPreview.innerHTML = '<p class="no-photos">Geen foto\'s</p>';
        }

        // Album content
        const albumContent = document.createElement('div');
        albumContent.className = 'album-content';
        
        if (album.photos && album.photos.length > 0) {
            const photosGrid = document.createElement('div');
            photosGrid.className = 'photos-grid';
            
            album.photos.forEach(photo => {
                const photoCard = document.createElement('div');
                photoCard.className = 'photo-card';
                photoCard.dataset.id = photo._id;
                
                photoCard.innerHTML = `
                    <img src="${photo.thumbPath}" alt="${photo.title || ''}" loading="lazy">
                    <div class="photo-actions">
                        <button class="btn-icon" onclick="handleEditPhoto('${photo._id}', '${photo.title || ''}')" title="Foto bewerken">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="handleDeletePhoto('${photo._id}')" title="Foto verwijderen">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                photosGrid.appendChild(photoCard);
            });
            
            albumContent.appendChild(photosGrid);
        } else {
            albumContent.innerHTML = '<p class="no-photos">Geen foto\'s in dit album</p>';
        }

        // Voeg alles samen
        albumCard.appendChild(albumHeader);
        albumCard.appendChild(albumPreview);
        albumCard.appendChild(albumContent);

        // Voeg click handler toe voor expand/collapse
        albumCard.addEventListener('click', (e) => {
            // Voorkom dat clicks op knoppen het album uitklappen
            if (!e.target.closest('.btn-icon')) {
                handleAlbumClick(album._id);
            }
        });

        // Voeg drag & drop handlers toe
        albumCard.addEventListener('dragover', handleDragOver);
        albumCard.addEventListener('dragleave', handleDragLeave);
        albumCard.addEventListener('drop', (e) => {
            handleDrop(e, handlePhotoDropOnAlbum);
        });

        container.appendChild(albumCard);
    });
}

// Helper functie om de gemiddelde kleur van een afbeelding te berekenen
function getAverageColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }
    
    return {
        r: Math.round(r / pixelCount),
        g: Math.round(g / pixelCount),
        b: Math.round(b / pixelCount)
    };
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
    const container = document.getElementById('pagesContainer');
    if (!container) return;

    container.innerHTML = '';
    pages.forEach(page => {
        const card = document.createElement('div');
        card.className = 'page-card';
        
        card.innerHTML = `
            <div class="page-header">
                <h3 class="page-title">${page.title}</h3>
                <div class="page-actions">
                    <div class="theme-selector">
                        <label>Thema:</label>
                        <select onchange="handlePageThemeChange('${page._id}', this.value)">
                            <option value="">Standaard</option>
                            ${(themes || []).map(theme => `
                                <option value="${theme._id}" ${page.theme && page.theme._id === theme._id ? 'selected' : ''}>
                                    ${theme.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="btn-primary" onclick="handleEditPage('${page._id}', '${page.title}')" title="Bewerk pagina">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-danger" onclick="handleDeletePage('${page._id}')" title="Verwijder pagina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${page.theme ? `
                <div class="page-theme-preview">
                    <div class="color-grid">
                        ${renderColorPreviews(page.theme.colors)}
                    </div>
                </div>
            ` : ''}
        `;
        
        container.appendChild(card);
    });
}

async function handlePageThemeChange(pageId, themeId) {
    try {
        await updatePageTheme(pageId, themeId || null);
        await loadPages();
        showMessage('Pagina thema succesvol bijgewerkt');
    } catch (error) {
        showMessage('Fout bij bijwerken pagina thema', 'error');
    }
}

// Drag and drop handlers
function handleDragOver(e) {
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

        if (isOverSection && albumsSection.classList.contains('collapsed') && !window.expandTimeout) {
            window.expandTimeout = setTimeout(() => {
                toggleSection('albums-section');
            }, 500);
        }
    }

    // Verwijder eerst alle drop-target klassen
    document.querySelectorAll('.drop-target').forEach(el => {
        el.classList.remove('drop-target');
    });

    // Voeg alleen drop-target toe aan het album waar we overheen hoveren
    const albumCard = e.target.closest('.album-card');
    if (albumCard) {
        albumCard.classList.add('drop-target');
    }
}

function handleDragLeave(e) {
    const albumCard = e.target.closest('.album-card');
    const relatedTarget = e.relatedTarget?.closest('.album-card');
    
    // Verwijder drop-target alleen als we echt het album verlaten
    if (albumCard && albumCard !== relatedTarget) {
        albumCard.classList.remove('drop-target');
    }

    if (window.expandTimeout) {
        clearTimeout(window.expandTimeout);
        window.expandTimeout = null;
    }
}

// Helper functie voor het uitklappen/inklappen van secties
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('collapsed');
        const isCollapsed = section.classList.contains('collapsed');
        localStorage.setItem(`${sectionId}_collapsed`, isCollapsed);
    }
}

// Collapsible sections
function initializeCollapsibleSections() {
    const sections = ['pages-section', 'albums-section', 'photos-section'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            // Herstel opgeslagen status
            const isCollapsed = localStorage.getItem(`${sectionId}_collapsed`) === 'true';
            if (isCollapsed) {
                section.classList.add('collapsed');
            }

            // Event listener voor de collapse knop
            const button = section.querySelector('.btn-collapse');
            if (button) {
                button.addEventListener('click', () => toggleSection(sectionId));
            }
        }
    });
}

function handleCollapse(event) {
    const button = event.currentTarget;
    const sectionId = button.getAttribute('data-section');
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('collapsed');
        const content = section.querySelector('.section-content');
        if (content) {
            if (section.classList.contains('collapsed')) {
                content.style.display = 'none';
            } else {
                content.style.display = 'block';
            }
        }
    }
}

// Thema management functies
async function loadThemes() {
    try {
        themes = await getThemes();
        updateItemCounts();
    } catch (error) {
        console.error('Error loading themes:', error);
        showMessage('Fout bij laden van thema\'s', 'error');
    }
}

function renderThemes(themes) {
    const container = document.getElementById('themesContainer');
    if (!container) return;

    container.innerHTML = '';
    themes.forEach(theme => {
        const card = document.createElement('div');
        card.className = `theme-card ${theme.isActive ? 'active' : ''}`;
        card.dataset.themeId = theme._id;
        
        card.innerHTML = `
            <div class="theme-header">
                <h3 class="theme-title">
                    ${theme.name}
                    ${theme.isActive ? '<span class="active-badge">Actief</span>' : ''}
                </h3>
                <div class="theme-actions">
                    ${!theme.isActive ? `
                        <button class="btn-secondary" onclick="handleActivateTheme('${theme._id}')" title="Activeer thema">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-danger" onclick="handleDeleteTheme('${theme._id}')" title="Verwijder thema">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="color-grid">
                ${renderColorPreviews(theme.colors)}
            </div>
        `;
        
        container.appendChild(card);
    });
}

function renderColorPreviews(colors) {
    const mainColors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
    return mainColors.map(color => `
        <div class="color-item">
            <div class="color-preview" 
                 style="background-color: ${colors[color]}"
                 onclick="handleEditColor('${color}', '${colors[color]}')"
                 title="Klik om te bewerken"></div>
            <span class="color-label">${color}</span>
        </div>
    `).join('');
}

async function handleCreateTheme() {
    showConfirmDialog(async (confirmed, name) => {
        if (confirmed && name) {
            try {
                const theme = await createTheme({
                    name,
                    colors: {
                        primary: '#007bff',
                        secondary: '#6c757d',
                        success: '#28a745',
                        danger: '#dc3545',
                        warning: '#ffc107',
                        info: '#17a2b8'
                    }
                });
                await loadThemes();
                showMessage('Thema succesvol aangemaakt');
            } catch (error) {
                showMessage('Fout bij aanmaken thema', 'error');
            }
        }
    }, {
        message: 'Voer een naam in voor het nieuwe thema:',
        placeholder: 'Thema naam'
    });
}

async function handleEditTheme(themeId) {
    // Implementeer kleurkiezer dialog
}

async function handleActivateTheme(themeId) {
    try {
        await activateTheme(themeId);
        await loadThemes();
        await initializeTheme();
        showMessage('Thema succesvol geactiveerd');
    } catch (error) {
        showMessage('Fout bij activeren thema', 'error');
    }
}

async function handleDeleteTheme(themeId) {
    showConfirmDialog(async (confirmed) => {
        if (confirmed) {
            try {
                await deleteTheme(themeId);
                await loadThemes();
                showMessage('Thema succesvol verwijderd');
            } catch (error) {
                showMessage('Fout bij verwijderen thema', 'error');
            }
        }
    }, {
        message: 'Weet je zeker dat je dit thema wilt verwijderen?',
        confirmText: 'Verwijderen',
        cancelText: 'Annuleren'
    });
}

function showColorPickerDialog(themeId, colorKey, currentColor) {
    currentEditingTheme = themeId;
    currentEditingColor = colorKey;

    const dialog = document.createElement('div');
    dialog.className = 'color-picker-dialog';
    dialog.innerHTML = `
        <div class="color-picker-header">
            <h3>Kleur aanpassen</h3>
            <button class="btn-secondary" onclick="closeColorPickerDialog()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="color-picker-content">
            <div class="color-preview-large" style="background-color: ${currentColor}"></div>
            <div class="color-input-group">
                <input type="color" 
                       value="${currentColor}" 
                       onchange="updateColorPreview(this.value)" 
                       oninput="updateColorPreview(this.value)">
                <input type="text" 
                       value="${currentColor}" 
                       onchange="updateColorPreview(this.value)"
                       pattern="^#[0-9A-Fa-f]{6}$"
                       title="Hexadecimale kleurcode (bijv. #FF0000)">
            </div>
            <div class="color-picker-actions">
                <button class="btn-secondary" onclick="closeColorPickerDialog()">Annuleren</button>
                <button class="btn-primary" onclick="saveColorChange()">Opslaan</button>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.appendChild(dialog);

    document.body.appendChild(overlay);
}

function closeColorPickerDialog() {
    const overlay = document.querySelector('.overlay');
    if (overlay) {
        overlay.remove();
    }
    currentEditingTheme = null;
    currentEditingColor = null;
}

function updateColorPreview(color) {
    // Valideer hexadecimale kleurcode
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return;
    }

    const preview = document.querySelector('.color-preview-large');
    const colorInput = document.querySelector('input[type="color"]');
    const textInput = document.querySelector('input[type="text"]');

    preview.style.backgroundColor = color;
    colorInput.value = color;
    textInput.value = color;
}

async function saveColorChange() {
    const colorInput = document.querySelector('input[type="color"]');
    const newColor = colorInput.value;

    try {
        const theme = await getThemes().then(themes => 
            themes.find(t => t._id === currentEditingTheme)
        );

        if (!theme) {
            throw new Error('Thema niet gevonden');
        }

        const updatedColors = { ...theme.colors };
        updatedColors[currentEditingColor] = newColor;

        await updateTheme(currentEditingTheme, {
            colors: updatedColors
        });

        await loadThemes();
        if (theme.isActive) {
            await initializeTheme();
        }

        closeColorPickerDialog();
        showMessage('Kleur succesvol bijgewerkt');
    } catch (error) {
        showMessage('Fout bij bijwerken kleur', 'error');
    }
}

function handleEditColor(colorKey, currentColor) {
    const themeCard = event.target.closest('.theme-card');
    const themeId = themeCard.dataset.themeId;
    showColorPickerDialog(themeId, colorKey, currentColor);
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
    handlePhotoDropOnAlbum,
    handleCollapse,
    handleCreateTheme,
    handleEditTheme,
    handleActivateTheme,
    handleDeleteTheme,
    handleEditColor,
    showColorPickerDialog,
    closeColorPickerDialog,
    updateColorPreview,
    saveColorChange,
    handlePageThemeChange,
    handleDragOver,
    handleDragLeave,
    toggleSection
}; 

function updateItemCounts() {
    // Update pages count
    const pagesCount = document.querySelector('#pages-section .item-count');
    if (pagesCount) {
        pagesCount.textContent = `(${pages.length})`;
    }

    // Update albums count
    const albumsCount = document.querySelector('#albums-section .item-count');
    if (albumsCount) {
        albumsCount.textContent = `(${albums.length})`;
    }

    // Update photos count
    const photosCount = document.querySelector('#photos-section .item-count');
    if (photosCount) {
        photosCount.textContent = `(${photos.length})`;
    }
} 

// Foto details functies
async function showPhotoDetails(photo) {
    const infoSection = document.querySelector('.info-section');
    infoSection.classList.add('showing-photo');

    // Update basis foto informatie
    document.getElementById('selected-photo').src = photo.path;
    document.getElementById('photo-filename').textContent = photo.title || 'Onbekende naam';
    document.getElementById('photo-type').textContent = photo.mimetype || 'image/jpeg';

    try {
        // Haal foto metadata op van de server
        const response = await fetchWithAuth(`/api/photos/${photo._id}/metadata`);
        if (!response.ok) throw new Error('Fout bij ophalen metadata');
        
        const metadata = await response.json();
        
        // Update afmetingen
        document.getElementById('photo-dimensions').textContent = `${metadata.width} × ${metadata.height} pixels`;
        
        // Update bestandsgrootte
        const sizeInMB = (metadata.size / (1024 * 1024)).toFixed(2);
        document.getElementById('photo-size').textContent = `${sizeInMB} MB`;

        // Update EXIF data
        const exifContainer = document.getElementById('exif-data');
        exifContainer.innerHTML = '';

        if (metadata.exif) {
            const displayNames = {
                'ImageHeight': 'Hoogte',
                'ImageWidth': 'Breedte',
                'ColorComponents': 'Kleurcomponenten',
                'BitsPerSample': 'Bits per sample',
                'ResolutionUnit': 'Resolutie eenheid',
                'XResolution': 'X-Resolutie',
                'YResolution': 'Y-Resolutie',
                'FileType': 'Bestandstype',
                'Subsampling': 'Subsampling',
                'Make': 'Camera merk',
                'Model': 'Camera model',
                'LensModel': 'Lens model',
                'LensMake': 'Lens merk',
                'ExposureTime': 'Sluitertijd',
                'FNumber': 'Diafragma',
                'ISO': 'ISO',
                'FocalLength': 'Brandpuntafstand',
                'DateTimeOriginal': 'Opnamedatum',
                'GPSLatitude': 'Breedtegraad',
                'GPSLongitude': 'Lengtegraad'
            };

            for (const [key, value] of Object.entries(metadata.exif)) {
                if (value !== null && value !== undefined) {
                    const dt = document.createElement('dt');
                    dt.textContent = displayNames[key] || key;
                    const dd = document.createElement('dd');
                    dd.textContent = value.toString();
                    exifContainer.appendChild(dt);
                    exifContainer.appendChild(dd);
                }
            }
        } else {
            exifContainer.innerHTML = '<dt>EXIF Data</dt><dd>Geen EXIF data beschikbaar</dd>';
        }

    } catch (error) {
        console.error('Fout bij laden foto details:', error);
        showMessage('Fout bij laden van foto details', 'error');
    }
} 

// Voeg deze functie toe aan het begin van het bestand
function setupImageProtection() {
    // Voorkom rechtermuisknop menu
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.photo-container')) {
            e.preventDefault();
        }
    });

    // Voorkom drag & drop van afbeeldingen
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.photo-container')) {
            e.preventDefault();
        }
    });

    // Voorkom keyboard shortcuts voor opslaan
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
        }
    });
}

// Helper functie voor API requests met auth
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = token ? {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    } : {};

    return fetch(url, { ...defaultOptions, ...options });
}

// Check auth status
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetchWithAuth('/api/auth/check');
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
}

// Update de logout functie
function logout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.reload();
}

let currentPhotoIndex = 0;
let photos = [];
let slideTimer;
let currentAlbum = null;
const SLIDE_DURATION = 10000; // 10 seconden

// Foto's laden
async function loadPhotos() {
    try {
        // Haal specifiek het "home" album op
        const response = await fetch('/api/albums/by-name/home');
        if (!response.ok) throw new Error('Fout bij ophalen home album');
        
        const album = await response.json();
        if (!album || !album.photos || album.photos.length === 0) {
            console.error('Geen foto\'s gevonden in home album');
            return;
        }
        
        photos = album.photos;
        currentAlbum = album;
        if (photos.length > 0) {
            showPhoto(0);
            startSlideTimer();
        }
    } catch (error) {
        console.error('Fout bij het laden van foto\'s:', error);
        // Fallback naar alle foto's als het home album niet bestaat
        try {
            const fallbackResponse = await fetch('/api/photos');
            if (!fallbackResponse.ok) throw new Error('Fout bij ophalen foto\'s');
            
            photos = await fallbackResponse.json();
            if (photos.length > 0) {
                showPhoto(0);
                startSlideTimer();
            }
        } catch (fallbackError) {
            console.error('Fout bij laden van fallback foto\'s:', fallbackError);
        }
    }
}

// Helper functie om de helderheid van een kleur te bepalen
function getLuminance(r, g, b) {
    // Relatieve helderheid volgens WCAG
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper functie om de dominante kleur van een afbeelding te bepalen
function getImageColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50;  // Kleine sample size voor performance
    canvas.height = 50;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    let r = 0, g = 0, b = 0, count = 0;
    
    // Sample pixels uit het midden van de afbeelding
    for (let i = 0; i < data.length; i += 4) {
        // Alleen pixels die niet te donker of te licht zijn
        if (data[i] > 10 && data[i] < 245 && 
            data[i+1] > 10 && data[i+1] < 245 && 
            data[i+2] > 10 && data[i+2] < 245) {
            r += data[i];
            g += data[i+1];
            b += data[i+2];
            count++;
        }
    }
    
    if (count === 0) return { r: 128, g: 128, b: 128 }; // Fallback naar grijs
    
    return {
        r: Math.round(r/count),
        g: Math.round(g/count),
        b: Math.round(b/count)
    };
}

// Helper functie om de beste tekstkleur te bepalen
function getContrastColor(bgColor) {
    const luminance = getLuminance(bgColor.r, bgColor.g, bgColor.b);
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Extra beschermingsfuncties
function setupAdvancedProtection() {
    // Voorkom screenshots (werkt in sommige browsers)
    document.addEventListener('keyup', (e) => {
        if ((e.key === 'PrintScreen' || e.key === 'Snapshot') || 
            (e.ctrlKey && e.key === 'p') || 
            (e.metaKey && e.key === 'p')) {
            e.preventDefault();
            return false;
        }
    });

    // Voorkom inspecteren
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (
            e.key === 'I' || 
            e.key === 'i' || 
            e.key === 'J' || 
            e.key === 'j' || 
            e.key === 'C' || 
            e.key === 'c' || 
            e.key === 'K' || 
            e.key === 'k' || 
            e.key === 'U' || 
            e.key === 'u'
        )) {
            e.preventDefault();
            return false;
        }
    });

    // Voorkom selecteren
    document.addEventListener('selectstart', (e) => {
        if (e.target.closest('.photo-container')) {
            e.preventDefault();
            return false;
        }
    });

    // Voorkom kopiëren
    document.addEventListener('copy', (e) => {
        if (e.target.closest('.photo-container')) {
            e.preventDefault();
            return false;
        }
    });

    // Voorkom opslaan van afbeeldingen
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.photo-container')) {
            e.preventDefault();
            return false;
        }
    });
}

// Update de showPhoto functie
function showPhoto(index) {
    if (photos.length === 0) return;
    
    currentPhotoIndex = (index + photos.length) % photos.length;
    const photo = photos[currentPhotoIndex];
    const container = document.querySelector('.photo-container');
    if (!container) return;
    
    // Genereer unieke ID voor deze weergave
    const viewId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Maak nieuwe foto slide
    const newSlide = document.createElement('div');
    newSlide.className = 'photo-slide';
    newSlide.style.backgroundImage = `url(${photo.path}?v=${viewId})`;
    newSlide.setAttribute('draggable', 'false');
    newSlide.setAttribute('data-protected', 'true');
    newSlide.setAttribute('data-view-id', viewId);
    
    // Laad de afbeelding om de dominante kleur te bepalen
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `${photo.path}?v=${viewId}`;
    img.onload = () => {
        const color = getImageColor(img);
        const textColor = getContrastColor(color);
        
        // Update kleuren van UI elementen
        document.documentElement.style.setProperty('--dynamic-text-color', textColor);
        document.querySelector('.logo').style.color = textColor;
        document.querySelectorAll('.btn-icon').forEach(btn => {
            btn.style.color = textColor;
        });
        document.querySelectorAll('.album-dock-item').forEach(item => {
            item.style.color = textColor;
        });
    };
    
    // Verwijder oude slides
    const oldSlides = container.querySelectorAll('.photo-slide');
    oldSlides.forEach(slide => {
        if (slide.classList.contains('active')) {
            slide.classList.remove('active');
            slide.classList.add('previous');
            setTimeout(() => slide.remove(), 800);
        } else {
            slide.remove();
        }
    });

    // Voeg nieuwe slide toe en activeer deze
    container.appendChild(newSlide);
    requestAnimationFrame(() => {
        newSlide.classList.add('active');
    });
    
    // Reset en start timer
    resetSlideTimer();
    startSlideTimer();
}

function startSlideTimer() {
    if (slideTimer) clearInterval(slideTimer);
    
    let startTime = Date.now();
    const timerBar = document.querySelector('.timer-bar');
    timerBar.style.width = '0%';

    slideTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed / SLIDE_DURATION) * 100;
        
        if (progress >= 100) {
            showPhoto(currentPhotoIndex + 1);
        } else {
            timerBar.style.width = `${progress}%`;
        }
    }, 50);
}

function resetSlideTimer() {
    if (slideTimer) clearInterval(slideTimer);
    const timerBar = document.querySelector('.timer-bar');
    timerBar.style.width = '0%';
}

// Albums laden en dock vullen
async function loadAlbums() {
    try {
        // Laad albums
        const albumsResponse = await fetch('/api/albums');
        if (!albumsResponse.ok) throw new Error('Fout bij ophalen albums');
        const albums = await albumsResponse.json();
        
        const dock = document.querySelector('.album-dock');
        const currentAlbum = localStorage.getItem('currentAlbum') || 'home';
        
        // Maak de dock leeg
        dock.innerHTML = '';
        
        // Filter en sorteer albums
        const filteredAlbums = albums
            .filter(album => album.title !== 'admin')
            .sort((a, b) => {
                if (a.title.toLowerCase() === 'home') return -1;
                if (b.title.toLowerCase() === 'home') return 1;
                return a.order - b.order || a.title.localeCompare(b.title);
            });
        
        // Container voor albums (links)
        const albumsContainer = document.createElement('div');
        albumsContainer.className = 'albums-container';
        
        // Voeg albums toe
        filteredAlbums.forEach(album => {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'album-dock-item';
            if (album.title.toLowerCase() === currentAlbum.toLowerCase()) {
                link.classList.add('active');
            }
            link.textContent = album.title.charAt(0).toUpperCase() + album.title.slice(1);
            link.setAttribute('data-album', album.title);
            
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                await switchAlbum(album.title);
                
                // Update actieve status
                document.querySelectorAll('.album-dock-item').forEach(item => {
                    item.classList.remove('active');
                });
                link.classList.add('active');
            });
            
            albumsContainer.appendChild(link);
        });
        
        // Container voor pagina's (rechts)
        const pagesContainer = document.createElement('div');
        pagesContainer.className = 'pages-container';
        
        // Probeer pagina's te laden
        try {
            const pagesResponse = await fetchWithAuth('/api/pages');
            if (pagesResponse.ok) {
                const pages = await pagesResponse.json();
                // Voeg pagina's toe als ze beschikbaar zijn
                pages.forEach(page => {
                    const link = document.createElement('a');
                    link.href = `/page/${page.slug}`;
                    link.className = 'album-dock-item page-item';
                    link.textContent = page.title;
                    pagesContainer.appendChild(link);
                });
            }
        } catch (error) {
            console.log('Pagina\'s nog niet beschikbaar');
        }
        
        // Voeg beide containers toe aan de dock
        dock.appendChild(albumsContainer);
        if (pagesContainer.children.length > 0) {
            dock.appendChild(pagesContainer);
        }
        
    } catch (error) {
        console.error('Fout bij het laden van albums:', error);
    }
}

// Functie om van album te wisselen
async function switchAlbum(albumName) {
    try {
        const response = await fetch(`/api/albums/by-name/${albumName}`);
        if (!response.ok) throw new Error('Fout bij ophalen album');
        
        const album = await response.json();
        if (!album || !album.photos || album.photos.length === 0) {
            console.error('Geen foto\'s gevonden in album');
            return;
        }
        
        // Update globale variabelen
        photos = album.photos;
        currentAlbum = album;
        localStorage.setItem('currentAlbum', albumName);
        showPhoto(0);
        startSlideTimer();

        // Update album beschrijving
        const albumDescription = document.querySelector('.album-description');
        const albumText = albumDescription.querySelector('.album-text');

        if (albumText) albumText.textContent = album.description || '';

        // Toon de beschrijving
        albumDescription.classList.add('show');

        // Verberg de beschrijving na 5 seconden
        setTimeout(() => {
            albumDescription.classList.remove('show');
        }, 5000);
    } catch (error) {
        console.error('Fout bij wisselen van album:', error);
    }
}

// Voeg deze functie toe om de tekstkleur te resetten
function resetTextColors() {
    document.documentElement.style.setProperty('--dynamic-text-color', 'var(--text-color)');
    document.querySelector('.logo').style.removeProperty('color');
    document.querySelectorAll('.btn-icon').forEach(btn => {
        btn.style.removeProperty('color');
    });
    document.querySelectorAll('.album-dock-item').forEach(item => {
        item.style.removeProperty('color');
    });
}

// Update de setupDescriptionToggle functie
function setupDescriptionToggle() {
    const toggleButton = document.getElementById('toggleDescription');
    const carouselContainer = document.querySelector('.carousel-container');
    const albumDescription = document.querySelector('.album-description');
    
    if (!toggleButton || !carouselContainer || !albumDescription) {
        console.error('Benodigde elementen niet gevonden voor description toggle');
        return;
    }

    let isDescriptionVisible = false;

    toggleButton.addEventListener('click', () => {
        console.log('Toggle button clicked');
        isDescriptionVisible = !isDescriptionVisible;
        
        carouselContainer.offsetHeight;
        
        if (isDescriptionVisible) {
            carouselContainer.classList.add('show-description');
            toggleButton.querySelector('i').classList.remove('fa-align-left');
            toggleButton.querySelector('i').classList.add('fa-times');
            resetTextColors(); // Reset naar standaard tekstkleur
            
            if (currentAlbum) {
                const titleElement = albumDescription.querySelector('.album-title');
                const textElement = albumDescription.querySelector('.album-text');
                if (titleElement) titleElement.textContent = currentAlbum.title || '';
                if (textElement) textElement.textContent = currentAlbum.description || '';
            }
        } else {
            carouselContainer.classList.remove('show-description');
            toggleButton.querySelector('i').classList.add('fa-align-left');
            toggleButton.querySelector('i').classList.remove('fa-times');
            // Herbereken de tekstkleur voor de huidige foto
            const currentSlide = document.querySelector('.photo-slide.active');
            if (currentSlide) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = currentSlide.style.backgroundImage.slice(5, -2);
                img.onload = () => {
                    const color = getImageColor(img);
                    const textColor = getContrastColor(color);
                    document.documentElement.style.setProperty('--dynamic-text-color', textColor);
                    document.querySelector('.logo').style.color = textColor;
                    document.querySelectorAll('.btn-icon').forEach(btn => {
                        btn.style.color = textColor;
                    });
                    document.querySelectorAll('.album-dock-item').forEach(item => {
                        item.style.color = textColor;
                    });
                };
            }
        }
    });
}

// Update de DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    setupImageProtection();
    setupAdvancedProtection();
    setupDescriptionToggle();
    
    // Voorkom dat de pagina in cache wordt opgeslagen
    window.onunload = () => {};
    
    // Event listeners voor navigatie
    document.querySelector('.next').addEventListener('click', () => {
        showPhoto(currentPhotoIndex + 1);
    });

    document.querySelector('.prev').addEventListener('click', () => {
        showPhoto(currentPhotoIndex - 1);
    });

    // Keyboard navigatie
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            showPhoto(currentPhotoIndex + 1);
        }
        if (e.key === 'ArrowLeft') {
            showPhoto(currentPhotoIndex - 1);
        }
    });

    // Touch swipe ondersteuning
    let touchStartX = 0;
    const carousel = document.querySelector('.photo-container');

    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        resetSlideTimer();
    });

    carousel.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 50) { // Minimale swipe afstand
            if (diff > 0) {
                showPhoto(currentPhotoIndex + 1);
            } else {
                showPhoto(currentPhotoIndex - 1);
            }
        }
    });

    // Pauzeer timer bij hover over navigatie elementen
    document.querySelectorAll('.carousel-button, .photo-info').forEach(element => {
        element.addEventListener('mouseenter', resetSlideTimer);
        element.addEventListener('mouseleave', startSlideTimer);
    });

    // Start met auth check en laden van albums/foto's
    checkAuth();
    loadAlbums();
    loadPhotos();
});

// Maak logout functie globaal beschikbaar
window.logout = logout; 

async function loadAlbum(albumId) {
    try {
        const response = await fetch(`/api/albums/${albumId}`);
        if (!response.ok) throw new Error('Fout bij laden album');
        
        const album = await response.json();
        currentAlbum = album;
        
        // Update de album beschrijving
        window.updateAlbumDescription(album.title, album.description);
        
        // Laad de foto's van het album
        if (album.photos && album.photos.length > 0) {
            photos = album.photos;
            currentPhotoIndex = 0;
            showCurrentPhoto();
            startSlideshow();
        }
    } catch (error) {
        console.error('Error loading album:', error);
    }
}
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
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (token) {
        try {
            const response = await fetchWithAuth('/api/auth/check');
            if (response.ok) {
                menuDropdown.innerHTML = `
                    <a href="/admin" class="menu-item">
                        <i class="fas fa-cog"></i>Admin
                    </a>
                    <a href="#" class="menu-item" onclick="logout(event)">
                        <i class="fas fa-sign-out-alt"></i>Uitloggen
                    </a>
                `;
                return;
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
        
        // Als we hier komen is de token ongeldig
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
    
    // Niet ingelogd
    menuDropdown.innerHTML = `
        <a href="/login" class="menu-item">
            <i class="fas fa-sign-in-alt"></i>Login
        </a>
    `;
}

// Menu toggle functionaliteit
function setupMenu() {
    const menuButton = document.getElementById('menuButton');
    const menuDropdown = document.getElementById('menuDropdown');
    
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
    });
    
    // Sluit menu bij klik buiten menu
    document.addEventListener('click', (e) => {
        if (!menuDropdown.contains(e.target) && !menuButton.contains(e.target)) {
            menuDropdown.classList.remove('show');
        }
    });
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
    
    // Maak nieuwe foto slide met extra attributen
    const newSlide = document.createElement('div');
    newSlide.className = 'photo-slide';
    newSlide.style.backgroundImage = `url(${photo.path}?v=${viewId})`;
    newSlide.setAttribute('draggable', 'false');
    newSlide.setAttribute('data-protected', 'true');
    newSlide.setAttribute('data-view-id', viewId);
    
    // Voeg random noise toe aan de afbeelding (subtiel)
    newSlide.style.filter = `blur(15px) contrast(1.01) brightness(0.99)`;
    
    // Verwijder oude slides
    const oldSlides = container.querySelectorAll('.photo-slide');
    oldSlides.forEach(slide => {
        if (slide.classList.contains('active')) {
            slide.classList.remove('active');
            slide.classList.add('previous');
        }
    });

    // Laad de afbeelding voor kleuranalyse
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        const bgColor = getImageColor(img);
        const textColor = getContrastColor(bgColor);
        
        document.documentElement.style.setProperty('--adaptive-text-color', textColor);
        
        requestAnimationFrame(() => {
            newSlide.classList.add('active');
            setTimeout(() => {
                oldSlides.forEach(slide => {
                    slide.remove();
                });
            }, 800);
        });
    };
    img.src = photo.path + '?v=' + viewId;
    
    container.appendChild(newSlide);
    
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
        const response = await fetch('/api/albums');
        if (!response.ok) throw new Error('Fout bij ophalen albums');
        
        const albums = await response.json();
        const dock = document.querySelector('.album-dock');
        const currentAlbum = localStorage.getItem('currentAlbum') || 'home';
        
        // Maak de dock leeg
        dock.innerHTML = '';
        
        // Filter albums die we willen tonen (bijvoorbeeld niet het admin album)
        const filteredAlbums = albums.filter(album => album.title !== 'admin');
        
        // Sorteer albums met 'home' eerst, daarna op order
        filteredAlbums.sort((a, b) => {
            if (a.title.toLowerCase() === 'home') return -1;
            if (b.title.toLowerCase() === 'home') return 1;
            return a.order - b.order || a.title.localeCompare(b.title);
        });
        
        // Maak dock items
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
            
            dock.appendChild(link);
        });
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
        
        // Update globale photos array en start nieuwe slideshow
        photos = album.photos;
        localStorage.setItem('currentAlbum', albumName);
        showPhoto(0);
        startSlideTimer();

        // Update album beschrijving
        const albumDescription = document.querySelector('.album-description');
        const albumTitle = albumDescription.querySelector('.album-title');
        const albumText = albumDescription.querySelector('.album-text');

        if (albumTitle) albumTitle.textContent = album.title;
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

// Initialisatie
document.addEventListener('DOMContentLoaded', () => {
    setupImageProtection();
    setupAdvancedProtection();
    setupMenu();
    
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
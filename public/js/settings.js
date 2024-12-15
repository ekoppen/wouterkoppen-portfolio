import { showMessage } from './ui.js';
import { fetchWithAuth } from './api.js';

// Standaard instellingen
const defaultSettings = {
    siteTitle: 'Wouter Koppen',
    siteDescription: 'Fotografie portfolio van Wouter Koppen',
    footerText: '© 2024 Wouter Koppen',
    defaultTheme: 'light',
    photosPerPage: 24,
    defaultPhotoView: 'grid',
    autoThumbnails: true,
    maxThumbnailSize: 400,
    photoCompression: 85
};

// Laad instellingen bij het laden van de pagina
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
});

// Laad instellingen van de server
async function loadSettings() {
    try {
        const response = await fetchWithAuth('/api/settings');
        if (!response.ok) throw new Error('Fout bij laden instellingen');
        
        const settings = await response.json();
        applySettings(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        showMessage('Fout bij laden van instellingen', 'error');
        // Gebruik standaard instellingen als fallback
        applySettings(defaultSettings);
    }
}

// Pas instellingen toe op de formuliervelden
function applySettings(settings) {
    // Algemene instellingen
    document.getElementById('siteTitle').value = settings.siteTitle || defaultSettings.siteTitle;
    document.getElementById('siteDescription').value = settings.siteDescription || defaultSettings.siteDescription;
    document.getElementById('footerText').value = settings.footerText || defaultSettings.footerText;
    
    // Weergave instellingen
    document.getElementById('defaultTheme').value = settings.defaultTheme || defaultSettings.defaultTheme;
    document.getElementById('photosPerPage').value = settings.photosPerPage || defaultSettings.photosPerPage;
    document.getElementById('defaultPhotoView').value = settings.defaultPhotoView || defaultSettings.defaultPhotoView;
    
    // Optimalisatie instellingen
    document.getElementById('autoThumbnails').checked = settings.autoThumbnails ?? defaultSettings.autoThumbnails;
    document.getElementById('maxThumbnailSize').value = settings.maxThumbnailSize || defaultSettings.maxThumbnailSize;
    document.getElementById('photoCompression').value = settings.photoCompression || defaultSettings.photoCompression;
    document.getElementById('compressionValue').textContent = `${settings.photoCompression || defaultSettings.photoCompression}%`;
}

// Event listeners voor interactieve elementen
function setupEventListeners() {
    // Update compressie waarde tijdens sliden
    const compressionSlider = document.getElementById('photoCompression');
    compressionSlider.addEventListener('input', (e) => {
        document.getElementById('compressionValue').textContent = `${e.target.value}%`;
    });

    // Validatie voor numerieke velden
    document.getElementById('photosPerPage').addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        if (value < 12) e.target.value = 12;
        if (value > 100) e.target.value = 100;
    });

    document.getElementById('maxThumbnailSize').addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        if (value < 200) e.target.value = 200;
        if (value > 1000) e.target.value = 1000;
    });
}

// Reset instellingen naar standaardwaarden
window.resetSettings = function() {
    if (confirm('Weet je zeker dat je alle instellingen wilt resetten naar de standaardwaarden?')) {
        applySettings(defaultSettings);
        showMessage('Instellingen gereset naar standaardwaarden');
    }
};

// Sla instellingen op
window.saveSettings = async function() {
    const settings = {
        siteTitle: document.getElementById('siteTitle').value,
        siteDescription: document.getElementById('siteDescription').value,
        footerText: document.getElementById('footerText').value,
        defaultTheme: document.getElementById('defaultTheme').value,
        photosPerPage: parseInt(document.getElementById('photosPerPage').value),
        defaultPhotoView: document.getElementById('defaultPhotoView').value,
        autoThumbnails: document.getElementById('autoThumbnails').checked,
        maxThumbnailSize: parseInt(document.getElementById('maxThumbnailSize').value),
        photoCompression: parseInt(document.getElementById('photoCompression').value)
    };

    try {
        const response = await fetchWithAuth('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Fout bij opslaan instellingen');
        
        showMessage('Instellingen succesvol opgeslagen');
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('Fout bij opslaan van instellingen', 'error');
    }
}; 
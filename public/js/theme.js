import { fetchWithAuth } from './api.js';

// Functie om het actieve thema op te halen
async function getActiveTheme() {
    try {
        const response = await fetchWithAuth('/api/themes/active');
        if (!response.ok) {
            throw new Error('Geen actief thema gevonden');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading theme:', error);
        return null;
    }
}

// Functie om CSS variabelen te updaten met thema kleuren
function applyTheme(theme) {
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Main colors
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-danger', theme.colors.danger);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-info', theme.colors.info);

    // Neutral colors
    root.style.setProperty('--color-white', theme.colors.white);
    root.style.setProperty('--color-gray-100', theme.colors.gray100);
    root.style.setProperty('--color-gray-200', theme.colors.gray200);
    root.style.setProperty('--color-gray-300', theme.colors.gray300);
    root.style.setProperty('--color-gray-400', theme.colors.gray400);
    root.style.setProperty('--color-gray-500', theme.colors.gray500);
    root.style.setProperty('--color-gray-600', theme.colors.gray600);
    root.style.setProperty('--color-gray-700', theme.colors.gray700);
    root.style.setProperty('--color-gray-800', theme.colors.gray800);
    root.style.setProperty('--color-gray-900', theme.colors.gray900);
    root.style.setProperty('--color-black', theme.colors.black);

    // Derived colors
    root.style.setProperty('--text-primary', theme.colors.gray900);
    root.style.setProperty('--text-secondary', theme.colors.gray600);
    root.style.setProperty('--text-muted', theme.colors.gray500);
    root.style.setProperty('--text-light', theme.colors.white);
    
    root.style.setProperty('--bg-body', theme.colors.gray100);
    root.style.setProperty('--bg-surface', theme.colors.white);
    root.style.setProperty('--bg-surface-hover', theme.colors.gray100);
    
    root.style.setProperty('--border-color', theme.colors.gray200);
    root.style.setProperty('--border-color-hover', theme.colors.gray300);
}

// Functie om het thema te initialiseren
async function initializeTheme() {
    const theme = await getActiveTheme();
    if (theme) {
        applyTheme(theme);
    }
}

export {
    getActiveTheme,
    applyTheme,
    initializeTheme
}; 
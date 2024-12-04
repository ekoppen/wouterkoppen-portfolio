document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    const currentPath = window.location.pathname;

    // Laad foto's gebaseerd op de huidige pagina
    if (currentPath === '/') {
        loadPhotos();
    } else if (currentPath.startsWith('/themes/')) {
        const theme = currentPath.split('/').pop();
        loadPhotos(theme);
    } else if (currentPath === '/admin') {
        initializeAdmin();
    }
});

async function loadPhotos(theme = null) {
    try {
        const url = theme ? `/api/photos/${theme}` : '/api/photos';
        const response = await fetch(url);
        const photos = await response.json();
        
        const gallery = document.querySelector('.gallery');
        gallery.innerHTML = '';
        
        photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.path;
            img.alt = photo.filename;
            img.loading = 'lazy';
            gallery.appendChild(img);
        });
    } catch (error) {
        console.error('Fout bij het laden van foto\'s:', error);
        showError('Fout bij het laden van foto\'s');
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('main').insertBefore(errorDiv, document.querySelector('main').firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.querySelector('main').insertBefore(successDiv, document.querySelector('main').firstChild);
    setTimeout(() => successDiv.remove(), 3000);
}

function initializeAdmin() {
    const uploadZone = document.querySelector('.upload-zone');
    const themesList = document.querySelector('.themes-grid');

    // Maak een verborgen file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Drag and drop upload functionaliteit
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        await handleFileUpload(files);
    });

    // Klik op upload zone activeert file input
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selectie
    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            await handleFileUpload(fileInput.files);
            fileInput.value = ''; // Reset input na upload
        }
    });

    // Sorteerbare thema's
    if (themesList) {
        new Sortable(themesList, {
            animation: 150,
            onEnd: async (evt) => {
                const items = Array.from(themesList.children);
                const updates = items.map((item, index) => ({
                    id: item.dataset.id,
                    order: index
                }));

                try {
                    await fetch('/api/photos/reorder', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ updates })
                    });
                } catch (error) {
                    console.error('Fout bij het herordenen:', error);
                    showError('Fout bij het herordenen van foto\'s');
                }
            }
        });
    }
}

async function handleFileUpload(files) {
    const uploadedFiles = Array.from(files);
    let successCount = 0;
    let errorCount = 0;

    for (let file of uploadedFiles) {
        if (!file.type.startsWith('image/')) {
            showError(`${file.name} is geen afbeelding`);
            errorCount++;
            continue;
        }

        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload mislukt');
            }
            
            successCount++;
        } catch (error) {
            console.error('Fout bij uploaden:', error);
            showError(`Fout bij uploaden van ${file.name}: ${error.message}`);
            errorCount++;
        }
    }

    // Toon resultaat
    if (successCount > 0) {
        showSuccess(`${successCount} foto('s) succesvol geüpload`);
        loadPhotos(); // Ververs de galerij
    }
    if (errorCount > 0) {
        showError(`${errorCount} foto('s) konden niet worden geüpload`);
    }
} 
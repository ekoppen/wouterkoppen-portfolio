// UI helper functies
export function showMessage(message, type = 'success') {
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

// LocalStorage helpers
export function getLocalState(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    try {
        return JSON.parse(value);
    } catch (e) {
        return value;
    }
}

export function setLocalState(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

export function showConfirmDialog(callback, options = {}) {
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
export function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

export function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

export function handleDragOver(e) {
    e.preventDefault();
    const albumCard = e.target.closest('.album-card');
    if (albumCard) {
        albumCard.classList.add('drop-target');
    }
}

export function handleDragLeave(e) {
    const albumCard = e.target.closest('.album-card');
    const relatedTarget = e.relatedTarget?.closest('.album-card');
    
    if (albumCard && albumCard !== relatedTarget) {
        albumCard.classList.remove('drop-target');
    }
}

export function handleDrop(e, callback) {
    e.preventDefault();
    
    const albumCard = e.target.closest('.album-card');
    if (!albumCard) return;

    const photoId = e.dataTransfer.getData('text/plain');
    if (!photoId) {
        console.error('No photo ID found in drop event');
        return;
    }

    const albumId = albumCard.dataset.id;
    albumCard.classList.remove('drop-target');
    
    callback(photoId, albumId);
} 
import { auth, saveMoodEntry, getMoodEntries, storage, ref, uploadBytes, getDownloadURL, updateProfile } from './firebase.js';

// Image compression function
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    }));
                }, 'image/jpeg', 0.7);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Initialize DOM elements
const modal = document.getElementById('moodModal');
const closeBtn = document.querySelector('.close-button');
const dayTiles = document.querySelectorAll('.day-tile');
const saveMoodBtn = document.getElementById('saveMood');
const moodButtons = document.querySelectorAll('.mood-btn');
const noteInput = document.getElementById('moodNote');
const tabButtons = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');
const moodFilter = document.getElementById('moodFilter');
const searchNotes = document.getElementById('searchNotes');

// Modal elements
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');
const editNoteInput = document.getElementById('editNoteInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

let currentDate = new Date();
let selectedDate = null;
let selectedMood = null;
let currentEditEntry = null;
let currentDeleteEntry = null;

function generateCalendar(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startingDayIndex = firstDay.getDay();
    const monthLength = lastDay.getDate();
    
    // Update month display
    const monthDisplay = document.getElementById('monthDisplay');
    monthDisplay.textContent = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    
    // Clear existing calendar
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = '';
    
    // Add empty tiles for days before the first day of the month
    for (let i = 0; i < startingDayIndex; i++) {
        const emptyTile = document.createElement('div');
        emptyTile.className = 'day-tile inactive';
        calendarGrid.appendChild(emptyTile);
    }

    // Add tiles for each day of the month
    for (let day = 1; day <= monthLength; day++) {
        const tile = document.createElement('div');
        tile.className = 'day-tile';
        tile.textContent = day;
        
        const tileDate = new Date(date.getFullYear(), date.getMonth(), day);
        const dateStr = tileDate.toISOString().split('T')[0];
        tile.dataset.date = dateStr;

        // Check if this tile represents today
        const today = new Date();
        if (tileDate.getDate() === today.getDate() && 
            tileDate.getMonth() === today.getMonth() && 
            tileDate.getFullYear() === today.getFullYear()) {
            tile.classList.add('today');
        }

        // Load saved mood if exists
        const savedEntry = localStorage.getItem(dateStr);
        if (savedEntry) {
            const entry = JSON.parse(savedEntry);
            updateTileWithMood(dateStr, entry.mood);
        }

        tile.addEventListener('click', () => handleDayClick(tile));
        calendarGrid.appendChild(tile);
    }
}

function handleDayClick(tile) {
    selectedDate = tile.dataset.date;
    const savedEntry = localStorage.getItem(selectedDate);
    
    if (savedEntry) {
        const entry = JSON.parse(savedEntry);
        selectedMood = entry.mood;
        if (noteInput) noteInput.value = entry.note || '';
        
        moodButtons.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.mood === entry.mood);
        });
    } else {
        selectedMood = null;
        if (noteInput) noteInput.value = '';
        moodButtons.forEach(btn => btn.classList.remove('selected'));
    }
    
    modal.style.display = 'flex';
    // Add animation class
    setTimeout(() => {
        modal.querySelector('.modal-content').classList.add('modal-enter');
    }, 10);
}

// Add this function to handle tab switching
async function switchView(viewName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    views.forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}View`);
    });
    if (viewName === 'history') {
        await updateHistoryView();
    }
}

// Enhanced modal functions
function openEditModal(entry) {
    currentEditEntry = entry;
    editNoteInput.value = entry.note || '';
    editModal.style.display = 'flex';
    setTimeout(() => {
        editModal.querySelector('.modal-content').classList.add('modal-enter');
        editNoteInput.focus();
    }, 10);
}

function closeEditModal() {
    editModal.querySelector('.modal-content').classList.remove('modal-enter');
    setTimeout(() => {
        editModal.style.display = 'none';
        currentEditEntry = null;
    }, 300);
}

function openDeleteModal(entry) {
    currentDeleteEntry = entry;
    deleteModal.style.display = 'flex';
    setTimeout(() => {
        deleteModal.querySelector('.modal-content').classList.add('modal-enter');
    }, 10);
}

function closeDeleteModal() {
    deleteModal.querySelector('.modal-content').classList.remove('modal-enter');
    setTimeout(() => {
        deleteModal.style.display = 'none';
        currentDeleteEntry = null;
    }, 300);
}

// Add this function to update history view
async function updateHistoryView() {
    if (!auth.currentUser) {
        console.log('No user logged in');
        return;
    }

    const entriesList = document.querySelector('.entries-list');
    const contributionGrid = document.getElementById('contributionGrid');
    entriesList.innerHTML = '';
    contributionGrid.innerHTML = '';

    // Create contribution data structure
    const today = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(today.getFullYear() - 1);
    
    // Create contribution cells for the past year
    const days = [];
    for (let d = new Date(yearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }
    
    // Get all entries from Firestore and localStorage
    try {
        const entries = [];
        const moodData = await getMoodEntries(auth.currentUser.uid);
        for (const [date, data] of Object.entries(moodData)) {
            entries.push({
                date: date,
                mood: data.mood,
                note: data.note || '', // Ensure note is never undefined
                timestamp: data.timestamp
            });
        }
        
        const moodIntensities = {
            "😊": 4,
            "😐": 2,
            "😔": 1,
            "😡": 3,
            "😴": 2
        };

        // Also get from localStorage for offline entries
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const entry = JSON.parse(localStorage.getItem(key));
                // Check if entry doesn't already exist from Firestore
                if (!entries.find(e => e.date === key)) {
                    entries.push({ 
                        date: key, 
                        mood: entry.mood,
                        note: entry.note || '', // Ensure note is never undefined
                        timestamp: entry.timestamp
                    });
                }
            }
        }

        // Create contribution cells
        days.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'contribution-cell';
            const dateStr = date.toISOString().split('T')[0];
            const entry = entries.find(e => e.date === dateStr);
            
            if (entry) {
                const intensity = moodIntensities[entry.mood] || 0;
                cell.classList.add(`intensity-${intensity}`);
                
                // Add tooltip
                const noteText = entry.note ? entry.note : 'No note';
                cell.title = `${date.toLocaleDateString()}\n${entry.mood} ${noteText}`;
                
                // Add hover effect
                cell.addEventListener('mouseover', (e) => {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'contribution-tooltip';
                    tooltip.textContent = cell.title;
                    tooltip.style.left = `${e.pageX + 10}px`;
                    tooltip.style.top = `${e.pageY + 10}px`;
                    document.body.appendChild(tooltip);
                });

                cell.addEventListener('mouseout', () => {
                    const tooltip = document.querySelector('.contribution-tooltip');
                    if (tooltip) tooltip.remove();
                });
            } else {
                cell.classList.add('intensity-0');
                cell.title = `No mood recorded for ${date.toLocaleDateString()}`;
            }
            
            contributionGrid.appendChild(cell);
        });
        
        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Apply filters
        const filterMood = moodFilter.value;
        const searchText = searchNotes.value.toLowerCase();
        
        const filteredEntries = entries.filter(entry => {
            const matchesMood = !filterMood || entry.mood === filterMood;
            const matchesSearch = !searchText || 
                (entry.note && entry.note.toLowerCase().includes(searchText));
            return matchesMood && matchesSearch;
        });
        
        // Create entry elements with stagger animation
        filteredEntries.forEach((entry, index) => {
            const entryDate = new Date(entry.timestamp || entry.date);
            const formattedDate = entryDate.toLocaleDateString('default', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const formattedTime = entryDate.toLocaleTimeString('default', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const entryElement = document.createElement('div');
            entryElement.className = 'entry-card';
            entryElement.style.backgroundColor = getMoodColor(entry.mood);
            entryElement.style.animationDelay = `${index * 0.1}s`;
        
            // handling the readmore/less functionality
            const fullNote = entry.note || 'No note';
            const shortNote = fullNote.length > 100 ? fullNote.slice(0, 100) + '...' : fullNote;
            const showReadMore = fullNote.length > 100;

            // Replace the existing entryElement.innerHTML with this updated version:
            entryElement.innerHTML = `
                <div class="entry-mood">${entry.mood}</div>
                <div class="entry-content">
                    <div class="entry-details">
                        <div class="entry-date">${formattedDate}</div>
                        <div class="entry-time">${formattedTime}</div>
                    </div>
                    <div class="entry-note">
                        <span class="short-note">${shortNote}</span>
                        ${showReadMore ? `<span class="full-note" style="display:none;">${fullNote}</span>` : ''}
                        ${showReadMore ? `<button class="read-more-btn">Read more</button>` : ''}
                    </div>
                    <div class="entry-actions">
                        <button class="edit-entry-btn">✏️</button>
                        <button class="remove-entry-btn">🗑️</button>
                    </div>
                </div>
            `;
            if (showReadMore) {
                const readMoreBtn = entryElement.querySelector('.read-more-btn');
                const shortNoteSpan = entryElement.querySelector('.short-note');
                const fullNoteSpan = entryElement.querySelector('.full-note');

                readMoreBtn.addEventListener('click', () => {
                    if (fullNoteSpan.style.display === 'none') {
                        shortNoteSpan.style.display = 'none';
                        fullNoteSpan.style.display = 'inline';
                        readMoreBtn.textContent = 'Read less';
                    } else {
                        shortNoteSpan.style.display = 'inline';
                        fullNoteSpan.style.display = 'none';
                        readMoreBtn.textContent = 'Read more';
                    }
                });
            }


            // Handle Edit functionality with modal
            const editBtn = entryElement.querySelector('.edit-entry-btn');
            editBtn.addEventListener('click', () => {
                openEditModal(entry);
            });

            // Handle Remove functionality with modal
            const removeBtn = entryElement.querySelector('.remove-entry-btn');
            removeBtn.addEventListener('click', () => {
                openDeleteModal(entry);
            });
            
            entriesList.appendChild(entryElement);
        });
    } catch (error) {
        console.error('Error updating history view:', error);
    }
}

// Profile Menu Functions
function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileMenu');
    profileMenu.classList.toggle('active');
}

function handleClickOutside(event) {
    const profileMenu = document.getElementById('profileMenu');
    const profilePicture = document.getElementById('profilePicture');
    
    if (!profileMenu.contains(event.target) && !profilePicture.contains(event.target)) {
        profileMenu.classList.remove('active');
    }
}

async function updateProfilePhoto(file) {
    if (!file) return;
    
    try {
        // Show loading state
        const userAvatar = document.getElementById('userAvatar');
        const userAvatarLarge = document.getElementById('userAvatarLarge');
        userAvatar.style.opacity = '0.5';
        userAvatarLarge.style.opacity = '0.5';

        // Create a unique filename using timestamp
        const fileExtension = file.name.split('.').pop();
        const fileName = `profile_${Date.now()}.${fileExtension}`;
        
        // Create a reference to the file in Firebase Storage
        const storageRef = ref(storage, `users/${auth.currentUser.uid}/profile/${fileName}`);
        
        // Compress image if it's too large
        let imageToUpload = file;
        if (file.size > 500000) { // If larger than 500KB
            imageToUpload = await compressImage(file);
        }

        // Upload with retry logic
        console.log('Starting file upload...');
        let snapshot;
        try {
            snapshot = await uploadBytes(storageRef, imageToUpload);
            console.log('File uploaded successfully');
        } catch (uploadError) {
            console.error('Upload failed, retrying...', uploadError);
            // Retry once after 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));
            snapshot = await uploadBytes(storageRef, imageToUpload);
        }

        // Get the download URL with retry logic
        console.log('Getting download URL...');
        let photoURL;
        try {
            photoURL = await getDownloadURL(snapshot.ref);
            console.log('Got download URL:', photoURL);
        } catch (urlError) {
            console.error('Failed to get URL, retrying...', urlError);
            // Retry once after 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));
            photoURL = await getDownloadURL(snapshot.ref);
        }
        
        // Update the user's profile
        console.log('Updating profile...');
        await updateProfile(auth.currentUser, {
            photoURL: photoURL
        });
        console.log('Profile updated successfully');
        
        // Update UI
        userAvatar.style.opacity = '1';
        userAvatarLarge.style.opacity = '1';
        userAvatar.src = photoURL;
        userAvatarLarge.src = photoURL;

        // Force a reload of the images
        userAvatar.onload = () => console.log('Avatar loaded successfully');
        userAvatarLarge.onload = () => console.log('Large avatar loaded successfully');
        
    } catch (error) {
        console.error('Error updating profile photo:', error);
        
        // Reset opacity
        document.getElementById('userAvatar').style.opacity = '1';
        document.getElementById('userAvatarLarge').style.opacity = '1';
        
        // Show detailed error message
        let errorMessage = 'Failed to update profile photo: ';
        if (error.code === 'storage/unauthorized') {
            errorMessage += 'You are not authorized to upload files.';
        } else if (error.code === 'storage/canceled') {
            errorMessage += 'Upload was canceled.';
        } else if (error.code === 'storage/unknown') {
            errorMessage += 'An unknown error occurred.';
        } else {
            errorMessage += error.message;
        }
        alert(errorMessage);
    }
}

async function updateDisplayName(newName) {
    try {
        await updateProfile(auth.currentUser, {
            displayName: newName
        });
    } catch (error) {
        console.error('Error updating display name:', error);
        alert('Failed to update display name.');
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // Add profile menu event listeners
    const profilePicture = document.getElementById('profilePicture');
    const photoInput = document.getElementById('photoInput');
    const userDisplayName = document.getElementById('userDisplayName');
    
    // Replace your profile menu toggle code with this:
    document.getElementById('profilePicture').addEventListener('click', function(e) {
        e.stopPropagation();
        const menu = document.getElementById('profileMenu');
        const isActive = menu.classList.contains('active');
        menu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('profileMenu');
        const profilePic = document.getElementById('profilePicture');
        if (!profilePic.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
    
    photoInput?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            updateProfilePhoto(e.target.files[0]);
        }
    });
    
    userDisplayName?.addEventListener('blur', (e) => {
        const newName = e.target.textContent.trim();
        if (newName && newName !== auth.currentUser.displayName) {
            updateDisplayName(newName);
        }
    });

    const modal = document.getElementById('moodModal');
    const closeBtn = document.querySelector('.close-button');
    const saveMoodBtn = document.getElementById('saveMood');
    const moodButtons = document.querySelectorAll('.mood-btn');
    const noteInput = document.getElementById('moodNote');

    if (!modal || !closeBtn || !saveMoodBtn || !noteInput) {
        console.error('Required modal elements are missing');
        return;
    }

    // Initialize calendar
    generateCalendar(currentDate);

    // Add month navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
        generateCalendar(currentDate);
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
        generateCalendar(currentDate);
    });

    // Initialize mood buttons
    moodButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedMood = button.dataset.mood;
            moodButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
        });
    });

    // Handle modal close
    closeBtn.addEventListener('click', () => {
        modal.querySelector('.modal-content').classList.remove('modal-enter');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.querySelector('.modal-content').classList.remove('modal-enter');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    });

    // Add tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.dataset.view);
        });
    });

    // Add filter functionality
    moodFilter.addEventListener('change', updateHistoryView);
    searchNotes.addEventListener('input', updateHistoryView);

    // Modal event listeners
    saveEditBtn?.addEventListener('click', async () => {
        if (!currentEditEntry) return;
        
        const newNote = editNoteInput.value.trim();
        currentEditEntry.note = newNote;
        currentEditEntry.timestamp = new Date().toISOString();

        try {
            await saveMoodEntry(auth.currentUser.uid, currentEditEntry.date, currentEditEntry);
            localStorage.setItem(currentEditEntry.date, JSON.stringify(currentEditEntry));
            closeEditModal();
            updateHistoryView();
        } catch (err) {
            console.error("Error saving edited entry:", err);
            alert("Failed to save changes.");
        }
    });

    cancelEditBtn?.addEventListener('click', closeEditModal);

    confirmDeleteBtn?.addEventListener('click', async () => {
        if (!currentDeleteEntry) return;

        try {
            // Delete from Firestore by passing null
            await saveMoodEntry(auth.currentUser.uid, currentDeleteEntry.date, null);
            localStorage.removeItem(currentDeleteEntry.date);
            
            // Update calendar tile
            const tile = document.querySelector(`.day-tile[data-date="${currentDeleteEntry.date}"]`);
            if (tile) {
                tile.textContent = tile.dataset.date.split('-')[2];
                tile.style.backgroundColor = '#e0f7fa';
            }
            
            closeDeleteModal();
            updateHistoryView();
        } catch (err) {
            console.error("Error deleting entry:", err);
            alert("Failed to delete entry.");
        }
    });

    cancelDeleteBtn?.addEventListener('click', closeDeleteModal);

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (editModal.style.display === 'flex') closeEditModal();
            if (deleteModal.style.display === 'flex') closeDeleteModal();
        }
    });

    // Modal close button event listeners
    document.querySelector('.close-edit')?.addEventListener('click', closeEditModal);
    document.querySelector('.close-delete')?.addEventListener('click', closeDeleteModal);

    // Update save functionality to include timestamp
    saveMoodBtn?.addEventListener('click', async function() {
        if (!selectedMood || !selectedDate || !auth.currentUser) {
            alert("Please select a mood and a date.");
            return;
        }

        const moodEntry = {
            mood: selectedMood,
            note: noteInput ? noteInput.value : '',
            timestamp: new Date().toISOString()
        };

        try {
            await saveMoodEntry(auth.currentUser.uid, selectedDate, moodEntry);
            localStorage.setItem(selectedDate, JSON.stringify(moodEntry));
            updateTileWithMood(selectedDate, selectedMood);
            
            // Close modal with animation
            modal.querySelector('.modal-content').classList.remove('modal-enter');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        
            if (document.getElementById('historyView').classList.contains('active')) {
                updateHistoryView();
            }
        } catch (error) {
            console.error("Error saving mood entry:", error);
            alert("Failed to save mood entry.");
        }
    });
});

function getMoodColor(mood) {
    switch (mood) {
        case "😊": return "#A3E4D7";
        case "😐": return "#F9E79F";
        case "😔": return "#F5B7B1";
        case "😡": return "#FADBD8";
        case "😴": return "#D5DBDB";
        default: return "#D5D8DC";
    }
}

function updateTileWithMood(date, mood) {
    const tile = document.querySelector(`.day-tile[data-date="${date}"]`);
    if (tile) {
        tile.textContent = mood;
        tile.style.backgroundColor = getMoodColor(mood);
        tile.classList.add('tile-updated');
        setTimeout(() => {
            tile.classList.remove('tile-updated');
        }, 600);
    }
}
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

let currentDate = new Date();
let selectedDate = null;
let selectedMood = null;

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
        if (noteInput) noteInput.value = entry.note;
        
        moodButtons.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.mood === entry.mood);
        });
    } else {
        selectedMood = null;
        if (noteInput) noteInput.value = '';
        moodButtons.forEach(btn => btn.classList.remove('selected'));
    }
    
    modal.style.display = 'flex';
}

// Add this function to handle tab switching
function switchView(viewName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    views.forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}View`);
    });
    if (viewName === 'history') {
        updateHistoryView();
    }
}

// Add this function to update history view
function updateHistoryView() {
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
    
    // Get all entries from localStorage
    const entries = [];
    const moodIntensities = {
        "😊": 4,
        "😐": 2,
        "😔": 1,
        "😡": 3,
        "😴": 2
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const entry = JSON.parse(localStorage.getItem(key));
            entries.push({ date: key, ...entry });
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
            cell.title = `${date.toLocaleDateString()}\n${entry.mood} ${entry.note || ''}`;
            
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
            entry.note.toLowerCase().includes(searchText);
        return matchesMood && matchesSearch;
    });
    
    // Create entry elements
    filteredEntries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const formattedDate = entryDate.toLocaleDateString('default', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const entryElement = document.createElement('div');
        entryElement.className = 'entry-card';
        entryElement.style.backgroundColor = getMoodColor(entry.mood);
        
        entryElement.innerHTML = `
            <div class="entry-mood">${entry.mood}</div>
            <div class="entry-details">
                <div class="entry-date">${formattedDate}</div>
                <div class="entry-time">${entryDate.toLocaleTimeString()}</div>
            </div>
            <div class="entry-note">${entry.note || 'No note'}</div>
        `;
        
        entriesList.appendChild(entryElement);
    });
}

// Update the DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function() {
    // First, verify all required elements exist
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
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
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

    // Update save functionality to include timestamp
    saveMoodBtn?.addEventListener('click', function() {
        if (!selectedMood || !selectedDate) {
            alert("Please select a mood and a date.");
            return;
        }

        const moodEntry = {
            mood: selectedMood,
            note: noteInput ? noteInput.value : '',
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(selectedDate, JSON.stringify(moodEntry));
        updateTileWithMood(selectedDate, selectedMood);
        modal.style.display = 'none';
        
        if (document.getElementById('historyView').classList.contains('active')) {
            updateHistoryView();
        }
    });
});

function getMoodColor(mood) {
    switch (mood) {
        case "😊": return "#A3E4D7";
        case "😐": return "#F9E79F";
        case "😢": return "#F5B7B1";
        default: return "#D5D8DC";
    }
}

function updateTileWithMood(date, mood) {
    const tile = document.querySelector(`.day-tile[data-date="${date}"]`);
    if (tile) {
        tile.textContent = mood;
        tile.style.backgroundColor = getMoodColor(mood);
    }
}




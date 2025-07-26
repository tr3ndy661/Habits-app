const modal = document.getElementById('moodModal');
const closeBtn = document.querySelector('.close-button');
const dayTiles = document.querySelectorAll('.day-tile');

dayTiles.forEach(tile => {
  tile.addEventListener('click', () => {
    modal.style.display = 'flex';
  });
});

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

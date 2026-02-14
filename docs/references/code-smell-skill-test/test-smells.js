// test file for pipeline plumbing
const COLORS = ['green', 'red', 'blue', 'yellow'];

function lockPads(lock) {
  accepting = !lock; // name says lock, but controls accepting
}

function updateDisplay() {
  document.getElementById('score').textContent = score;
  if (score > best) { best = score; } // mutating state in a display function
  document.getElementById('best').textContent = best;
}

function resetAll() {
  COLORS.forEach(c => { document.querySelector(`[data-color="${c}"]`).classList.remove('lit'); });
  score = 0;
  accepting = false;
}

function stopGame() {
  COLORS.forEach(c => { document.querySelector(`[data-color="${c}"]`).classList.remove('lit'); });
  playing = false;
  accepting = false;
}

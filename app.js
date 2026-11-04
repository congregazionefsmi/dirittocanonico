const BOOKS_CONFIG = {
  LIBRO1: { name: "Libro I - Norme Generali", min: 1, max: 203 },
  LIBRO2: { name: "Libro II - Il Popolo di Dio", min: 204, max: 746 },
  LIBRO3: { name: "Libro III - La Funzione d'Insegnare", min: 747, max: 833 },
  LIBRO4: { name: "Libro IV - La Funzione di Santificare", min: 834, max: 1253 },
  LIBRO5: { name: "Libro V - I Beni Temporali", min: 1254, max: 1310 },
  LIBRO6: { name: "Libro VI - Le Sanzioni Penali", min: 1311, max: 1399 },
  LIBRO7: { name: "Libro VII - I Processi", min: 1400, max: 1752 }
};

let masterDatabase = JSON.parse(localStorage.getItem('cic_txt_database') || 'null');
let currentBookKey = 'LIBRO1';
let currentFontSize = 1.05;
let bookmarks = JSON.parse(localStorage.getItem('cic_bookmarks') || '[]');
let showingBookmarksOnly = false;
let currentSearchTerm = '';

window.addEventListener('DOMContentLoaded', () => {
  if (masterDatabase && masterDatabase.length > 0) {
    renderCanons();
  } else {
    fetch('canon.txt')
      .then(res => {
        if (!res.ok) throw new Error("File non trovato automaticamente");
        return res.text();
      })
      .then(text => parseTextFile(text))
      .catch(() => {
        console.log("In attesa del caricamento manuale di canon.txt");
      });
  }
});

function loadTextFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    parseTextFile(e.target.result);
  };
  reader.readAsText(file);
}

function parseTextFile(rawText) {
  const container = document.getElementById('canonContainer');
  container.innerHTML = `<div class="loader-box"><p>Elaborazione e pulizia dei canoni...</p></div>`;

  setTimeout(() => {
    let sections = rawText.split(/-{3,}/);
    let canonsMap = new Map();

    sections.forEach(sec => {
      let trimmed = sec.trim();
      if (!trimmed) return;

      let matchNum = trimmed.match(/^Can\.\s*(\d+)/i);
      if (matchNum) {
        let id = parseInt(matchNum[1], 10);
        
        // Only process valid canon range 1-1752 and prevent duplicates
        if (id >= 1 && id <= 1752 && !canonsMap.has(id)) {
          let content = trimmed.replace(/^Can\.\s*\d+\s*/i, '').trim();
          
          // Format section markers (§ 1, § 2) and numeric lists (1), 2), etc.) with spacing
          content = content
            .replace(/(\s*§\s*\d+)/g, '\n\n  $1')
            .replace(/(\s*\d+\))\s*/g, '\n\n    $1 ');

          canonsMap.set(id, {
            id: id,
            bookName: getBookNameForCanon(id),
            text: content
          });
        }
      }
    });

    let finalArray = [];
    let customTexts = JSON.parse(localStorage.getItem('cic_custom_texts') || '{}');

    for (let num = 1; num <= 1752; num++) {
      let bName = getBookNameForCanon(num);
      let existing = canonsMap.get(num);

      if (existing) {
        existing.text = customTexts[num] || existing.text;
        finalArray.push(existing);
      } else {
        finalArray.push({
          id: num,
          bookName: bName,
          text: customTexts[num] || `Canone ${num} (${bName}).\n[Testo non presente nel file di testo caricato. Clicca "Modifica" per inserirlo].`
        });
      }
    }

    masterDatabase = finalArray;
    localStorage.setItem('cic_txt_database', JSON.stringify(masterDatabase));
    renderCanons();
    alert(`Caricamento completato! Elaborati ${canonsMap.size} canoni unici.`);
  }, 100);
}

function getBookNameForCanon(num) {
  if (num <= 203) return BOOKS_CONFIG.LIBRO1.name;
  if (num <= 746) return BOOKS_CONFIG.LIBRO2.name;
  if (num <= 833) return BOOKS_CONFIG.LIBRO3.name;
  if (num <= 1253) return BOOKS_CONFIG.LIBRO4.name;
  if (num <= 1310) return BOOKS_CONFIG.LIBRO5.name;
  if (num <= 1399) return BOOKS_CONFIG.LIBRO6.name;
  return BOOKS_CONFIG.LIBRO7.name;
}

function selectBook(bookKey, el) {
  currentBookKey = bookKey;
  showingBookmarksOnly = false;
  if (el) {
    document.querySelectorAll('.book-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
  }
  renderCanons();
}

function renderCanons() {
  if (!masterDatabase) return;
  const container = document.getElementById('canonContainer');
  container.innerHTML = '';
  
  const bookData = BOOKS_CONFIG[currentBookKey];

  let filtered = masterDatabase.filter(canon => {
    const inBook = showingBookmarksOnly || (canon.id >= bookData.min && canon.id <= bookData.max);
    const matchesSearch = !currentSearchTerm || 
      canon.id.toString() === currentSearchTerm ||
      canon.text.toLowerCase().includes(currentSearchTerm.toLowerCase());
    const matchesBookmark = !showingBookmarksOnly || bookmarks.includes(canon.id);
    
    return showingBookmarksOnly ? matchesBookmark : (inBook && matchesSearch);
  });

  document.getElementById('resultsCount').innerText = showingBookmarksOnly 
    ? `Segnalibri salvati (${filtered.length})` 
    : `${bookData.name} (${filtered.length} canoni visualizzati)`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="loader-box">Nessun canone trovato corrispondente ai criteri.</div>`;
    return;
  }

  filtered.forEach(canon => {
    let card = document.createElement('div');
    card.className = 'canon-card';
    card.id = `canon-${canon.id}`;

    let isBookmarked = bookmarks.includes(canon.id);

    card.innerHTML = `
      <div class="canon-header">
        <div>
          <span class="canon-number">Can. ${canon.id}</span>
          <div class="canon-meta">${canon.bookName}</div>
        </div>
        <button onclick="toggleBookmark(${canon.id})" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color: ${isBookmarked ? 'var(--brand-gold)' : '#ccc'}">
          ${isBookmarked ? '★' : '☆'}
        </button>
      </div>
      <div class="canon-body" style="font-size: ${currentFontSize}rem;">
        ${canon.text}
      </div>
      <div class="canon-actions">
        <button onclick="editCanon(${canon.id})">✏️ Modifica</button>
        <button onclick="copyCanon(${canon.id})">📋 Copia</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function editCanon(id) {
  let canonObj = masterDatabase.find(c => c.id === id);
  if (!canonObj) return;

  let newText = prompt(`Modifica il testo per il Canone ${id}:`, canonObj.text);
  if (newText !== null && newText.trim() !== '') {
    canonObj.text = newText.trim();
    let customTexts = JSON.parse(localStorage.getItem('cic_custom_texts') || '{}');
    customTexts[id] = newText.trim();
    localStorage.setItem('cic_custom_texts', JSON.stringify(customTexts));
    localStorage.setItem('cic_txt_database', JSON.stringify(masterDatabase));
    renderCanons();
    alert(`Canone ${id} aggiornato!`);
  }
}

function handleSearch(e) {
  currentSearchTerm = e.target.value.trim().toLowerCase();
  renderCanons();
}

function executeSearch() {
  currentSearchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  renderCanons();
}

function jumpToCanon() {
  const num = parseInt(document.getElementById('canonJumpInput').value.trim());
  if (!num || num < 1 || num > 1752) {
    alert("Inserisci un numero valido tra 1 e 1752.");
    return;
  }

  let targetKey = Object.keys(BOOKS_CONFIG).find(key => {
    let b = BOOKS_CONFIG[key];
    return num >= b.min && num <= b.max;
  });

  if (targetKey) {
    let bookItem = [...document.querySelectorAll('.book-item')].find(el => el.innerText.includes(BOOKS_CONFIG[targetKey].name.split(' - ')[0]));
    selectBook(targetKey, bookItem);
    currentSearchTerm = num.toString();
    renderCanons();
    setTimeout(() => {
      let el = document.getElementById(`canon-${num}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }
}

function resetFilters() {
  currentSearchTerm = '';
  showingBookmarksOnly = false;
  document.getElementById('searchInput').value = '';
  document.getElementById('canonJumpInput').value = '';
  renderCanons();
}

function changeFontSize(delta) {
  currentFontSize += delta * 0.1;
  if (currentFontSize < 0.8) currentFontSize = 0.8;
  if (currentFontSize > 1.5) currentFontSize = 1.5;
  document.querySelectorAll('.canon-body').forEach(el => el.style.fontSize = `${currentFontSize}rem`);
}

function toggleBookmark(canonId) {
  if (bookmarks.includes(canonId)) {
    bookmarks = bookmarks.filter(id => id !== canonId);
  } else {
    bookmarks.push(canonId);
  }
  localStorage.setItem('cic_bookmarks', JSON.stringify(bookmarks));
  renderCanons();
}

function toggleBookmarks() {
  showingBookmarksOnly = !showingBookmarksOnly;
  renderCanons();
}

function copyCanon(id) {
  let canonObj = masterDatabase.find(c => c.id === id);
  if (canonObj) {
    navigator.clipboard.writeText(`Can. ${canonObj.id}\n${canonObj.text}`);
    alert(`Canone ${id} copiato negli appunti!`);
  }
}

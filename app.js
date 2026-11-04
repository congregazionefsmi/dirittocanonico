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
        
        if (id >= 1 && id <= 1752 && !canonsMap.has(id)) {
          let content = trimmed.replace(/^Can\.\s*\d+\s*/i, '').trim();
          
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
          text: customTexts[num] || `Canone ${num} (${bName}).\n[Testo non presente nel file caricato. Clicca "Modifica" per inserirlo].`
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
  currentSearchTerm = '';
  document.getElementById('searchInput').value = '';
  
  if (el) {
    document.querySelectorAll('.book-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
  } else {
    document.querySelectorAll('.book-item').forEach((item, idx) => {
      let keys = ['LIBRO1', 'LIBRO2', 'LIBRO3', 'LIBRO4', 'LIBRO5', 'LIBRO6', 'LIBRO7'];
      if (keys[idx] === bookKey) item.classList.add('active');
      else item.classList.remove('active');
    });
  }
  renderCanons();
}

function highlightText(text, term) {
  if (!term) return escapeHTML(text);
  const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  return escapeHTML(text).replace(regex, '<mark style="background-color: #fff3cd; color: #856404; padding: 0.1rem 0.2rem; border-radius: 3px; border: 1px solid #ffeeba; font-weight: bold;">$1</mark>');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function renderCanons() {
  if (!masterDatabase) return;
  const container = document.getElementById('canonContainer');
  container.innerHTML = '';
  
  const bookData = BOOKS_CONFIG[currentBookKey];
  const isSearching = currentSearchTerm.length > 0;

  let filtered = masterDatabase.filter(canon => {
    const inBook = isSearching || showingBookmarksOnly || (canon.id >= bookData.min && canon.id <= bookData.max);
    
    const matchesSearch = !isSearching || 
      canon.id.toString() === currentSearchTerm ||
      canon.text.toLowerCase().includes(currentSearchTerm);
      
    const matchesBookmark = !showingBookmarksOnly || bookmarks.includes(canon.id);
    
    if (showingBookmarksOnly) return matchesBookmark && matchesSearch;
    return inBook && matchesSearch;
  });

  if (isSearching) {
    document.getElementById('resultsCount').innerText = `Risultati ricerca per "${currentSearchTerm}": ${filtered.length} canoni trovati in totale`;
  } else if (showingBookmarksOnly) {
    document.getElementById('resultsCount').innerText = `Segnalibri salvati (${filtered.length})`;
  } else {
    document.getElementById('resultsCount').innerText = `${bookData.name} (${filtered.length} canoni visualizzati)`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="loader-box">Nessun canone trovato corrispondente ai criteri.</div>`;
    return;
  }

  filtered.forEach(canon => {
    let card = document.createElement('div');
    card.className = 'canon-card';
    card.id = `canon-${canon.id}`;

    let isBookmarked = bookmarks.includes(canon.id);
    let formattedBody = highlightText(canon.text, isSearching && isNaN(currentSearchTerm) ? currentSearchTerm : '');

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
        ${formattedBody}
      </div>
      <div class="canon-actions">
        <button onclick="editCanon(${canon.id})">✏️ Modifica</button>
        <button onclick="copyCanon(${canon.id})">📋 Copia</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function jumpToCanon() {
  const inputVal = document.getElementById('canonJumpInput').value.trim();
  const num = parseInt(inputVal, 10);
  
  if (!num || num < 1 || num > 1752) {
    alert("Inserisci un numero valido tra 1 e 1752.");
    return;
  }

  let targetKey = Object.keys(BOOKS_CONFIG).find(key => {
    let b = BOOKS_CONFIG[key];
    return num >= b.min && num <= b.max;
  });

  if (targetKey) {
    currentBookKey = targetKey;
    showingBookmarksOnly = false;
    currentSearchTerm = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('canonJumpInput').value = '';
    
    selectBook(targetKey, null);

    setTimeout(() => {
      let el = document.getElementById(`canon-${num}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        el.style.borderColor = 'var(--brand-gold)';
        el.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.4)';
        setTimeout(() => {
          el.style.borderColor = 'var(--border-color)';
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        }, 2000);
      }
    }, 100);
  }
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

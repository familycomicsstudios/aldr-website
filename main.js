const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrZEUcAFIiGmzFAjjdUVKWhDSLue_SvTQIxT4ZbhlvBa6yc4l4juAZn3HREfvO0VIv2ms98453VItI/pub?gid=0&single=true&output=csv';
let levels = [];

const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

// Re-render table on input
searchInput.addEventListener('input', renderTable);
sortSelect.addEventListener('change', renderTable);


// Fetch CSV and parse with PapaParse
fetch(sheetUrl)
    .then(res => res.text())
    .then(text => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsed.data.forEach(r => {
            if (!r['ALDR ID']?.trim()) return;

            const victorsRaw = r['Victors'] || '';
            levels.push({
                id: r['ALDR ID'],
                name: r['Level Name'],
                creator: r['Level Creator'],
                punter: parseFloat(r['Punter Scale Difficulty']) || 0,
                skillBalance: parseFloat(r['Skills Balance']) || 0,
                project: r['Project'] || '',
                points: parseFloat(r['List Points']) || 0,
                video: r['Video'] || '',
                notes: r['Notes'] || '',
                levelCode: r['Level Code'] || '',
                victors: victorsRaw ? victorsRaw.split(',').map(v => v.trim()) : [],
                impossible: r['Impossible?'] === '1',
                challenge: r['Challenge?'] === '1'
            });
        });
        renderTable();
    });

document.getElementById('biasSlider').addEventListener('input', () => { 
    updateBiasLabel(); 
    renderTable(); 
}); 
updateBiasLabel();

function displayNumber(num) {
    return (typeof num === 'number') ? num.toFixed(2) : num;
}


function updateBiasLabel() {
    const bias = document.getElementById('biasSlider').value;
    document.getElementById('biasLabel').innerText = `${bias}% Skill / ${100-bias}% Learn`;
}

const showImpossibleEl = document.getElementById('showImpossible');
const showChallengeEl = document.getElementById('showChallenge');

// Re-render table when checkboxes change
showImpossibleEl.addEventListener('change', renderTable);
showChallengeEl.addEventListener('change', renderTable);

function renderTable() {
    const bias = document.getElementById('biasSlider').value;
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const showImpossible = showImpossibleEl.checked;
    const showChallenge = showChallengeEl.checked;
    const searchTerm = searchInput.value.toLowerCase();
    const sortBy = sortSelect.value;

    // Filter levels by checkbox and search
    const filtered = levels.filter(l => {
        if (!showImpossible && l.impossible) return false;
        if (!showChallenge && l.challenge) return false;
        if (searchTerm) {
            const haystack = `${l.name} ${l.creator} ${l.id}`.toLowerCase();
            if (!haystack.includes(searchTerm)) return false;
        }
        return true;
    });

    // Sort levels
    let sorted;
    if (sortBy === 'points') {
        sorted = [...filtered].sort((a, b) => score(b, bias) - score(a, bias));
    } else if (sortBy === 'name') {
        sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'creator') {
        sorted = [...filtered].sort((a, b) => a.creator.localeCompare(b.creator));
    } else if (sortBy === 'id') {
    sorted = [...filtered].sort((a, b) => {
        const idA = parseInt(a.id, 10);
        const idB = parseInt(b.id, 10);
        return idA - idB;
    });
    } else {
        sorted = filtered;
    }

    let index = 1;
    sorted.forEach(l => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700 cursor-pointer';
        row.innerHTML = `<td class='py-2 px-4'>${index++}</td>
                 <td class='py-2 px-4'>${l.id}</td>
                 <td class='py-2 px-4'>${l.name}</td>
                 <td class='py-2 px-4'>${l.creator}</td>
                 <td class='py-2 px-4'>${displayNumber(l.punter)}</td>
                 <td class='py-2 px-4'>${displayNumber(score(l, bias))}</td>`;
        row.addEventListener('click', () => { closeAllModals(); showModal(l); });
        tbody.appendChild(row);
    });
}



function score(level, bias) {
    const skillWeight = bias / 100;
    const skillPoints = level.points * level.skillBalance;
    const learnPoints = level.points * (1 - level.skillBalance);
    return skillPoints * (skillWeight * 2) + learnPoints * ((1 - skillWeight) * 2);
}

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalVideoEmbed = document.getElementById('modalVideoEmbed');
const modalVictors = document.getElementById('modalVictors');

const playerModal = document.getElementById('playerModal');
const playerModalClose = document.getElementById('playerModalClose');

function closeAllModals() {
    modal.classList.add('hidden');
    playerModal.classList.add('hidden');
    rulesModal.classList.add('hidden');
    leaderboardModal.classList.add('hidden');
}


function showModal(level) {
    closeAllModals();
    document.getElementById('modalName').innerText = level.name;

    // Skills Balance
    const skillBalanceContainer = document.getElementById('modalSkillBalanceContainer');
    if (level.skillBalance || level.skillBalance === 0) {
        skillBalanceContainer.style.display = 'block';
        document.getElementById('modalSkillBalance').innerText = displayNumber(level.skillBalance);
    } else {
        skillBalanceContainer.style.display = 'none';
    }

    // Project
    const projectContainer = document.getElementById('modalProjectContainer');
    if (level.project?.trim()) {
        projectContainer.style.display = 'block';
        const projectEl = document.getElementById('modalProject');
        projectEl.href = level.project;
        projectEl.innerText = level.project;
    } else {
        projectContainer.style.display = 'none';
    }

    // Video
    const videoContainer = document.getElementById('modalVideoContainer');
    const videoUrl = convertYoutubeURL(level.video);
    if (videoUrl) {
        modalVideoEmbed.src = videoUrl;
        videoContainer.style.display = 'block';
    } else {
        modalVideoEmbed.src = '';
        videoContainer.style.display = 'none';
    }

    // Notes
    const notesContainer = document.getElementById('modalNotesContainer');
    if (level.notes?.trim()) {
        notesContainer.style.display = 'block';
        document.getElementById('modalNotes').innerText = level.notes;
    } else {
        notesContainer.style.display = 'none';
    }

    // Level Code
    const codeContainer = document.getElementById('modalCodeContainer');
    if (level.levelCode?.trim()) {
        codeContainer.style.display = 'block';
        document.getElementById('modalCode').style.display = 'block';
        document.getElementById('modalCode').value = level.levelCode;
    } else {
        codeContainer.style.display = 'none';
        document.getElementById('modalCode').style.display = 'none';
    }

    // Victors
    const victorsContainer = document.getElementById('modalVictorsContainer');
    modalVictors.innerHTML = '';
    if (level.victors?.length) {
        const ul = document.createElement('ul');
        ul.className = 'list-disc ml-5';
        level.victors.forEach(v => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = v;
            link.className = 'text-blue-400 hover:underline';
            link.addEventListener('click', (e) => { e.preventDefault(); showPlayerModal(v); });
            li.appendChild(link);
            ul.appendChild(li);
        });
        modalVictors.appendChild(ul);
        victorsContainer.style.display = 'block';
    } else {
        victorsContainer.style.display = 'none';
    }

    modal.classList.remove('hidden');
}


function showPlayerModal(playerName) {
    closeAllModals();
    document.getElementById('playerName').innerText = playerName;
    const playerLevels = levels.filter(l => l.victors.includes(playerName));
    document.getElementById('playerPoints').innerText = displayNumber(playerLevels.reduce((acc, l) => acc + l.points, 0));
    document.getElementById('playerLevels').innerText = playerLevels.length;
    const ul = document.getElementById('playerLevelList');
    ul.innerHTML = '';
    playerLevels.forEach(l => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = `${l.name} (${displayNumber(l.points)} pts)`;
        link.className = 'text-blue-400 hover:underline';
        link.addEventListener('click', (e) => { e.preventDefault(); showModal(l); });
        li.appendChild(link);
        ul.appendChild(li);
    });
    playerModal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('hidden'); });
playerModalClose.addEventListener('click', () => playerModal.classList.add('hidden'));
playerModal.addEventListener('click', (e) => { if(e.target === playerModal) playerModal.classList.add('hidden'); });

function convertYoutubeURL(url) {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}

const rulesButton = document.getElementById('rulesButton');
const rulesModal = document.getElementById('rulesModal');
const rulesModalClose = document.getElementById('rulesModalClose');

rulesButton.addEventListener('click', () => rulesModal.classList.remove('hidden'));
rulesModalClose.addEventListener('click', () => rulesModal.classList.add('hidden'));
rulesModal.addEventListener('click', e => { 
    if(e.target === rulesModal) rulesModal.classList.add('hidden'); 
});

const leaderboardButton = document.getElementById('leaderboardButton');
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardModalClose = document.getElementById('leaderboardModalClose');
const leaderboardList = document.getElementById('leaderboardList');

leaderboardButton.addEventListener('click', () => showLeaderboard());
leaderboardModalClose.addEventListener('click', () => leaderboardModal.classList.add('hidden'));
leaderboardModal.addEventListener('click', e => { 
    if(e.target === leaderboardModal) leaderboardModal.classList.add('hidden'); 
});
const leaderboardSelector = document.getElementById('leaderboardSelector');
leaderboardSelector.addEventListener('change', showLeaderboard);

function showLeaderboard() {
    closeAllModals();

    const mode = leaderboardSelector.value; // "casual" or "competitive"

    const playerMap = {};

    levels.forEach(l => {
        l.victors.forEach(player => {
            if (!playerMap[player]) playerMap[player] = [];
            playerMap[player].push(l.points);
        });
    });

    // Compute total points
    const sortedPlayers = Object.entries(playerMap)
        .map(([player, pointsArray]) => {
            let totalPoints;
            if (mode === 'competitive') {
                // Top 5 points only
                totalPoints = pointsArray.sort((a,b) => b-a).slice(0,5).reduce((acc, p) => acc+p, 0);
            } else {
                // Sum all points
                totalPoints = pointsArray.reduce((acc, p) => acc+p, 0);
            }
            return [player, totalPoints];
        })
        .sort((a,b) => b[1]-a[1]); // descending

    // Render list
    leaderboardList.innerHTML = '';
    sortedPlayers.forEach(([player, points], index) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = `${player} (${displayNumber(points)} pts)`;
        link.className = 'text-blue-400 hover:underline';
        link.addEventListener('click', (e) => { 
            e.preventDefault(); 
            showPlayerModal(player); 
        });
        li.appendChild(link);
        leaderboardList.appendChild(li);
    });

    leaderboardModal.classList.remove('hidden');
}


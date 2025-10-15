const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrZEUcAFIiGmzFAjjdUVKWhDSLue_SvTQIxT4ZbhlvBa6yc4l4juAZn3HREfvO0VIv2ms98453VItI/pub?gid=0&single=true&output=csv';
let levels = [];

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

    const filtered = levels.filter(l => {
        if (!showImpossible && l.impossible) return false;
        if (!showChallenge && l.challenge) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => score(b, bias) - score(a, bias));
    let index = 1;
    sorted.forEach(l => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700 cursor-pointer';
        row.innerHTML = `<td class='py-2 px-4'>${index++}</td>
                         <td class='py-2 px-4'>${l.id}</td>
                         <td class='py-2 px-4'>${l.name}</td>
                         <td class='py-2 px-4'>${l.creator}</td>
                         <td class='py-2 px-4'>${l.punter}</td>
                         <td class='py-2 px-4'>${score(l, bias)}</td>`;
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
}

function showModal(level) {
    closeAllModals();
    document.getElementById('modalName').innerText = level.name;

    // Skills Balance
    const skillBalanceContainer = document.getElementById('modalSkillBalanceContainer');
    if (level.skillBalance || level.skillBalance === 0) {
        skillBalanceContainer.style.display = 'block';
        document.getElementById('modalSkillBalance').innerText = level.skillBalance;
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
    document.getElementById('playerPoints').innerText = playerLevels.reduce((acc, l) => acc + l.points, 0);
    document.getElementById('playerLevels').innerText = playerLevels.length;
    const ul = document.getElementById('playerLevelList');
    ul.innerHTML = '';
    playerLevels.forEach(l => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = `${l.name} (${l.points} pts)`;
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

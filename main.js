import { convert, toVisual, formatNumber } from './converter.js';

const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrZEUcAFIiGmzFAjjdUVKWhDSLue_SvTQIxT4ZbhlvBa6yc4l4juAZn3HREfvO0VIv2ms98453VItI/pub?gid=0&single=true&output=csv';
let levels = [];

const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const visualModeCheckbox = document.getElementById('visualMode');

function getYoutubeThumbnail(videoUrl) {
    if (!videoUrl || !videoUrl.trim()) return null;
    
    if (isImageUrl(videoUrl)) return videoUrl; // If it's a direct image URL, use it

    // Handle various YouTube URL formats
    const match = videoUrl.trim().match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
}

function extractVideoId(videoUrl) {
    if (!videoUrl || !videoUrl.trim()) return null;
    
    if (isImageUrl(videoUrl)) return null; // If it's a direct image URL, no video ID to extract

    // Handle various YouTube URL formats
    const match = videoUrl.trim().match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

function isImageUrl(url) {
    return (url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null);
}

function updateTableHeader() {
    const thead = document.querySelector('#levelsTable thead tr');
    const isVisualMode = visualModeCheckbox.checked;
    
    // Reset header
    thead.innerHTML = `
        <th class="py-2 px-4 border-b border-gray-600">#</th>
        <th class="py-2 px-4 border-b border-gray-600">ALDR ID</th>
        ${isVisualMode ? '<th class="py-2 px-4 border-b border-gray-600">Thumbnail</th>' : ''}
        <th class="py-2 px-4 border-b border-gray-600">Level Name</th>
        <th class="py-2 px-4 border-b border-gray-600">Creator</th>
        <th class="py-2 px-4 border-b border-gray-600">Difficulty</th>
        <th class="py-2 px-4 border-b border-gray-600">List Points</th>
    `;
}

// Re-render table on input
searchInput.addEventListener('input', renderTable);
sortSelect.addEventListener('change', renderTable);

document.getElementById('systemSelect')
    .addEventListener('change', () => renderTable());

visualModeCheckbox.addEventListener('change', () => {
    updateTableHeader();
    renderTable();
});

// Initialize table header
updateTableHeader();

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
    console.log("Table rendered")
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

    updateHeaderImage(sorted[0]);

    const isVisualMode = visualModeCheckbox.checked;
    let index = 1;
    sorted.forEach(l => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700 cursor-pointer';
        
        let thumbnailCell = '';
        if (isVisualMode) {
            const thumbnailUrl = getYoutubeThumbnail(l.video);
            if (thumbnailUrl) {
                thumbnailCell = `
                    <td class='py-2 px-4'>
                        <div class="w-48 aspect-video bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                            <span class="text-gray-400 text-xs">Loading...</span>
                        </div>
                    </td>
                `;
            } else {
                thumbnailCell = `
                    <td class='py-2 px-4'>
                        <div class="w-48 aspect-video bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                            <img src="assets/defaultThumbnail.png" alt="Default thumbnail" class="w-full h-full object-cover">
                        </div>
                    </td>
                `;
            }
        }
        
        row.innerHTML = `<td class='py-2 px-4'>${index++}</td>
                 <td class='py-2 px-4'>${l.id}</td>
                 ${thumbnailCell}
                 <td class='py-2 px-4'>${l.name}</td>
                 <td class='py-2 px-4'>${l.creator}</td>
                 <td>${(() => {
      const system = document.getElementById('systemSelect').value;
      const converted = convert(l.punter, 'punter', system);
      return `${formatNumber(converted)} (${toVisual(converted, system)})`;
  })()}
</td>
                 <td class='py-2 px-4'>${displayNumber(score(l, bias))}</td>`;
        row.addEventListener('click', () => { closeAllModals(); showModal(l); });
        tbody.appendChild(row);
        
        // Load thumbnail asynchronously if visual mode is on and video exists
        if (isVisualMode && l.video && l.video.trim()) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                loadThumbnailAsync(row, l.video);
            }, 0);
        }
    });
}

function loadThumbnailAsync(row, videoUrl) {
    // If it's a direct image URL, use it immediately
    if (isImageUrl(videoUrl)) {
        const thumbnailCell = row.querySelector('td:nth-child(3)');
        if (thumbnailCell) {
            const container = thumbnailCell.querySelector('div');
            if (container) {
                container.innerHTML = `<img src="${videoUrl}" alt="Video thumbnail" class="w-full h-full object-cover">`;
            }
        }
        return;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
        // If we can't extract video ID, show default thumbnail
        const thumbnailCell = row.querySelector('td:nth-child(3)');
        if (thumbnailCell) {
            const container = thumbnailCell.querySelector('div');
            if (container) {
                container.innerHTML = '<img src="assets/defaultThumbnail.png" alt="Default thumbnail" class="w-full h-full object-cover">';
            }
        }
        return;
    }
    
    const thumbnailCell = row.querySelector('td:nth-child(3)');
    if (!thumbnailCell) {
        console.warn('Thumbnail cell not found for row');
        return;
    }
    
    const container = thumbnailCell.querySelector('div');
    if (!container) {
        console.warn('Container not found in thumbnail cell');
        return;
    }
    
    // Try multiple thumbnail formats in order of quality
    // Skip sddefault as it often shows placeholder images
    const thumbnailFormats = [
        'maxresdefault',
        'hqdefault',
        'mqdefault'
    ];
    
    let currentFormatIndex = 0;
    
    function tryNextFormat() {
        if (currentFormatIndex >= thumbnailFormats.length) {
            container.innerHTML = '<img src="assets/defaultThumbnail.png" alt="Default thumbnail" class="w-full h-full object-cover">';
            return;
        }
        
        const format = thumbnailFormats[currentFormatIndex];
        const imgUrl = `https://img.youtube.com/vi/${videoId}/${format}.jpg`;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (currentFormatIndex < thumbnailFormats.length - 1) {
                currentFormatIndex++;
                tryNextFormat();
            } else {
                container.innerHTML = '<img src="assets/defaultThumbnail.png" alt="Default thumbnail" class="w-full h-full object-cover">';
            }
        }, 3000);
        
        img.onload = () => {
            clearTimeout(timeout);
            // Verify the image actually loaded and isn't a placeholder
            // Check if image dimensions are reasonable (not 120x90 which is placeholder size)
            if (img.naturalWidth > 120 || img.naturalHeight > 90) {
                container.innerHTML = `<img src="${imgUrl}" alt="Video thumbnail" class="w-full h-full object-cover">`;
            } else {
                // Likely a placeholder, try next format
                clearTimeout(timeout);
                currentFormatIndex++;
                setTimeout(tryNextFormat, 50);
            }
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            currentFormatIndex++;
            // Try next format with a small delay to avoid rate limiting
            setTimeout(tryNextFormat, 50);
        };
        
        img.src = imgUrl;
    }
    
    tryNextFormat();
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

    // find all levels where player appears in victors
    const playerLevels = levels.filter(l => 
        l.victors.some(v => v.toLowerCase() === playerName.toLowerCase())
    );

    // sort levels by List Points (descending)
    const sortedLevels = [...playerLevels].sort((a, b) => b.points - a.points);

    // calculate totals
    document.getElementById('playerPoints').innerText = displayNumber(
        sortedLevels.reduce((acc, l) => acc + l.points, 0)
    );
    document.getElementById('playerLevels').innerText = sortedLevels.length;

    // render level list
    const ul = document.getElementById('playerLevelList');
    ul.innerHTML = '';
    sortedLevels.forEach(l => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = `${l.name} (${displayNumber(l.points)} pts)`;
        link.className = 'text-blue-400 hover:underline';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showModal(l);
        });
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
    if (!url || !url.trim() || isImageUrl(url)) return '';
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
                const sorted = [...pointsArray].sort((a,b) => b - a);
                let multiplier = 1;
                totalPoints = 0;
                sorted.forEach(p => {
                    totalPoints += p * multiplier;
                    multiplier *= 0.7; // Competitive multiplier
                });
            } else if (mode === 'casual') {
                const sorted = [...pointsArray].sort((a,b) => b - a);
                let multiplier = 1;
                totalPoints = 0;
                sorted.forEach(p => {
                    totalPoints += p * multiplier;
                    multiplier *= 0.9; // Casual multiplier
                });
            } else if (mode === 'levelsBeaten') {
                totalPoints = pointsArray.length; // +1 per level beaten
            } else {
                totalPoints = pointsArray.reduce((acc, p) => acc + p, 0); // Fallback to sum for unknown modes
            }
            return [player, totalPoints];
        })
        .sort((a, b) => b[1] - a[1]);

    // Render list
    leaderboardList.innerHTML = '';
    sortedPlayers.forEach(([player, points], index) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        const displayedPoints = (mode === 'levelsBeaten') ? Math.round(points) : displayNumber(points);
        const pointLabel = (mode === 'levelsBeaten') ? (displayedPoints === 1 ? 'level' : 'levels') : 'pts';
        link.textContent = `${player} (${displayedPoints} ${pointLabel})`;
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

const completionModal = document.getElementById('completionModal');
const completionModalClose = document.getElementById('completionModalClose');
const openCompletionModal = document.getElementById('openCompletionModal');
const completionForm = document.getElementById('completionForm');
const completionStatus = document.getElementById('completionStatus');

const DISCORD_WEBHOOK_URL = 
    ["https://", "discordapp.com", "api", "webhooks", "1444851149898518548", "WkkPgm3kkdE9QTTXCAAjdOpJzWZNAQGkfxWsZytQnvXfaXsBVZm2Z4Nh2G78IWBg_quo"]
    .join("/")
    .replace("//discord", "/discord");


openCompletionModal.addEventListener('click', () => {
    completionModal.classList.remove('hidden');
    completionStatus.textContent = '';
});

completionModalClose.addEventListener('click', () => completionModal.classList.add('hidden'));
completionModal.addEventListener('click', e => {
    if (e.target === completionModal) completionModal.classList.add('hidden');
});

completionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const aldrId = document.getElementById('aldrId').value.trim();
    const proof = document.getElementById('proof').value.trim();
    const notes = document.getElementById('notes').value.trim();

    // Lookup level by ID
    const level = levels.find(l => l.id === aldrId);
    if (!level) {
        completionStatus.textContent = "❌ Invalid ALDR ID!";
        return;
    }

    completionStatus.textContent = "Sending...";

    try {
        if (proof.length >= 100) {
            // Send proof as file
            const blob = new Blob([proof], { type: "text/plain" });
            const formData = new FormData();
            formData.append("payload_json", JSON.stringify({
                content: `**New Completion Submission**\n**Username:** ${username}\n**Level:** ${level.id} - ${level.name}\n**Notes:** ${notes || "(none)"}`
            }));
            formData.append("file", blob, `proof_${username}_${aldrId}.txt`);
            await fetch(DISCORD_WEBHOOK_URL, { method: "POST", body: formData });
        } else {
            // Send as regular message
            await fetch(DISCORD_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: `**New Completion Submission**\n**Username:** ${username}\n**Level:** ${level.id} - ${level.name}\n**Proof:** ${proof}\n**Notes:** ${notes || "(none)"}`
                })
            });
        }

        completionStatus.textContent = "✅ Submission sent successfully!";
        completionForm.reset();
    } catch (err) {
        console.error(err);
        completionStatus.textContent = "❌ Failed to send submission.";
    }
});

async function updateHeaderImage(topLevel) {
    if (!topLevel || !topLevel.id) return;

    const imgUrl = `backgrounds/${topLevel.id}.png`;

    console.log("Header image updated")

    // Check if the file exists
    try {
        const res = await fetch(imgUrl, { method: "HEAD" });
        if (!res.ok) return; // image missing → do nothing

        // Apply the image
        const header = document.getElementById('dynamicHeader');
        header.style.backgroundImage = `url('${imgUrl}')`;

        // Remove fallback text overlay if present
        if (header.firstElementChild) header.firstElementChild.style.display = "none";

    } catch (e) {
        console.warn("Header image missing for ID:", topLevel.id);
    }
}


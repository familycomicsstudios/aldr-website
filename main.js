import { convert, toVisual, formatNumber, formatPunterNumber } from './converter.js';

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
      if (system === 'grassy') {
        const difficultyText = toVisual(converted, system);
        if (isVisualMode) {
          return `<img src="assets/grassy-scale/${difficultyText}.svg" alt="${difficultyText}" class="h-24 inline-block" onerror="this.outerHTML='${difficultyText}'" />`;
        }
        return difficultyText;
      }
            const numericText = system === 'punter' ? formatPunterNumber(converted) : formatNumber(converted);
            return `${toVisual(converted, system)} (${numericText})`;
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
    
    // Hide the profile card when opening a new player
    document.getElementById('profileCardContainer').classList.add('hidden');

    // find all levels where player appears in victors
    const playerLevels = levels.filter(l => 
        l.victors.some(v => v.toLowerCase() === playerName.toLowerCase())
    );

    // sort levels by List Points (descending)
    const sortedLevels = [...playerLevels].sort((a, b) => b.points - a.points);

    // calculate totals
    const totalPoints = sortedLevels.reduce((acc, l) => acc + l.points, 0);
    const skill = calculateSkill(playerLevels);
    document.getElementById('playerPoints').innerText = displayNumber(totalPoints);
    document.getElementById('playerLevels').innerText = sortedLevels.length;
    document.getElementById('playerSkill').innerText = displayNumber(skill);

    const levelFilter = document.getElementById('playerLevelFilter');
    const levelListLabel = document.getElementById('playerLevelListLabel');
    levelFilter.value = 'cleared';

    const renderPlayerLevelList = () => {
        const showUncleared = levelFilter.value === 'uncleared';
        const ul = document.getElementById('playerLevelList');
        ul.innerHTML = '';

        const listLevels = showUncleared
            ? levels.filter(l => !l.victors.some(v => v.toLowerCase() === playerName.toLowerCase()))
            : sortedLevels;

        const sortedListLevels = [...listLevels].sort((a, b) => b.points - a.points);
        levelListLabel.textContent = showUncleared ? 'Levels (Uncleared):' : 'Levels (Cleared):';

        sortedListLevels.forEach(l => {
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
    };

    levelFilter.onchange = renderPlayerLevelList;
    renderPlayerLevelList();

    // Setup profile card button
    const makeProfileCardBtn = document.getElementById('makeProfileCardBtn');
    makeProfileCardBtn.onclick = () => generateProfileCard(playerName, playerLevels);

    playerModal.classList.remove('hidden');
}

async function fetchScratchUserData(scratchUsername) {
    try {
        // Use codetabs.com proxy which is free and reliable
        const targetUrl = `https://api.scratch.mit.edu/users/${scratchUsername}`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        
        console.log('Fetching Scratch user data via codetabs');
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            const scratchData = await response.json();
            console.log('Scratch data fetched successfully');
            return scratchData;
        } else {
            console.log('Scratch API proxy failed with status:', response.status);
            return null;
        }
    } catch (e) {
        console.error('Error fetching from codetabs:', e.message);
        return null;
    }
}

// Generate profile card image
async function generateProfileCard(playerName, playerLevels) {
    try {
        console.log('Generating profile card for:', playerName);
        
        // Find user data from sheet using Papa.parse like the main levels loading
        let scratchUsername = null;
        let avatarUrl = null;
        
        try {
            console.log('Fetching sheet for user data...');
            const response = await fetch(sheetUrl);
            const text = await response.text();
            
            console.log('Parsing sheet with Papa.parse...');
            const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
            console.log('Sheet parsed, found', parsed.data.length, 'rows');
            
            // Find the user by Tracker Username column
            for (let row of parsed.data) {
                console.log('Checking row - Tracker Username:', row['Tracker Username'], 'Scratch Username:', row['Scratch Username']);
                if (row['Tracker Username']?.toLowerCase() === playerName.toLowerCase()) {
                    // Try to get Scratch Username, fall back to playerName if empty or missing
                    const scratchField = row['Scratch Username']?.trim();
                    scratchUsername = (scratchField && scratchField.length > 0) ? scratchField : playerName;
                    console.log('Found user! Scratch Username:', scratchUsername);
                    break;
                }
            }
            
            // If user not found in sheet, use playerName as fallback
            if (!scratchUsername) {
                scratchUsername = playerName;
            }
        } catch (e) {
            console.error('Error fetching/parsing sheet for user data:', e);
        }
        
        console.log('Final Scratch Username:', scratchUsername);
        
        // Get Scratch avatar if we have a username
        if (scratchUsername) {
            try {
                console.log('Fetching Scratch user data for:', scratchUsername);
                const scratchData = await fetchScratchUserData(scratchUsername);
                if (scratchData) {
                    console.log('Scratch API response:', scratchData);
                    if (scratchData.profile && scratchData.profile.images && scratchData.profile.images['90x90']) {
                        // Use the 90x90 image directly - it's the native square format
                        avatarUrl = scratchData.profile.images['90x90'].split('?')[0];
                        console.log('Got Scratch avatar URL:', avatarUrl);
                    }
                } else {
                    console.log('Scratch API request failed for:', scratchUsername);
                }
            } catch (e) {
                console.error('Error fetching Scratch user data:', e);
            }
        }
        
        console.log('Final avatar URL:', avatarUrl);
        
        // Calculate stats
        const sortedByPunter = [...playerLevels].sort((a, b) => b.punter - a.punter);
        const hardestLevel = sortedByPunter[0];
        const totalPoints = playerLevels.reduce((acc, l) => acc + l.points, 0);
        const skill = calculateSkill(playerLevels);
        
        // Calculate weighted points (Casual: 90% multiplier stacking, Competitive: 70% multiplier stacking)
        let casualWeighted = 0, competitiveWeighted = 0;
        const sortedByPoints = [...playerLevels].sort((a, b) => b.points - a.points);
        
        let casualMultiplier = 1, competitiveMultiplier = 1;
        sortedByPoints.forEach(l => {
            casualWeighted += l.points * casualMultiplier;
            casualMultiplier *= 0.9;
            
            competitiveWeighted += l.points * competitiveMultiplier;
            competitiveMultiplier *= 0.7;
        });
        
        // Calculate percentage at each Punter difficulty
        const difficultyBreakdown = calculateDifficultyBreakdown(playerLevels);
        
        // Calculate rankings by comparing against all other players
        const rankings = calculatePlayerRankings(playerName);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 650;
        canvas.height = 315;
        const ctx = canvas.getContext('2d');

        // Load stat icons before drawing
        await loadStatIcons();
        
        // Background (gradient)
        const bgGradient = ctx.createLinearGradient(0, 0, 650, 315);
        bgGradient.addColorStop(0, '#0f172a');
        bgGradient.addColorStop(0.5, '#1e293b');
        bgGradient.addColorStop(1, '#0b1020');
        ctx.fillStyle = bgGradient;
        drawRoundedRect(ctx, 0, 0, 650, 315, 22, true, false);
        
        // Inner card panel
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        drawRoundedRect(ctx, 12, 12, 626, 291, 18, true, false);
        
        // Accent border removed
        
        // Draw profile card text and attempt to load avatar
        drawProfileCardText(ctx, playerName, hardestLevel, playerLevels.length, totalPoints, casualWeighted, competitiveWeighted, skill, difficultyBreakdown, rankings);
        
        // Try to load and draw avatar
        if (avatarUrl) {
            try {
                const img = new Image();
                img.onload = () => {
                    console.log('Avatar image loaded successfully');
                    // Draw square avatar background
                    ctx.fillStyle = '#333';
                    ctx.fillRect(30, 30, 100, 100);
                    ctx.strokeStyle = '#4a9eff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(30, 30, 100, 100);
                    
                    // Draw image
                    ctx.drawImage(img, 30, 30, 100, 100);
                    
                    displayCanvas(canvas, playerName);
                };
                img.onerror = () => {
                    console.log('Avatar image failed to load');
                    // If avatar fails to load, just display card without it
                    displayCanvas(canvas, playerName);
                };
                // Note: Setting src will trigger onload/onerror
                console.log('Starting avatar image load from:', avatarUrl);
                img.src = avatarUrl;
                
                // Set a timeout in case image loading hangs
                setTimeout(() => {
                    if (!img.complete) {
                        console.log('Avatar image load timeout - displaying card without avatar');
                        displayCanvas(canvas, playerName);
                    }
                }, 3000);
            } catch (e) {
                console.log('Error loading avatar:', e.message);
                displayCanvas(canvas, playerName);
            }
        } else {
            console.log('No avatar URL - displaying card without avatar');
            displayCanvas(canvas, playerName);
        }
    } catch (error) {
        console.error('Error generating profile card:', error);
        alert('Error generating profile card. Check console for details.');
    }
}

function drawProfileCardText(ctx, playerName, hardestLevel, levelCount, totalPoints, casualWeighted, competitiveWeighted, skill, difficultyBreakdown, rankings) {
    // Username
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 34px "Trebuchet MS", "Segoe UI", Arial';
    ctx.fillText(playerName, 180, 80);
    
    // Hardest completion
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px "Trebuchet MS", "Segoe UI", Arial';
    const hardestLabel = 'Hardest:';
    const labelWidth = ctx.measureText(hardestLabel).width;
    ctx.fillText(hardestLabel, 180, 120);
    ctx.font = '16px "Trebuchet MS", "Segoe UI", Arial';
    const valueX = 180 + labelWidth + 8;
    if (hardestLevel) {
        ctx.fillText(`${hardestLevel.name} (${hardestLevel.punter.toFixed(2)})`, valueX, 120);
    } else {
        ctx.fillText('N/A', valueX, 120);
    }
    
    // Stats (Left Column)
    ctx.font = 'bold 16px "Trebuchet MS", "Segoe UI", Arial';
    ctx.fillStyle = '#7dd3fc';
    let y = 160;
    const lineHeight = 28;
    const iconX = 30;
    const iconSize = 20;
    const iconPadding = 10;
    const textX = iconX + iconSize + iconPadding;

    // Icons + labels (Left Column)
    drawStatIcon(ctx, iconX, y - 14, iconSize, 'trophy');
    ctx.fillText(`Levels Beaten: ${levelCount}`, textX, y);
    y += lineHeight;
    drawStatIcon(ctx, iconX, y - 14, iconSize, 'graph');
    ctx.fillText(`Total List Points: ${totalPoints.toFixed(0)}`, textX, y);
    y += lineHeight;
    drawStatIcon(ctx, iconX, y - 14, iconSize, 'map');
    ctx.fillText(`Casual Points: ${casualWeighted.toFixed(0)}`, textX, y);
    y += lineHeight;
    drawStatIcon(ctx, iconX, y - 14, iconSize, 'clipboard');
    ctx.fillText(`Competitive Points: ${competitiveWeighted.toFixed(0)}`, textX, y);
    y += lineHeight;
    drawStatIcon(ctx, iconX, y - 14, iconSize, 'graph');
    ctx.fillText(`Skill: ${skill.toFixed(2)}`, textX, y);
    
    // Rankings (Right Column)
    ctx.font = 'bold 14px "Trebuchet MS", "Segoe UI", Arial';
    ctx.fillStyle = '#f8fafc';
    y = 160;

    drawRankPill(ctx, 330, y - 16, `Levels Rank`, `#${rankings.levelsBeatnRank}`);
    y += lineHeight;
    drawRankPill(ctx, 330, y - 16, `Total Pts Rank`, `#${rankings.totalPtsRank}`);
    y += lineHeight;
    drawRankPill(ctx, 330, y - 16, `Casual Rank`, `#${rankings.casualRank}`);
    y += lineHeight;
    drawRankPill(ctx, 330, y - 16, `Competitive Rank`, `#${rankings.competitiveRank}`);
    y += lineHeight;
    drawRankPill(ctx, 330, y - 16, `Skill Rank`, `#${rankings.skillRank}`);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

const statIconPaths = {
    trophy: 'assets/icons/trophy.svg',
    graph: 'assets/icons/graph-up.svg',
    map: 'assets/icons/map.svg',
    clipboard: 'assets/icons/clipboard-check.svg'
};

const statIcons = {};
let statIconsLoaded = false;

async function loadStatIcons() {
    if (statIconsLoaded) return;
    const entries = Object.entries(statIconPaths);
    await Promise.all(entries.map(([key, src]) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            statIcons[key] = img;
            resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
    })));
    statIconsLoaded = true;
}

function drawStatIcon(ctx, x, y, size, type) {
    const img = statIcons[type];
    if (img) {
        const offscreen = document.createElement('canvas');
        offscreen.width = size;
        offscreen.height = size;
        const octx = offscreen.getContext('2d');
        octx.drawImage(img, 0, 0, size, size);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, size, size);
        ctx.drawImage(offscreen, x, y);
        return;
    }
    // Fallback placeholder
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillRect(x, y, size, size);
    ctx.restore();
}

function drawRankPill(ctx, x, y, label, value) {
    ctx.save();
    const width = 260;
    const height = 24;
    const pillGradient = ctx.createLinearGradient(x, y, x + width, y);
    pillGradient.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
    pillGradient.addColorStop(1, 'rgba(167, 139, 250, 0.18)');
    ctx.fillStyle = pillGradient;
    drawRoundedRect(ctx, x, y, width, height, 12, true, false);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, width, height, 12, false, true);
    ctx.fillStyle = '#cbd5f5';
    ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", Arial';
    ctx.fillText(label, x + 10, y + 16);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "Trebuchet MS", "Segoe UI", Arial';
    ctx.fillText(value, x + 190, y + 16);
    ctx.restore();
}

function calculateSkill(playerLevels) {
    const topLevels = [...playerLevels]
        .sort((a, b) => b.punter - a.punter)
        .slice(0, 5);
    if (topLevels.length === 0) return 0;
    const total = topLevels.reduce((acc, l) => acc + l.punter, 0);
    return total / 5;
}

function calculatePlayerRankings(playerName) {
    // Create a map of all players and their stats
    const playerStats = {};
    
    // Get unique players from levels
    const allPlayers = new Set();
    levels.forEach(l => {
        l.victors.forEach(v => allPlayers.add(v.toLowerCase()));
    });
    
    // Calculate stats for each player
    allPlayers.forEach(player => {
        const playerLevels = levels.filter(l => 
            l.victors.some(v => v.toLowerCase() === player.toLowerCase())
        );
        
        const levelsBeat = playerLevels.length;
        const totalPts = playerLevels.reduce((acc, l) => acc + l.points, 0);
        const skill = calculateSkill(playerLevels);
        
        // Calculate casual and competitive weighted
        const sortedByPoints = [...playerLevels].sort((a, b) => b.points - a.points);
        let casual = 0, competitive = 0;
        let casualMult = 1, compMult = 1;
        
        sortedByPoints.forEach(l => {
            casual += l.points * casualMult;
            casualMult *= 0.9;
            competitive += l.points * compMult;
            compMult *= 0.7;
        });
        
        playerStats[player] = { levelsBeat, totalPts, casual, competitive, skill };
    });
    
    // Find current player's stats
    const currentPlayer = playerName.toLowerCase();
    const currentStats = playerStats[currentPlayer] || { levelsBeat: 0, totalPts: 0, casual: 0, competitive: 0, skill: 0 };
    
    // Calculate ranks (1-based)
    let levelsBeatRank = 1, totalPtsRank = 1, casualRank = 1, competitiveRank = 1, skillRank = 1;
    
    Object.values(playerStats).forEach(stats => {
        if (stats.levelsBeat > currentStats.levelsBeat) levelsBeatRank++;
        if (stats.totalPts > currentStats.totalPts) totalPtsRank++;
        if (stats.casual > currentStats.casual) casualRank++;
        if (stats.competitive > currentStats.competitive) competitiveRank++;
        if (stats.skill > currentStats.skill) skillRank++;
    });
    
    return {
        levelsBeatnRank: levelsBeatRank,
        totalPtsRank: totalPtsRank,
        casualRank: casualRank,
        competitiveRank: competitiveRank,
        skillRank: skillRank
    };
}

function calculateDifficultyBreakdown(playerLevels) {
    const breakdown = {};
    const difficulties = [
        [0, 1, '0-1'], [1, 2, '1-2'], [2, 3, '2-3'], [3, 4, '3-4'], [4, 5, '4-5'],
        [5, 6, '5-6'], [6, 7, '6-7'], [7, 8, '7-8'], [8, 9, '8-9'], [9, 10, '9-10'],
        [10, 11, '10-11'], [11, 12, '11-12'], [12, 13, '12-13'], [13, 14, '13-14'], [14, 15, '14-15']
    ];
    
    difficulties.forEach(([min, max, label]) => {
        const count = playerLevels.filter(l => l.punter >= min && l.punter < max).length;
        breakdown[label] = playerLevels.length > 0 ? Math.round((count / playerLevels.length) * 100) : 0;
    });
    
    return breakdown;
}

function displayCanvas(canvas, playerName) {
    // Display the canvas in the modal
    const container = document.getElementById('profileCardContainer');
    const canvasElement = document.getElementById('profileCardCanvas');
    
    // Copy canvas content to the display canvas
    const ctx = canvasElement.getContext('2d');
    canvasElement.width = canvas.width;
    canvasElement.height = canvas.height;
    ctx.drawImage(canvas, 0, 0);
    
    // Show container
    container.classList.remove('hidden');
    
    // Setup download button
    const downloadBtn = document.getElementById('downloadProfileCardBtn');
    downloadBtn.onclick = () => downloadCanvasImage(canvas, playerName);
}

function downloadCanvasImage(canvas, playerName) {
    const link = document.createElement('a');
    link.download = `${playerName}-profile-card.png`;
    link.href = canvas.toDataURL();
    link.click();
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
            playerMap[player].push(l);
        });
    });

    // Compute total points
    const sortedPlayers = Object.entries(playerMap)
        .map(([player, playerLevels]) => {
            let totalPoints;
            if (mode === 'competitive') {
                const sorted = [...playerLevels].map(l => l.points).sort((a,b) => b - a);
                let multiplier = 1;
                totalPoints = 0;
                sorted.forEach(p => {
                    totalPoints += p * multiplier;
                    multiplier *= 0.7; // Competitive multiplier
                });
            } else if (mode === 'casual') {
                const sorted = [...playerLevels].map(l => l.points).sort((a,b) => b - a);
                let multiplier = 1;
                totalPoints = 0;
                sorted.forEach(p => {
                    totalPoints += p * multiplier;
                    multiplier *= 0.9; // Casual multiplier
                });
            } else if (mode === 'levelsBeaten') {
                totalPoints = playerLevels.length; // +1 per level beaten
            } else if (mode === 'skill') {
                totalPoints = calculateSkill(playerLevels);
            } else {
                totalPoints = playerLevels.reduce((acc, l) => acc + l.points, 0); // Fallback to sum for unknown modes
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
        const displayedPoints = (mode === 'levelsBeaten')
            ? Math.round(points)
            : (mode === 'skill' ? points.toFixed(2) : displayNumber(points));
        const pointLabel = (mode === 'levelsBeaten')
            ? (displayedPoints === 1 ? 'level' : 'levels')
            : (mode === 'skill' ? 'skill' : 'pts');
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


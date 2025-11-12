// Replace the static gameStages with API data
let gameStages = [];
let currentGrid = [];
let selectedCells = [];
let foundWords = new Set();
let score = 0;
let currentWords = [];
let wordPositions = new Map();
let currentStage = 0;
let totalStages = 0;

// Initialize the game with API data
async function initGame() {
    // Show loading state
    document.getElementById('gameStatus').textContent = 'Loading game data...';
    document.getElementById('gameStatus').style.color = '#FF9800';

    try {
        // Load stages from API
        await loadStagesFromAPI();
        
        // Load saved progress from localStorage
        loadGameProgress();
        
        // Start the game with current stage
        loadStage(currentStage);
        
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('gameStatus').textContent = 'Error loading game. Please refresh.';
        document.getElementById('gameStatus').style.color = '#f44336';
    }
}

// Fetch stages from API
async function loadStagesFromAPI() {
    const apiUrl = 'https://cdn.shopify.com/s/files/1/0771/5536/9212/files/quiz-list.json';
    
    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if data has the expected structure
        if (data.stages && Array.isArray(data.stages)) {
            gameStages = data.stages;
            totalStages = gameStages.length;
            console.log(`✅ Loaded ${totalStages} stages from API`);
        } else {
            throw new Error('Invalid data structure from API');
        }
        
    } catch (error) {
        console.error('Error fetching stages:', error);
        
        // Fallback to static data if API fails
        gameStages = [];
        totalStages = gameStages.length;
        console.log('🔄 Using fallback data');
    }
}

// Load game progress from localStorage
function loadGameProgress() {
    const savedStage = localStorage.getItem('currentSudokuStage');
    const savedScore = localStorage.getItem('currentSudokuScore');
    
    if (savedStage !== null) {
        currentStage = parseInt(savedStage);
        console.log(`📁 Loaded saved stage: ${currentStage + 1}`);
    } else {
        currentStage = 0;
        localStorage.setItem('currentSudokuStage', '0');
    }
    
    if (savedScore !== null) {
        score = parseInt(savedScore);
    }
    
    console.log(`🎮 Starting from stage: ${currentStage + 1}, Score: ${score}`);
}

// Save game progress to localStorage
function saveGameProgress() {
    localStorage.setItem('currentSudokuStage', currentStage.toString());
    localStorage.setItem('currentSudokuScore', score.toString());
    console.log(`💾 Saved progress - Stage: ${currentStage + 1}, Score: ${score}`);
}

// Reset all game progress
function resetAllProgress() {
    localStorage.removeItem('currentSudokuStage');
    localStorage.removeItem('currentSudokuScore');
    currentStage = 0;
    score = 0;
    console.log('🔄 All progress reset');
}

// Load a specific stage
function loadStage(stageIndex) {
    if (!gameStages || gameStages.length === 0) {
        console.error('No stages available');
        return;
    }
    
    // Ensure stageIndex is within bounds
    if (stageIndex < 0) stageIndex = 0;
    if (stageIndex >= gameStages.length) stageIndex = gameStages.length - 1;
    
    currentStage = stageIndex;
    const stage = gameStages[stageIndex];

    // Update stage info
    document.getElementById('stageInfo').textContent = 
        `Stage ${stageIndex + 1}: ${stage.name} (${stage.difficulty || 'unknown'})`;

    // Reset game state for new stage
    selectedCells = [];
    foundWords = new Set();
    currentWords = [...stage.words];

    // Generate new grid with completely random positions
    generateGrid();
    updateWordsList();
    updateScore();

    // Save progress
    saveGameProgress();

    document.getElementById('gameStatus').textContent = 
        `Find the ${stage.words.length} words in the grid! Words can be in any direction.`;
    document.getElementById('gameStatus').style.color = '#333';
}

// Generate 12x12 grid with completely random word positions
function generateGrid() {
    const grid = document.getElementById('sudokuGrid');
    grid.innerHTML = '';
    currentGrid = Array(12).fill().map(() => Array(12).fill(''));
    wordPositions.clear();

    // Place words in the grid with completely random positions
    placeWordsRandomly();

    // Fill remaining cells with weighted random letters
    fillWeightedRandomLetters();

    // Create grid cells in DOM
    for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = currentGrid[i][j];
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => selectCell(i, j));
            grid.appendChild(cell);
        }
    }
}

function placeWordsRandomly() {
    const directions = [
        { name: 'horizontal', row: 0, col: 1 },
        { name: 'vertical', row: 1, col: 0 },
        { name: 'diagonalDown', row: 1, col: 1 },
        { name: 'diagonalUp', row: -1, col: 1 },
        { name: 'horizontalBack', row: 0, col: -1 },
        { name: 'verticalBack', row: -1, col: 0 },
        { name: 'diagonalDownBack', row: -1, col: -1 },
        { name: 'diagonalUpBack', row: 1, col: -1 }
    ];

    // Shuffle words for random placement order
    const shuffledWords = [...currentWords].sort(() => Math.random() - 0.5);

    shuffledWords.forEach(word => {
        let placed = false;
        let attempts = 0;

        // Try different random positions until successful
        while (!placed && attempts < 100) {
            attempts++;
            const direction = directions[Math.floor(Math.random() * directions.length)];

            // Calculate maximum possible starting position
            const maxRow = direction.row >= 0 ? 
                12 - (Math.abs(direction.row) * (word.length - 1)) : 
                Math.abs(direction.row) * (word.length - 1);
            const maxCol = direction.col >= 0 ? 
                12 - (Math.abs(direction.col) * (word.length - 1)) : 
                Math.abs(direction.col) * (word.length - 1);

            if (maxRow <= 0 || maxCol <= 0) continue;

            const startRow = direction.row >= 0 ? 
                Math.floor(Math.random() * maxRow) : 
                Math.floor(Math.random() * maxRow) + (word.length - 1);
            const startCol = direction.col >= 0 ? 
                Math.floor(Math.random() * maxCol) : 
                Math.floor(Math.random() * maxCol) + (word.length - 1);

            if (canPlaceWord(word, startRow, startCol, direction)) {
                placeWord(word, startRow, startCol, direction);
                placed = true;
            }
        }

        if (!placed) {
            console.warn(`Could not place word: ${word}`);
        }
    });
}

function canPlaceWord(word, row, col, direction) {
    for (let i = 0; i < word.length; i++) {
        const newRow = row + (direction.row * i);
        const newCol = col + (direction.col * i);

        // Check bounds
        if (newRow < 0 || newRow >= 12 || newCol < 0 || newCol >= 12) return false;

        // Check if cell is empty or has the same letter
        if (currentGrid[newRow][newCol] !== '' && 
            currentGrid[newRow][newCol] !== word[i].toUpperCase()) {
            return false;
        }
    }
    return true;
}

function placeWord(word, row, col, direction) {
    const positions = [];
    for (let i = 0; i < word.length; i++) {
        const newRow = row + (direction.row * i);
        const newCol = col + (direction.col * i);

        currentGrid[newRow][newCol] = word[i].toUpperCase();
        positions.push({ row: newRow, col: newCol });
    }

    // Store word positions for hint system
    wordPositions.set(word, positions);
}

function fillWeightedRandomLetters() {
    // Create frequency map from current stage words
    const letterFrequency = {};
    currentWords.forEach(word => {
        word.toUpperCase().split('').forEach(letter => {
            letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
        });
    });

    // Convert to probability array
    const letters = [];
    const weights = [];
    let totalWeight = 0;

    Object.keys(letterFrequency).forEach(letter => {
        letters.push(letter);
        weights.push(letterFrequency[letter]);
        totalWeight += letterFrequency[letter];
    });

    // Add remaining letters with lower weight
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        if (!letters.includes(letter)) {
            letters.push(letter);
            weights.push(1);
            totalWeight += 1;
        }
    });

    // Fill empty cells with weighted random letters
    for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
            if (currentGrid[i][j] === '') {
                const random = Math.random() * totalWeight;
                let weightSum = 0;

                for (let k = 0; k < letters.length; k++) {
                    weightSum += weights[k];
                    if (random <= weightSum) {
                        currentGrid[i][j] = letters[k];
                        break;
                    }
                }
            }
        }
    }
}

function selectCell(row, col) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);

    // Toggle selection
    if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
        selectedCells = selectedCells.filter(c => !(c.row === row && c.col === col));
    } else {
        cell.classList.add('selected');
        selectedCells.push({ row, col, letter: currentGrid[row][col] });
    }

    checkWord();
}

function checkWord() {
    if (selectedCells.length === 0) return;

    const selectedWord = selectedCells.map(cell => cell.letter).join('').toLowerCase();
    const reversedWord = selectedWord.split('').reverse().join('');

    // Check both original and reversed word
    for (const word of currentWords) {
        if (!foundWords.has(word) && 
            (selectedWord === word || reversedWord === word)) {

            // Word found!
            foundWords.add(word);
            score += word.length * 10;

            // Mark cells as found
            selectedCells.forEach(cell => {
                const cellElement = document.querySelector(
                    `.cell[data-row="${cell.row}"][data-col="${cell.col}"]`
                );
                cellElement.classList.remove('selected');
                cellElement.classList.add('found');
            });

            selectedCells = [];
            updateWordsList();
            updateScore();
            checkStageComplete();

            // Save progress after finding a word
            saveGameProgress();

            // Provide feedback
            document.getElementById('gameStatus').textContent = 
                `Great! Found "${word.toUpperCase()}"! +${word.length * 10} points`;
            document.getElementById('gameStatus').style.color = '#4CAF50';

            setTimeout(() => {
                if (foundWords.size < currentWords.length) {
                    document.getElementById('gameStatus').textContent = 
                        'Keep going! Find more words!';
                    document.getElementById('gameStatus').style.color = '#333';
                }
            }, 2000);

            return;
        }
    }

    // Clear selection if too long
    if (selectedCells.length > Math.max(...currentWords.map(w => w.length))) {
        clearSelection();
    }
}

function clearSelection() {
    selectedCells.forEach(cell => {
        const cellElement = document.querySelector(
            `.cell[data-row="${cell.row}"][data-col="${cell.col}"]`
        );
        cellElement.classList.remove('selected');
    });
    selectedCells = [];
}

function updateWordsList() {
    const wordsList = document.getElementById('wordsList');
    wordsList.innerHTML = '';

    currentWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = `word-item ${foundWords.has(word) ? 'found' : ''}`;
        wordElement.textContent = word.toUpperCase();
        wordsList.appendChild(wordElement);
    });
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

function checkStageComplete() {
    if (foundWords.size === currentWords.length) {
        const stageBonus = currentWords.length * 25;
        score += stageBonus;
        updateScore();

        document.getElementById('gameStatus').textContent = 
            `Stage ${currentStage + 1} Complete! Bonus: +${stageBonus} points!`;
        document.getElementById('gameStatus').style.color = '#4CAF50';

        // Save progress after completing stage
        saveGameProgress();

        // Move to next stage after delay
        setTimeout(() => {
            if (currentStage < totalStages - 1) {
                currentStage++;
                loadStage(currentStage);
            } else {
                // All stages completed
                document.getElementById('gameStatus').textContent = 
                    `🎉 Congratulations! You completed all ${totalStages} stages! Final Score: ${score}`;
                document.getElementById('gameStatus').style.color = '#FF9800';
                
                // Reset progress after completing all stages
                setTimeout(() => {
                    resetAllProgress();
                    initGame();
                }, 5000);
            }
        }, 3000);
    }
}

function newGame() {
    // Move to next stage (or wrap around)
    currentStage = (currentStage + 1) % totalStages;
    loadStage(currentStage);
}

function resetGame() {
    // Reset current stage with completely new random positions
    loadStage(currentStage);
}

function showHint() {
    const unfoundWords = currentWords.filter(word => !foundWords.has(word));
    if (unfoundWords.length === 0) {
        document.getElementById('gameStatus').textContent = 'You found all words already!';
        return;
    }

    const randomWord = unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
    const positions = wordPositions.get(randomWord);

    if (positions && positions.length > 0) {
        // Highlight the first letter of the word
        const firstPos = positions[0];
        const cell = document.querySelector(
            `.cell[data-row="${firstPos.row}"][data-col="${firstPos.col}"]`
        );

        cell.style.backgroundColor = '#FFEB3B';
        cell.style.color = '#333';

        document.getElementById('gameStatus').textContent = 
            `Hint: Look for "${randomWord.toUpperCase()}" starting here!`;
        document.getElementById('gameStatus').style.color = '#FF9800';

        // Remove highlight after 3 seconds
        setTimeout(() => {
            if (!cell.classList.contains('found')) {
                cell.style.backgroundColor = '';
                cell.style.color = '';
            }
            document.getElementById('gameStatus').textContent = 
                'Find the words in the grid! Words can be in any direction.';
            document.getElementById('gameStatus').style.color = '#333';
        }, 3000);
    } else {
        document.getElementById('gameStatus').textContent = 
            `Hint: Look for "${randomWord.toUpperCase()}" somewhere in the grid!`;
        document.getElementById('gameStatus').style.color = '#FF9800';

        setTimeout(() => {
            document.getElementById('gameStatus').textContent = 
                'Find the words in the grid! Words can be in any direction.';
            document.getElementById('gameStatus').style.color = '#333';
        }, 3000);
    }
  
}

// Add a function to manually reset all progress (for testing)
function resetAllProgress() {
    localStorage.removeItem('currentSudokuStage');
    localStorage.removeItem('currentSudokuScore');
    currentStage = 0;
    score = 0;
    console.log('🔄 All progress reset');
    initGame();
}

// Initialize the game when page loads
window.onload = initGame;

// Handle window resize for better responsiveness
window.addEventListener('resize', function() {
    const grid = document.getElementById('sudokuGrid');
    if (grid.children.length > 0) {
        grid.style.display = 'none';
        setTimeout(() => {
            grid.style.display = 'grid';
        }, 10);
    }
});
// Supabase Configuration
const SUPABASE_URL = 'https://bxhrnnwfqlsoviysqcdw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4aHJubndmcWxzb3ZpeXNxY2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODkzNDIsImV4cCI6MjA4MTM2NTM0Mn0.O7fpv0TrDd-8ZE3Z9B5zWyAuWROPis5GRnKMxmqncX8';

// Buat Supabase client dengan nama unik
const puzzleSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Game Variables
let currentLevel = 1;
let grid = 3;
let dragged = null;
let timer = 0, interval = null;
let musicEnabled = false;
let completedLevels = new Set();
let currentUser = null;
let leaderboardEnabled = true;

// Initialize App
async function init() {
    console.log('🚀 Initializing Bahlil Puzzle...');
    
    // Check saved data
    const saved = localStorage.getItem('puzzleCompletedLevels');
    if (saved) {
        completedLevels = new Set(JSON.parse(saved));
    }
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('puzzleUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }
    
    // Setup event listeners untuk tombol
    setupButtonListeners();
    
    // Check database connection
    await checkDatabaseConnection();
    
    console.log('✅ App initialized successfully');
}

// Setup semua event listeners untuk tombol
function setupButtonListeners() {
    console.log('🔗 Setting up button listeners...');
    
    // Main Menu Buttons
    document.getElementById('startBtn')?.addEventListener('click', openLevels);
    document.getElementById('leaderboardBtn')?.addEventListener('click', openLeaderboard);
    
    // Level Menu Buttons
    document.getElementById('backToMenuBtn')?.addEventListener('click', backMenu);
    
    // Auth Buttons
    document.getElementById('loginBtn')?.addEventListener('click', login);
    document.getElementById('registerBtn')?.addEventListener('click', register);
    document.getElementById('showRegisterLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });
    document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });
    document.getElementById('backFromAuthBtn')?.addEventListener('click', backMenu);
    
    // Leaderboard Buttons
    document.getElementById('backFromLeaderboardBtn')?.addEventListener('click', backMenu);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Game Buttons
    document.getElementById('backToLevelsBtn')?.addEventListener('click', backToLevels);
    document.getElementById('restartBtn')?.addEventListener('click', restartLevel);
    document.getElementById('nextBtn')?.addEventListener('click', nextLevel);
    
    // Music Button
    document.getElementById('musicBtn')?.addEventListener('click', toggleMusic);
    
    // Leaderboard Level Select
    document.getElementById('leaderboardLevel')?.addEventListener('change', loadLeaderboard);
    
    console.log('✅ Button listeners setup complete');
}

// Check database connection
async function checkDatabaseConnection() {
    try {
        const { data, error } = await puzzleSupabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (error && error.message.includes('does not exist')) {
            console.warn('⚠️ Database tables not found. Leaderboard features disabled.');
            leaderboardEnabled = false;
            // Hide leaderboard button
            const leaderboardBtn = document.getElementById('leaderboardBtn');
            if (leaderboardBtn) leaderboardBtn.style.display = 'none';
        } else {
            console.log('✅ Database connection successful');
            leaderboardEnabled = true;
        }
    } catch (error) {
        console.error('❌ Error checking database connection:', error);
        leaderboardEnabled = false;
    }
}

// ========== UI FUNCTIONS ==========
function createLevelButtons() {
    const levelGrid = document.getElementById('levels');
    if (!levelGrid) return;
    
    levelGrid.innerHTML = '';
    for(let i = 1; i <= 12; i++) {
        const btn = document.createElement("button");
        btn.className = "level-btn";
        btn.id = `levelBtn${i}`;
        
        let iconClass = "fas fa-star";
        if (i <= 3) iconClass = "fas fa-chess-pawn";
        else if (i <= 6) iconClass = "fas fa-chess-knight";
        else if (i <= 9) iconClass = "fas fa-chess-rook";
        else iconClass = "fas fa-crown";
        
        btn.innerHTML = `<i class="${iconClass}"></i> Level ${i}`;
        
        if (completedLevels.has(i)) {
            btn.classList.add("completed");
            btn.innerHTML += `<br><small style="color:#888;font-size:11px;">Selesai</small>`;
        }
        
        btn.addEventListener('click', () => startLevel(i));
        levelGrid.appendChild(btn);
    }
}

function updateUserUI() {
    const currentUserElement = document.getElementById('currentUser');
    const gameUsernameElement = document.getElementById('gameUsername');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (currentUser) {
        if (currentUserElement) currentUserElement.textContent = currentUser.username;
        if (gameUsernameElement) gameUsernameElement.textContent = currentUser.username;
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        if (currentUserElement) currentUserElement.textContent = 'Guest';
        if (gameUsernameElement) gameUsernameElement.textContent = 'Guest';
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

// ========== NAVIGATION FUNCTIONS ==========
function openLevels() {
    console.log('🎮 Opening levels menu...');
    document.getElementById('menu')?.classList.add("hidden");
    document.getElementById('levelMenu')?.classList.remove("hidden");
    createLevelButtons();
}

function backMenu() {
    console.log('🔙 Going back to main menu...');
    document.getElementById('levelMenu')?.classList.add("hidden");
    document.getElementById('game')?.classList.add("hidden");
    document.getElementById('authContainer')?.classList.add("hidden");
    document.getElementById('leaderboardContainer')?.classList.add("hidden");
    document.getElementById('menu')?.classList.remove("hidden");
}

function backToLevels() {
    console.log('📋 Going back to level selection...');
    clearInterval(interval);
    document.getElementById('game')?.classList.add("hidden");
    document.getElementById('levelMenu')?.classList.remove("hidden");
    createLevelButtons();
}

function openLeaderboard() {
    console.log('🏆 Opening leaderboard...');
    if (!currentUser) {
        // Show login/register first
        document.getElementById('menu')?.classList.add("hidden");
        document.getElementById('authContainer')?.classList.remove("hidden");
        showLogin();
        return;
    }
    
    if (!leaderboardEnabled) {
        alert('Fitur leaderboard sedang tidak tersedia. Database belum diatur.');
        return;
    }
    
    document.getElementById('menu')?.classList.add("hidden");
    document.getElementById('leaderboardContainer')?.classList.remove("hidden");
    loadLeaderboard();
}

// ========== AUTH FUNCTIONS ==========
function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.classList.remove("hidden");
    if (registerForm) registerForm.classList.add("hidden");
    
    // Clear form fields
    const loginUsername = document.getElementById("loginUsername");
    const loginPassword = document.getElementById("loginPassword");
    if (loginUsername) loginUsername.value = '';
    if (loginPassword) loginPassword.value = '';
}

function showRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.classList.add("hidden");
    if (registerForm) registerForm.classList.remove("hidden");
    
    // Clear form fields
    const registerUsername = document.getElementById("registerUsername");
    const registerPassword = document.getElementById("registerPassword");
    const registerConfirmPassword = document.getElementById("registerConfirmPassword");
    if (registerUsername) registerUsername.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerConfirmPassword) registerConfirmPassword.value = '';
}

async function login() {
    const username = document.getElementById("loginUsername")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    
    if (!username || !password) {
        alert("Harap isi username dan password");
        return;
    }
    
    try {
        const { data, error } = await puzzleSupabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                alert("Username atau password salah");
            } else {
                console.error('Login error:', error);
                alert("Terjadi kesalahan saat login");
            }
            return;
        }
        
        if (data) {
            currentUser = {
                id: data.id,
                username: data.username
            };
            
            localStorage.setItem('puzzleUser', JSON.stringify(currentUser));
            updateUserUI();
            
            document.getElementById('authContainer')?.classList.add("hidden");
            document.getElementById('leaderboardContainer')?.classList.remove("hidden");
            loadLeaderboard();
        }
    } catch (error) {
        console.error('Login error:', error);
        alert("Terjadi kesalahan saat login");
    }
}

async function register() {
    const username = document.getElementById("registerUsername")?.value.trim();
    const password = document.getElementById("registerPassword")?.value;
    const confirmPassword = document.getElementById("registerConfirmPassword")?.value;
    
    if (!username || !password || !confirmPassword) {
        alert("Harap isi semua field");
        return;
    }
    
    if (password !== confirmPassword) {
        alert("Password dan konfirmasi password tidak cocok");
        return;
    }
    
    if (password.length < 3) {
        alert("Password minimal 3 karakter");
        return;
    }
    
    if (username.length < 3) {
        alert("Username minimal 3 karakter");
        return;
    }
    
    try {
        // Check if username already exists
        const { data: existingUser, error: checkError } = await puzzleSupabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (existingUser && !checkError) {
            alert("Username sudah digunakan");
            return;
        }
        
        // Insert new user
        const { data, error } = await puzzleSupabase
            .from('users')
            .insert([
                {
                    username: username,
                    password: password,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (error) {
            console.error('Registration error:', error);
            alert("Terjadi kesalahan saat mendaftar");
            return;
        }
        
        if (data) {
            currentUser = {
                id: data.id,
                username: data.username
            };
            
            localStorage.setItem('puzzleUser', JSON.stringify(currentUser));
            updateUserUI();
            
            alert("Pendaftaran berhasil! Anda telah login otomatis.");
            document.getElementById('authContainer')?.classList.add("hidden");
            document.getElementById('leaderboardContainer')?.classList.remove("hidden");
            loadLeaderboard();
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert("Terjadi kesalahan saat mendaftar");
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('puzzleUser');
    updateUserUI();
    backMenu();
    showLogin();
}

// ========== LEADERBOARD FUNCTIONS ==========
async function loadLeaderboard() {
    const leaderboardLevelSelect = document.getElementById('leaderboardLevel');
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (!leaderboardLevelSelect || !leaderboardList) return;
    
    const level = leaderboardLevelSelect.value;
    if (!level) return;
    
    leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">Memuat leaderboard...</div>';
    
    try {
        const { data, error } = await puzzleSupabase
            .from(`leaderboard_level${level}`)
            .select('*')
            .order('time_seconds', { ascending: true })
            .limit(10);
        
        if (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Gagal memuat leaderboard</div>';
            return;
        }
        
        if (!data || data.length === 0) {
            leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">Belum ada data untuk level ini</div>';
            return;
        }
        
        let html = '';
        data.forEach((entry, index) => {
            const rankClass = `leaderboard-place-${index + 1}`;
            const timeFormatted = formatTime(entry.time_seconds);
            
            html += `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">#${index + 1}</div>
                    <div class="leaderboard-user">${entry.username}</div>
                    <div class="leaderboard-time ${rankClass}">${timeFormatted}</div>
                </div>
            `;
        });
        
        leaderboardList.innerHTML = html;
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Terjadi kesalahan</div>';
    }
}

async function submitScoreToLeaderboard(level, timeSeconds) {
    if (!currentUser || !leaderboardEnabled) return;
    
    try {
        // Check if table exists first
        const { error: tableError } = await puzzleSupabase
            .from(`leaderboard_level${level}`)
            .select('id')
            .limit(1);
        
        if (tableError) return;
        
        // Check if user already has a score for this level
        const { data: existingScore, error: checkError } = await puzzleSupabase
            .from(`leaderboard_level${level}`)
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (checkError && checkError.code === 'PGRST116') {
            // No existing score, insert new one
            await puzzleSupabase
                .from(`leaderboard_level${level}`)
                .insert([
                    {
                        user_id: currentUser.id,
                        username: currentUser.username,
                        time_seconds: timeSeconds,
                        completed_at: new Date().toISOString()
                    }
                ]);
        } else if (existingScore && timeSeconds < existingScore.time_seconds) {
            // Update if new time is better
            await puzzleSupabase
                .from(`leaderboard_level${level}`)
                .update({
                    time_seconds: timeSeconds,
                    completed_at: new Date().toISOString()
                })
                .eq('user_id', currentUser.id);
        }
    } catch (error) {
        console.error('Error submitting score to leaderboard:', error);
    }
}

// ========== GAME FUNCTIONS ==========
function toggleMusic() {
    const musicBtn = document.getElementById('musicBtn');
    const bgMusic = document.getElementById('bgMusic');
    
    musicEnabled = !musicEnabled;
    
    if (musicEnabled) {
        bgMusic.play().catch(e => console.log("Autoplay prevented:", e));
        musicBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        musicBtn.classList.remove('off');
    } else {
        bgMusic.pause();
        musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        musicBtn.classList.add('off');
    }
}

function restartLevel() {
    startLevel(currentLevel);
}

function startLevel(lvl) {
    console.log(`🎯 Starting level ${lvl}...`);
    currentLevel = lvl;
    
    // Set grid size based on level
    if (lvl <= 3) grid = 3;
    else if (lvl <= 7) grid = 4;
    else if (lvl <= 10) grid = 5;
    else grid = 6;
    
    // Update UI
    document.getElementById('levelMenu')?.classList.add("hidden");
    document.getElementById('game')?.classList.remove("hidden");
    
    const lvlText = document.getElementById('lvl');
    const gridSizeText = document.getElementById('gridSize');
    const nextBtn = document.getElementById('nextBtn');
    const statusText = document.getElementById('status');
    
    if (lvlText) lvlText.textContent = lvl;
    if (gridSizeText) gridSizeText.textContent = `${grid}x${grid}`;
    if (nextBtn) nextBtn.classList.add("hidden");
    if (statusText) {
        statusText.textContent = "Susun potongan gambar dengan benar!";
        statusText.className = "";
    }
    
    startTimer();
    loadPuzzle(`foto${lvl}.webp`, grid);
}

function startTimer() {
    clearInterval(interval);
    timer = 0;
    const timeText = document.getElementById('time');
    if (timeText) timeText.textContent = 0;
    
    interval = setInterval(() => {
        timer++;
        if (timeText) timeText.textContent = timer;
    }, 1000);
}

function loadPuzzle(img, grid) {
    const puzzle = document.getElementById('puzzle');
    if (!puzzle) return;
    
    puzzle.innerHTML = "";
    puzzle.style.gridTemplateColumns = `repeat(${grid}, 1fr)`;
    puzzle.style.gridTemplateRows = `repeat(${grid}, 1fr)`;
    
    const puzzleRect = puzzle.getBoundingClientRect();
    const size = Math.min(puzzleRect.width, puzzleRect.height);
    const pieces = [];
    
    for(let y = 0; y < grid; y++) {
        for(let x = 0; x < grid; x++) {
            const piece = document.createElement("div");
            piece.className = "piece";
            piece.draggable = true;
            piece.dataset.correct = y * grid + x;
            piece.style.backgroundImage = `url(${img})`;
            piece.style.backgroundSize = `${size}px ${size}px`;
            piece.style.backgroundPosition = `-${x * (size / grid)}px -${y * (size / grid)}px`;
            pieces.push(piece);
        }
    }
    
    shuffle(pieces);
    pieces.forEach(p => puzzle.appendChild(p));
    
    dragEvents();
}

function dragEvents() {
    const pieces = document.querySelectorAll(".piece");
    
    pieces.forEach(piece => {
        piece.addEventListener("dragstart", () => {
            dragged = piece;
            piece.classList.add("dragging");
        });
        
        piece.addEventListener("dragend", () => {
            piece.classList.remove("dragging");
        });
        
        piece.addEventListener("dragover", e => {
            e.preventDefault();
        });
        
        piece.addEventListener("drop", e => {
            e.preventDefault();
            
            if(dragged && dragged !== piece) {
                const nextSibling = dragged.nextSibling === piece ? dragged : dragged.nextSibling;
                const puzzle = document.getElementById('puzzle');
                puzzle.insertBefore(dragged, piece);
                puzzle.insertBefore(piece, nextSibling);
                
                checkWin();
            }
        });
        
        // Touch events for mobile
        piece.addEventListener('touchstart', handleTouchStart);
        piece.addEventListener('touchmove', handleTouchMove);
        piece.addEventListener('touchend', handleTouchEnd);
    });
}

let touchStartX = 0, touchStartY = 0, touchedPiece = null;

function handleTouchStart(e) {
    e.preventDefault();
    touchedPiece = this;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchedPiece.classList.add('dragging');
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchedPiece) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    const elements = document.elementsFromPoint(touchX, touchY);
    const targetPiece = elements.find(el => el.classList.contains('piece') && el !== touchedPiece);
    
    if (targetPiece) {
        const nextSibling = touchedPiece.nextSibling === targetPiece ? touchedPiece : touchedPiece.nextSibling;
        const puzzle = document.getElementById('puzzle');
        puzzle.insertBefore(touchedPiece, targetPiece);
        puzzle.insertBefore(targetPiece, nextSibling);
        
        checkWin();
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (touchedPiece) {
        touchedPiece.classList.remove('dragging');
        touchedPiece = null;
    }
}

function checkWin() {
    const puzzle = document.getElementById('puzzle');
    const pieces = [...puzzle.children];
    const isSolved = pieces.every((piece, index) => piece.dataset.correct == index);
    
    if(isSolved) {
        clearInterval(interval);
        const statusText = document.getElementById('status');
        const nextBtn = document.getElementById('nextBtn');
        
        if (statusText) {
            statusText.textContent = `🎉 Terselesaikan dalam ${timer} detik!`;
            statusText.className = "status-success";
        }
        
        completedLevels.add(currentLevel);
        localStorage.setItem('puzzleCompletedLevels', JSON.stringify([...completedLevels]));
        
        // Submit score to leaderboard
        if (currentUser) {
            submitScoreToLeaderboard(currentLevel, timer);
        }
        
        if(currentLevel < 12) {
            if (nextBtn) {
                nextBtn.classList.remove("hidden");
                nextBtn.classList.add("pulse");
            }
        } else {
            if (statusText) {
                statusText.textContent += " 🏆 SELESAI SEMUA LEVEL!";
            }
        }
        
        pieces.forEach(piece => piece.classList.add('correct'));
    }
}

function nextLevel() {
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.classList.remove("pulse");
    startLevel(currentLevel + 1);
}

// ========== UTILITY FUNCTIONS ==========
function shuffle(arr) {
    for(let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', init);

// Handle window resize
window.addEventListener('resize', () => {
    const game = document.getElementById('game');
    if (game && !game.classList.contains('hidden')) {
        loadPuzzle(`foto${currentLevel}.webp`, grid);
    }
});

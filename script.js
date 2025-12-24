// Supabase Configuration
const SUPABASE_URL = 'https://bxhrnnwfqlsoviysqcdw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4aHJubndmcWxzb3ZpeXNxY2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODkzNDIsImV4cCI6MjA4MTM2NTM0Mn0.O7fpv0TrDd-8ZE3Z9B5zWyAuWROPis5GRnKMxmqncX8';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const menu = document.getElementById("menu");
const levelMenu = document.getElementById("levelMenu");
const game = document.getElementById("game");
const authContainer = document.getElementById("authContainer");
const leaderboardContainer = document.getElementById("leaderboardContainer");
const puzzle = document.getElementById("puzzle");
const statusText = document.getElementById("status");
const nextBtn = document.getElementById("nextBtn");
const timeText = document.getElementById("time");
const lvlText = document.getElementById("lvl");
const gridSizeText = document.getElementById("gridSize");
const levelGrid = document.getElementById("levels");
const musicBtn = document.getElementById("musicBtn");
const bgMusic = document.getElementById("bgMusic");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const leaderboardList = document.getElementById("leaderboardList");
const leaderboardLevelSelect = document.getElementById("leaderboardLevel");
const currentUserElement = document.getElementById("currentUser");
const gameUsernameElement = document.getElementById("gameUsername");
const logoutBtn = document.getElementById("logoutBtn");

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
    
    // Initialize leaderboard level select
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Level ${i}`;
        leaderboardLevelSelect.appendChild(option);
    }
    
    createLevelButtons();
    setupEventListeners();
    
    // Check database connection
    await checkDatabaseConnection();
    
    document.addEventListener('touchmove', function(e) {
        if(e.target.closest('.level-grid')) return;
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('contextmenu', e => e.preventDefault());
}

// Check database connection
async function checkDatabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (error && error.message.includes('does not exist')) {
            console.warn('Database tables not found. Leaderboard features disabled.');
            leaderboardEnabled = false;
            // Hide leaderboard button if tables don't exist
            const leaderboardBtn = document.querySelector('[onclick="openLeaderboard()"]');
            if (leaderboardBtn) {
                leaderboardBtn.style.display = 'none';
            }
        } else {
            console.log('Database connection successful');
            leaderboardEnabled = true;
        }
    } catch (error) {
        console.error('Error checking database connection:', error);
        leaderboardEnabled = false;
    }
}

// UI Functions
function createLevelButtons() {
    levelGrid.innerHTML = '';
    for(let i = 1; i <= 12; i++) {
        const btn = document.createElement("button");
        btn.className = "level-btn";
        
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
        
        btn.onclick = () => startLevel(i);
        levelGrid.appendChild(btn);
    }
}

function setupEventListeners() {
    musicBtn.addEventListener('click', toggleMusic);
    bgMusic.volume = 0.5;
}

function toggleMusic() {
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

function updateUserUI() {
    if (currentUser) {
        currentUserElement.textContent = currentUser.username;
        gameUsernameElement.textContent = currentUser.username;
        logoutBtn.classList.remove('hidden');
    } else {
        currentUserElement.textContent = 'Guest';
        gameUsernameElement.textContent = 'Guest';
        logoutBtn.classList.add('hidden');
    }
}

// Navigation Functions
function openLevels() {
    menu.classList.add("hidden");
    levelMenu.classList.remove("hidden");
    
    document.querySelectorAll(".level-btn").forEach((btn, index) => {
        btn.classList.remove("current");
        if (index + 1 === currentLevel) {
            btn.classList.add("current");
        }
    });
}

function backMenu() {
    levelMenu.classList.add("hidden");
    game.classList.add("hidden");
    authContainer.classList.add("hidden");
    leaderboardContainer.classList.add("hidden");
    menu.classList.remove("hidden");
}

function backToLevels() {
    clearInterval(interval);
    game.classList.add("hidden");
    levelMenu.classList.remove("hidden");
    createLevelButtons();
}

function openLeaderboard() {
    if (!currentUser) {
        // Show login/register first
        menu.classList.add("hidden");
        authContainer.classList.remove("hidden");
        showLogin();
    } else {
        if (!leaderboardEnabled) {
            alert('Fitur leaderboard sedang tidak tersedia. Database belum diatur.');
            return;
        }
        menu.classList.add("hidden");
        leaderboardContainer.classList.remove("hidden");
        loadLeaderboard();
    }
}

// Auth Functions
function showLogin() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    // Clear form fields
    document.getElementById("loginUsername").value = '';
    document.getElementById("loginPassword").value = '';
}

function showRegister() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    // Clear form fields
    document.getElementById("registerUsername").value = '';
    document.getElementById("registerPassword").value = '';
    document.getElementById("registerConfirmPassword").value = '';
}

async function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    
    if (!username || !password) {
        alert("Harap isi username dan password");
        return;
    }
    
    try {
        // Query user from Supabase
        const { data, error } = await supabase
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
            
            authContainer.classList.add("hidden");
            leaderboardContainer.classList.remove("hidden");
            loadLeaderboard();
        }
    } catch (error) {
        console.error('Login error:', error);
        alert("Terjadi kesalahan saat login");
    }
}

async function register() {
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;
    
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
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (existingUser && !checkError) {
            alert("Username sudah digunakan");
            return;
        }
        
        // Insert new user
        const { data, error } = await supabase
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
            authContainer.classList.add("hidden");
            leaderboardContainer.classList.remove("hidden");
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
    showLogin(); // Show login form when returning to auth
}

// Leaderboard Functions
async function loadLeaderboard() {
    const level = leaderboardLevelSelect.value;
    
    if (!level) return;
    
    leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #aaa;">Memuat leaderboard...</div>';
    
    try {
        const { data, error } = await supabase
            .from(`leaderboard_level${level}`)
            .select('*')
            .order('time_seconds', { ascending: true })
            .limit(10);
        
        if (error) {
            console.error('Error loading leaderboard:', error);
            if (error.message.includes('does not exist')) {
                leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Leaderboard untuk level ini belum tersedia</div>';
            } else {
                leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Gagal memuat leaderboard</div>';
            }
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
    if (!currentUser) {
        console.log('User not logged in, score not saved to leaderboard');
        return;
    }
    
    if (!leaderboardEnabled) {
        console.log('Leaderboard disabled');
        return;
    }
    
    try {
        // Check if table exists first
        const { error: tableError } = await supabase
            .from(`leaderboard_level${level}`)
            .select('id')
            .limit(1);
        
        if (tableError && tableError.message.includes('does not exist')) {
            console.warn(`Leaderboard table for level ${level} does not exist`);
            return;
        }
        
        // Check if user already has a score for this level
        const { data: existingScore, error: checkError } = await supabase
            .from(`leaderboard_level${level}`)
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (checkError && checkError.code === 'PGRST116') {
            // No existing score, insert new one
            const { error: insertError } = await supabase
                .from(`leaderboard_level${level}`)
                .insert([
                    {
                        user_id: currentUser.id,
                        username: currentUser.username,
                        time_seconds: timeSeconds,
                        completed_at: new Date().toISOString()
                    }
                ]);
            
            if (insertError) {
                console.error('Error inserting score:', insertError);
            } else {
                console.log(`New score submitted to level ${level} leaderboard`);
            }
        } else if (existingScore) {
            // Update if new time is better
            if (timeSeconds < existingScore.time_seconds) {
                const { error: updateError } = await supabase
                    .from(`leaderboard_level${level}`)
                    .update({
                        time_seconds: timeSeconds,
                        completed_at: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
                
                if (updateError) {
                    console.error('Error updating score:', updateError);
                } else {
                    console.log(`Updated score for level ${level} leaderboard`);
                }
            } else {
                console.log(`Current score ${existingScore.time_seconds}s is better than new score ${timeSeconds}s`);
            }
        }
    } catch (error) {
        console.error('Error submitting score to leaderboard:', error);
    }
}

// Game Functions
function restartLevel() {
    startLevel(currentLevel);
}

function startLevel(lvl) {
    currentLevel = lvl;
    
    if (lvl <= 3) grid = 3;
    else if (lvl <= 7) grid = 4;
    else if (lvl <= 10) grid = 5;
    else grid = 6;
    
    levelMenu.classList.add("hidden");
    game.classList.remove("hidden");
    
    lvlText.textContent = lvl;
    gridSizeText.textContent = `${grid}x${grid}`;
    nextBtn.classList.add("hidden");
    statusText.textContent = "Susun potongan gambar dengan benar!";
    statusText.className = "";
    
    startTimer();
    loadPuzzle(`foto${lvl}.webp`, grid);
}

function startTimer() {
    clearInterval(interval);
    timer = 0;
    timeText.textContent = 0;
    
    interval = setInterval(() => {
        timer++;
        timeText.textContent = timer;
    }, 1000);
}

function loadPuzzle(img, grid) {
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
                puzzle.insertBefore(dragged, piece);
                puzzle.insertBefore(piece, nextSibling);
                
                checkWin();
            }
        });
        
        piece.addEventListener('touchstart', handleTouchStart);
        piece.addEventListener('touchmove', handleTouchMove);
        piece.addEventListener('touchend', handleTouchEnd);
    });
}

let touchStartX = 0;
let touchStartY = 0;
let touchedPiece = null;

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
    const pieces = [...puzzle.children];
    const isSolved = pieces.every((piece, index) => piece.dataset.correct == index);
    
    if(isSolved) {
        clearInterval(interval);
        statusText.textContent = `🎉 Terselesaikan dalam ${timer} detik!`;
        statusText.className = "status-success";
        
        completedLevels.add(currentLevel);
        localStorage.setItem('puzzleCompletedLevels', JSON.stringify([...completedLevels]));
        
        // Submit score to leaderboard if logged in
        if (currentUser) {
            submitScoreToLeaderboard(currentLevel, timer);
        }
        
        if(currentLevel < 12) {
            nextBtn.classList.remove("hidden");
            nextBtn.classList.add("pulse");
        } else {
            statusText.textContent += " 🏆 SELESAI SEMUA LEVEL!";
        }
        
        pieces.forEach(piece => piece.classList.add('correct'));
    }
}

function nextLevel() {
    nextBtn.classList.remove("pulse");
    startLevel(currentLevel + 1);
}

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

// Utility function untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    // Hapus notifikasi sebelumnya
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
    // Tambahkan styling
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Tambahkan keyframes untuk animasi
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize app
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
    if (!game.classList.contains('hidden')) {
        loadPuzzle(`foto${currentLevel}.webp`, grid);
    }
});
// ==========================================================================
// STATE MANAGEMENT & CONSTANTS
// ==========================================================================
let state = {
  user: 'Invitado',
  mode: 'exam', // 'exam' | 'practice' | 'theme'
  selectedThemeId: '1',
  maxQuestions: 40,
  
  questionsList: [],
  currentIndex: 0,
  score: 0,
  incorrectCount: 0,
  userAnswers: [], // stores { questionId, type, userAnswer, isCorrect, correctAnswers }
  
  // Matching Question state
  selectedColAKey: null,
  currentMatchingLinks: {}, // e.g., { 'A': '1', 'B': '3' }
  
  // Timer state
  timerInterval: null,
  secondsLeft: 0,
  totalTimerDuration: 0,
  timeTaken: 0, // seconds elapsed
  startTime: null
};

// Web Audio API context
let audioCtx = null;
let soundEnabled = true;

// Custom Theme Names Mapping
const THEME_MAP = {
  '1': 'TEMA I: Sistemas operativos, administración de servicios y soporte',
  '2': 'TEMA II: Redes, switching y routing',
  '3': 'TEMA III: Seguridad de la información, auditoría y políticas',
  '4': 'TEMA IV: Gestión de servicios de TI, gobernanza y calidad'
};

// DOM Elements cache
const DOM = {
  // Screens
  startScreen: document.getElementById('start-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultsScreen: document.getElementById('results-screen'),
  
  // Start Screen Elements
  usernameInput: document.getElementById('username'),
  modeCards: document.querySelectorAll('.mode-card'),
  settingsPanel: document.getElementById('settings-panel'),
  themeSelectorGroup: document.getElementById('theme-selector-group'),
  themeSelect: document.getElementById('theme-select'),
  questionCountGroup: document.getElementById('question-count-group'),
  questionCountSlider: document.getElementById('question-count-slider'),
  questionCountVal: document.getElementById('question-count-val'),
  startBtn: document.getElementById('start-btn'),
  
  // Quiz Screen Elements
  progressFill: document.getElementById('quiz-progress-fill'),
  themeBadge: document.getElementById('question-theme-badge'),
  counterBadge: document.getElementById('question-counter'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  matchingHelper: document.getElementById('matching-helper'),
  matchingConnections: document.getElementById('matching-connections'),
  feedbackPanel: document.getElementById('feedback-panel'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackDesc: document.getElementById('feedback-desc'),
  verifyBtn: document.getElementById('verify-btn'),
  nextBtn: document.getElementById('next-btn'),
  exitQuizBtn: document.getElementById('exit-quiz-btn'),
  finishEarlyBtn: document.getElementById('finish-early-btn'),
  
  // Quiz Sidebar
  timerCircle: document.getElementById('timer-circle-progress'),
  timerText: document.getElementById('timer-text'),
  statCorrect: document.getElementById('stat-correct'),
  statIncorrect: document.getElementById('stat-incorrect'),
  sidebarMode: document.getElementById('sidebar-mode-val'),
  sidebarUser: document.getElementById('sidebar-user-val'),
  
  // Results Screen Elements
  resultMessage: document.getElementById('result-message'),
  radialProgress: document.getElementById('radial-progress'),
  resultPercentage: document.getElementById('result-percentage'),
  resultCorrectCount: document.getElementById('result-correct-count'),
  resultTotalCount: document.getElementById('result-total-count'),
  resultTimeTaken: document.getElementById('result-time-taken'),
  resultMode: document.getElementById('result-mode-val'),
  resultRating: document.getElementById('result-rating-val'),
  categoryBars: document.getElementById('category-bars-container'),
  restartBtn: document.getElementById('restart-btn'),
  viewScoreboardBtn: document.getElementById('view-scoreboard-btn'),
  scoreboardSection: document.getElementById('scoreboard-section'),
  closeScoreboardBtn: document.getElementById('close-scoreboard-btn'),
  scoreboardBody: document.getElementById('scoreboard-body'),
  reviewFilters: document.querySelectorAll('.review-filters .filter-btn'),
  reviewList: document.getElementById('review-list-container'),
  
  // Global Header Controls
  soundBtn: document.getElementById('sound-btn'),
  themeBtn: document.getElementById('theme-btn')
};

// ==========================================================================
// SOUND SYNTHESIS (WEB AUDIO)
// ==========================================================================
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'success') {
      osc.type = 'sine';
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'click') {
      osc.type = 'sine';
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.frequency.setValueAtTime(580, now);
      
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.frequency.setValueAtTime(880, now); // A5
      
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (err) {
    console.error('Audio synthesizer error:', err);
  }
}

// ==========================================================================
// SHUFFLE & HELPERS
// ==========================================================================
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseMatchingAnswer(ansStr) {
  const links = {};
  ansStr.split(',').forEach(part => {
    const [a, b] = part.trim().split('-');
    if (a && b) links[a] = b;
  });
  return links;
}

// ==========================================================================
// APP INITIALIZATION & THEME/SOUND TOGGLES
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Setup SVG Timer circumference
  if (DOM.timerCircle) {
    DOM.timerCircle.style.strokeDasharray = 283;
    DOM.timerCircle.style.strokeDashoffset = 283;
  }
  
  // Theme load
  const cachedTheme = localStorage.getItem('sysnetsim-theme') || 'light';
  if (cachedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    DOM.themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    DOM.themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  // Sound load
  const cachedSound = localStorage.getItem('sysnetsim-sound');
  if (cachedSound === 'false') {
    soundEnabled = false;
    DOM.soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  }
  
  initEventListeners();
});

function initEventListeners() {
  // Sound Button
  DOM.soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sysnetsim-sound', soundEnabled);
    DOM.soundBtn.innerHTML = soundEnabled 
      ? '<i class="fa-solid fa-volume-high"></i>' 
      : '<i class="fa-solid fa-volume-xmark"></i>';
    if (soundEnabled) {
      initAudio();
      playSound('click');
    }
  });

  // Theme Button
  DOM.themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    playSound('click');
    if (isDark) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      DOM.themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem('sysnetsim-theme', 'light');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      DOM.themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
      localStorage.setItem('sysnetsim-theme', 'dark');
    }
  });

  // Welcome Mode Cards Toggle
  DOM.modeCards.forEach(card => {
    card.addEventListener('click', () => {
      DOM.modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const mode = card.getAttribute('data-mode');
      state.mode = mode;
      playSound('click');
      
      // Update dynamic configuration panels
      DOM.themeSelectorGroup.classList.add('hidden');
      DOM.questionCountGroup.classList.add('hidden');
      
      if (mode === 'practice') {
        DOM.questionCountGroup.classList.remove('hidden');
      } else if (mode === 'theme') {
        DOM.themeSelectorGroup.classList.remove('hidden');
      }
      
      // Update Start Button text
      if (mode === 'exam') {
        DOM.startBtn.innerHTML = '¡Comenzar Simulación! <i class="fa-solid fa-play"></i>';
      } else if (mode === 'practice') {
        DOM.startBtn.innerHTML = '¡Comenzar Práctica! <i class="fa-solid fa-dumbbell"></i>';
      } else {
        DOM.startBtn.innerHTML = '¡Comenzar Estudio! <i class="fa-solid fa-book-open"></i>';
      }
    });
  });

  // Slider change
  DOM.questionCountSlider.addEventListener('input', (e) => {
    DOM.questionCountVal.textContent = e.target.value;
  });

  // Start Button Click
  DOM.startBtn.addEventListener('click', () => {
    playSound('click');
    startQuiz();
  });

  // Verify Answer Button
  DOM.verifyBtn.addEventListener('click', () => {
    verifyAnswer();
  });

  // Next Question Button
  DOM.nextBtn.addEventListener('click', () => {
    playSound('click');
    loadNextQuestion();
  });

  // Exit Quiz
  DOM.exitQuizBtn.addEventListener('click', () => {
    playSound('click');
    if (confirm('¿Estás seguro de que deseas salir del simulador? Se perderá tu progreso actual.')) {
      resetToStart();
    }
  });

  // Finish Early
  DOM.finishEarlyBtn.addEventListener('click', () => {
    playSound('click');
    if (confirm('¿Deseas finalizar la simulación ahora y ver tus resultados?')) {
      endQuiz();
    }
  });

  // Restart Button on Results Screen
  DOM.restartBtn.addEventListener('click', () => {
    playSound('click');
    resetToStart();
  });

  // Scoreboard View Toggle
  DOM.viewScoreboardBtn.addEventListener('click', () => {
    playSound('click');
    DOM.scoreboardSection.classList.toggle('active');
    loadScoreboard();
  });

  DOM.closeScoreboardBtn.addEventListener('click', () => {
    playSound('click');
    DOM.scoreboardSection.classList.remove('active');
  });

  // Review Filters
  DOM.reviewFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.reviewFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playSound('click');
      
      const filter = btn.getAttribute('data-filter');
      renderReviewList(filter);
    });
  });
}

// ==========================================================================
// QUIZ ENGINE
// ==========================================================================
function startQuiz() {
  // Set User
  state.user = DOM.usernameInput.value.trim() || 'Invitado';
  
  // Setup questions list based on Mode
  let baseQuestions = [...QUESTIONS];
  
  if (state.mode === 'exam') {
    state.questionsList = shuffle(baseQuestions).slice(0, 60);
    state.totalTimerDuration = 60 * 60; // 60 minutes
  } else if (state.mode === 'practice') {
    state.maxQuestions = parseInt(DOM.questionCountSlider.value);
    state.questionsList = shuffle(baseQuestions).slice(0, state.maxQuestions);
    state.totalTimerDuration = 0; // infinite time
  } else if (state.mode === 'theme') {
    const selectedThemeVal = DOM.themeSelect.value;
    const themeName = THEME_MAP[selectedThemeVal];
    // Filter questions by prefix or matching name
    state.questionsList = baseQuestions.filter(q => q.theme.startsWith(`TEMA ${selectedThemeVal === '1' ? 'I' : selectedThemeVal === '2' ? 'II' : selectedThemeVal === '3' ? 'III' : 'IV'}`));
    state.questionsList = shuffle(state.questionsList);
    state.totalTimerDuration = 0; // infinite
  }
  
  // Setup score state
  state.currentIndex = 0;
  state.score = 0;
  state.incorrectCount = 0;
  state.userAnswers = [];
  state.startTime = Date.now();
  state.timeTaken = 0;
  
  // Sidebar setup
  DOM.sidebarUser.textContent = state.user;
  DOM.sidebarMode.textContent = state.mode === 'exam' ? 'Examen' : state.mode === 'practice' ? 'Práctica' : 'Tema';
  DOM.statCorrect.textContent = '0';
  DOM.statIncorrect.textContent = '0';

  // Screen transition
  DOM.startScreen.classList.remove('active');
  DOM.quizScreen.classList.add('active');

  // Start Timer
  startTimer();
  
  // Load Question
  loadQuestion();
}

function resetToStart() {
  clearInterval(state.timerInterval);
  DOM.quizScreen.classList.remove('active');
  DOM.resultsScreen.classList.remove('active');
  DOM.scoreboardSection.classList.remove('active');
  DOM.startScreen.classList.add('active');
}

// ==========================================================================
// TIMER FUNCTIONALITY
// ==========================================================================
function startTimer() {
  clearInterval(state.timerInterval);
  
  if (state.totalTimerDuration > 0) {
    state.secondsLeft = state.totalTimerDuration;
    DOM.timerText.textContent = formatTime(state.secondsLeft);
    updateTimerCircle(1);
    
    state.timerInterval = setInterval(() => {
      state.secondsLeft--;
      state.timeTaken++;
      
      DOM.timerText.textContent = formatTime(state.secondsLeft);
      
      const percent = state.secondsLeft / state.totalTimerDuration;
      updateTimerCircle(percent);
      
      // Play warning sound if 30s left
      if (state.secondsLeft <= 30 && state.secondsLeft > 0) {
        playSound('warning');
      }

      if (state.secondsLeft <= 0) {
        clearInterval(state.timerInterval);
        playSound('error');
        alert('Se ha agotado el tiempo del examen.');
        endQuiz();
      }
    }, 1000);
  } else {
    // Practice/Theme Mode: count elapsed time
    state.secondsLeft = 0;
    DOM.timerText.textContent = '00:00';
    updateTimerCircle(1);
    
    state.timerInterval = setInterval(() => {
      state.timeTaken++;
      DOM.timerText.textContent = formatTime(state.timeTaken);
    }, 1000);
  }
}

function updateTimerCircle(percent) {
  if (!DOM.timerCircle) return;
  const offset = 283 - (percent * 283);
  DOM.timerCircle.style.strokeDashoffset = offset;
  
  if (state.totalTimerDuration > 0) {
    if (percent < 0.2) {
      DOM.timerCircle.style.stroke = 'var(--color-error)';
    } else if (percent < 0.5) {
      DOM.timerCircle.style.stroke = 'var(--color-warning)';
    } else {
      DOM.timerCircle.style.stroke = 'var(--accent-color)';
    }
  } else {
    DOM.timerCircle.style.stroke = 'var(--accent-color)';
  }
}

// ==========================================================================
// QUESTION LOADING & RENDERING
// ==========================================================================
function loadQuestion() {
  // Clear previous values
  DOM.feedbackPanel.classList.add('hidden');
  DOM.verifyBtn.classList.remove('hidden');
  DOM.nextBtn.classList.add('hidden');
  DOM.optionsContainer.className = 'options-container'; // reset layout
  DOM.optionsContainer.innerHTML = '';
  DOM.matchingHelper.classList.add('hidden');
  DOM.matchingConnections.innerHTML = '';
  
  state.selectedColAKey = null;
  state.currentMatchingLinks = {};
  
  // Current question data
  const q = state.questionsList[state.currentIndex];
  
  // Update progress UI
  const progressPercent = (state.currentIndex / state.questionsList.length) * 100;
  DOM.progressFill.style.width = `${progressPercent}%`;
  DOM.counterBadge.textContent = `Pregunta ${state.currentIndex + 1} de ${state.questionsList.length}`;
  DOM.themeBadge.textContent = q.theme;
  DOM.questionText.textContent = q.text;

  // Render options based on type
  if (q.type === 'true_false') {
    DOM.optionsContainer.classList.add('options-tf-layout');
    
    q.options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'option-item';
      btn.innerHTML = `
        <div class="option-letter"><i class="fa-solid fa-circle"></i></div>
        <div class="option-text">${option}</div>
      `;
      btn.addEventListener('click', () => selectOption(btn, option));
      DOM.optionsContainer.appendChild(btn);
    });
    
  } else if (q.type === 'multiple_choice') {
    // Shuffle multiple choice options to make it highly dynamic
    // Copy options array so we don't mutate original questions.json
    let optionsCopy = [...q.options];
    shuffle(optionsCopy);
    
    optionsCopy.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'option-item';
      btn.innerHTML = `
        <div class="option-letter">${option.letter}</div>
        <div class="option-text">${option.text}</div>
      `;
      btn.addEventListener('click', () => selectOption(btn, option.letter));
      DOM.optionsContainer.appendChild(btn);
    });
    
  } else if (q.type === 'matching') {
    DOM.matchingHelper.classList.remove('hidden');
    
    // Render columns: A (left) and B (right)
    const matchingLayout = document.createElement('div');
    matchingLayout.className = 'matching-layout';
    
    const colA = document.createElement('div');
    colA.className = 'matching-column';
    colA.innerHTML = '<h5>Columna A</h5>';
    
    const colB = document.createElement('div');
    colB.className = 'matching-column';
    colB.innerHTML = '<h5>Columna B</h5>';
    
    // Shuffle columns to make matching interesting
    let shuffledA = [...q.matchingColumnA];
    let shuffledB = [...q.matchingColumnB];
    shuffle(shuffledA);
    shuffle(shuffledB);
    
    shuffledA.forEach(item => {
      const div = document.createElement('div');
      div.className = 'matching-item';
      div.setAttribute('data-side', 'A');
      div.setAttribute('data-key', item.key);
      div.innerHTML = `
        <div class="matching-key">${item.key}</div>
        <div class="matching-text">${item.text}</div>
      `;
      div.addEventListener('click', () => handleMatchingClick(div, 'A', item.key));
      colA.appendChild(div);
    });
    
    shuffledB.forEach(item => {
      const div = document.createElement('div');
      div.className = 'matching-item';
      div.setAttribute('data-side', 'B');
      div.setAttribute('data-key', item.key);
      div.innerHTML = `
        <div class="matching-key">${item.key}</div>
        <div class="matching-text">${item.text}</div>
      `;
      div.addEventListener('click', () => handleMatchingClick(div, 'B', item.key));
      colB.appendChild(div);
    });
    
    matchingLayout.appendChild(colA);
    matchingLayout.appendChild(colB);
    DOM.optionsContainer.appendChild(matchingLayout);
  }
}

// ==========================================================================
// SELECTION LOGIC
// ==========================================================================
let currentSelection = null; // Stores currently selected single answer for TF or MC

function selectOption(btnElement, answerValue) {
  // Check if already verified (next button is visible)
  if (!DOM.nextBtn.classList.contains('hidden')) return;
  
  playSound('click');
  
  // Remove selection from all options
  const items = DOM.optionsContainer.querySelectorAll('.option-item');
  items.forEach(el => el.classList.remove('selected'));
  
  btnElement.classList.add('selected');
  currentSelection = answerValue;
}

function handleMatchingClick(itemElement, side, key) {
  // If already verified, do nothing
  if (!DOM.nextBtn.classList.contains('hidden')) return;
  
  playSound('click');
  
  if (side === 'A') {
    // If clicking an already active Col A, deactivate it
    if (state.selectedColAKey === key) {
      itemElement.classList.remove('active');
      state.selectedColAKey = null;
      return;
    }
    
    // Remove active from all other A items
    const colAItems = DOM.optionsContainer.querySelectorAll('[data-side="A"]');
    colAItems.forEach(el => el.classList.remove('active'));
    
    itemElement.classList.add('active');
    state.selectedColAKey = key;
    
  } else {
    // Clicking Column B
    if (!state.selectedColAKey) {
      playSound('error');
      alert('Selecciona primero un elemento de la Columna A.');
      return;
    }
    
    // Create connection: selectedColAKey ➔ clickedColBKey
    // Remove any previous connection for this A key or B key (1-to-1 matching)
    for (const aKey in state.currentMatchingLinks) {
      if (aKey === state.selectedColAKey || state.currentMatchingLinks[aKey] === key) {
        delete state.currentMatchingLinks[aKey];
      }
    }
    
    state.currentMatchingLinks[state.selectedColAKey] = key;
    
    // Clear selection
    const colAItems = DOM.optionsContainer.querySelectorAll('[data-side="A"]');
    colAItems.forEach(el => el.classList.remove('active'));
    state.selectedColAKey = null;
    
    renderMatchingConnections();
  }
}

function renderMatchingConnections() {
  // Clear styles
  const allItems = DOM.optionsContainer.querySelectorAll('.matching-item');
  allItems.forEach(el => {
    el.classList.remove('linked', 'pair-1', 'pair-2', 'pair-3', 'pair-4');
  });
  
  DOM.matchingConnections.innerHTML = '';
  
  // Visual keys mapping indices for color-coding pairs
  const pairKeys = Object.keys(state.currentMatchingLinks);
  pairKeys.sort(); // sort alphabetically A, B, C...
  
  pairKeys.forEach((aKey, idx) => {
    const bKey = state.currentMatchingLinks[aKey];
    const pairClass = `pair-${idx + 1}`;
    
    // Find matching items in UI and add color classes
    const aItem = DOM.optionsContainer.querySelector(`[data-side="A"][data-key="${aKey}"]`);
    const bItem = DOM.optionsContainer.querySelector(`[data-side="B"][data-key="${bKey}"]`);
    
    if (aItem) aItem.classList.add('linked', pairClass);
    if (bItem) bItem.classList.add('linked', pairClass);
    
    // Create visual badge/chip
    const chip = document.createElement('div');
    chip.className = `connection-chip ${pairClass}`;
    chip.innerHTML = `
      <span>${aKey} ➔ ${bKey}</span>
      <button class="remove-link-btn" onclick="removeLink('${aKey}')"><i class="fa-solid fa-xmark"></i></button>
    `;
    DOM.matchingConnections.appendChild(chip);
  });
}

// Global window reference to allow calling from HTML chip template
window.removeLink = function(aKey) {
  if (!DOM.nextBtn.classList.contains('hidden')) return;
  playSound('click');
  delete state.currentMatchingLinks[aKey];
  renderMatchingConnections();
};

// ==========================================================================
// VERIFICATION & SCORE CALCULATION
// ==========================================================================
function verifyAnswer() {
  const q = state.questionsList[state.currentIndex];
  let isCorrect = false;
  let userAnswerStr = '';
  
  if (q.type === 'true_false' || q.type === 'multiple_choice') {
    if (!currentSelection) {
      alert('Por favor selecciona una respuesta antes de continuar.');
      return;
    }
    
    userAnswerStr = currentSelection;
    isCorrect = (currentSelection.toString().toLowerCase() === q.answer.toString().toLowerCase());
    
    // Highlight options in UI
    const items = DOM.optionsContainer.querySelectorAll('.option-item');
    items.forEach(el => {
      const optText = el.querySelector('.option-text').textContent;
      const optLetter = el.querySelector('.option-letter').textContent.trim();
      
      // Determine what type of match to make
      const isSelected = el.classList.contains('selected');
      const isOptionCorrect = (q.type === 'true_false' && optText.toLowerCase() === q.answer.toLowerCase()) ||
                              (q.type === 'multiple_choice' && optLetter.toLowerCase() === q.answer.toLowerCase());
      
      if (isOptionCorrect) {
        el.classList.add('correct-answer');
      } else if (isSelected && !isCorrect) {
        el.classList.add('wrong-answer');
      }
    });
    
  } else if (q.type === 'matching') {
    // Verify matching logic
    const expectedKeys = q.matchingColumnA.map(item => item.key);
    const linkedKeys = Object.keys(state.currentMatchingLinks);
    
    if (linkedKeys.length < expectedKeys.length) {
      alert('Une todos los elementos de la Columna A con la Columna B antes de verificar.');
      return;
    }
    
    // Format links: "A-1, B-3, C-2"
    linkedKeys.sort();
    const linksArray = linkedKeys.map(k => `${k}-${state.currentMatchingLinks[k]}`);
    userAnswerStr = linksArray.join(', ');
    
    const correctLinks = parseMatchingAnswer(q.answer);
    
    // Compare maps
    isCorrect = true;
    expectedKeys.forEach(k => {
      if (state.currentMatchingLinks[k] !== correctLinks[k]) {
        isCorrect = false;
      }
      
      // Color individual nodes based on correctness of this link
      const aNode = DOM.optionsContainer.querySelector(`[data-side="A"][data-key="${k}"]`);
      const bNode = DOM.optionsContainer.querySelector(`[data-side="B"][data-key="${state.currentMatchingLinks[k]}"]`);
      
      const isLinkCorrect = (state.currentMatchingLinks[k] === correctLinks[k]);
      
      if (aNode && bNode) {
        if (isLinkCorrect) {
          aNode.classList.add('correct-match');
          bNode.classList.add('correct-match');
        } else {
          aNode.classList.add('wrong-match');
          bNode.classList.add('wrong-match');
        }
      }
    });
  }

  // Update statistics
  if (isCorrect) {
    state.score++;
    DOM.statCorrect.textContent = state.score;
    playSound('success');
    
    DOM.feedbackPanel.className = 'feedback-panel success';
    DOM.feedbackIcon.className = 'fa-solid fa-check';
    DOM.feedbackTitle.textContent = '¡Correcto!';
    DOM.feedbackDesc.textContent = 'Tu respuesta es correcta. Sigue así.';
  } else {
    state.incorrectCount++;
    DOM.statIncorrect.textContent = state.incorrectCount;
    playSound('error');
    
    DOM.feedbackPanel.className = 'feedback-panel error';
    DOM.feedbackIcon.className = 'fa-solid fa-xmark';
    DOM.feedbackTitle.textContent = 'Incorrecto';
    
    if (q.type === 'matching') {
      DOM.feedbackDesc.textContent = `La relación correcta es: ${q.answer}`;
    } else {
      DOM.feedbackDesc.textContent = `La respuesta correcta era: ${q.answer}`;
    }
  }
  
  DOM.feedbackPanel.classList.remove('hidden');
  DOM.verifyBtn.classList.add('hidden');
  DOM.nextBtn.classList.remove('hidden');
  
  // Store user response
  state.userAnswers.push({
    questionId: q.id,
    theme: q.theme,
    type: q.type,
    text: q.text,
    userAnswer: userAnswerStr,
    correctAnswer: q.answer,
    isCorrect: isCorrect
  });
  
  // Reset active selection holder
  currentSelection = null;
}

function loadNextQuestion() {
  state.currentIndex++;
  
  if (state.currentIndex < state.questionsList.length) {
    loadQuestion();
  } else {
    endQuiz();
  }
}

// ==========================================================================
// RESULTS & REPORT GENERATION
// ==========================================================================
function endQuiz() {
  clearInterval(state.timerInterval);
  
  // Calculate total time taken
  if (state.totalTimerDuration > 0) {
    state.timeTaken = state.totalTimerDuration - state.secondsLeft;
  }
  
  // Hide Quiz Screen, Show Results Screen
  DOM.quizScreen.classList.remove('active');
  DOM.resultsScreen.classList.add('active');
  
  const totalQuestions = state.questionsList.length;
  const scorePercent = totalQuestions > 0 ? Math.round((state.score / totalQuestions) * 100) : 0;
  
  // Setup Radial Progress animation
  DOM.resultPercentage.textContent = `${scorePercent}%`;
  DOM.resultCorrectCount.textContent = state.score;
  DOM.resultTotalCount.textContent = totalQuestions;
  DOM.resultTimeTaken.textContent = formatTime(state.timeTaken);
  DOM.resultMode.textContent = state.mode === 'exam' ? 'Examen' : state.mode === 'practice' ? 'Práctica' : 'Tema';
  
  // Animate SVG Radial circle
  const dashoffset = 314 - (scorePercent / 100) * 314;
  DOM.radialProgress.style.strokeDasharray = 314;
  DOM.radialProgress.style.strokeDashoffset = 314;
  setTimeout(() => {
    DOM.radialProgress.style.strokeDashoffset = dashoffset;
  }, 100);
  
  // Result rating and message
  let rating = 'Reprobado';
  let message = 'Te recomendamos repasar los temas y volver a intentarlo.';
  
  if (scorePercent >= 85) {
    rating = 'Sobresaliente';
    message = '¡Increíble! Tienes un dominio excelente de las materias de redes y sistemas.';
    playSound('success');
  } else if (scorePercent >= 70) {
    rating = 'Aprobado';
    message = '¡Felicidades! Has aprobado el simulador con un buen promedio.';
  }
  
  DOM.resultRating.textContent = rating;
  DOM.resultMessage.textContent = message;
  
  // Category Breakdown calculations
  generateCategoryBars();
  
  // Save scores to backend or local storage
  saveScore(scorePercent);
  
  // Render detailed review list
  renderReviewList('all');
}

function generateCategoryBars() {
  DOM.categoryBars.innerHTML = '';
  
  // Categorize responses by theme
  const themesSummary = {};
  
  // Initialize map
  for (const tid in THEME_MAP) {
    themesSummary[THEME_MAP[tid]] = { correct: 0, total: 0 };
  }
  
  state.userAnswers.forEach(ans => {
    // Theme matching
    let matchingThemeName = null;
    for (const tid in THEME_MAP) {
      if (ans.theme.startsWith(THEME_MAP[tid].substring(0, 8))) {
        matchingThemeName = THEME_MAP[tid];
        break;
      }
    }
    
    if (matchingThemeName) {
      themesSummary[matchingThemeName].total++;
      if (ans.isCorrect) {
        themesSummary[matchingThemeName].correct++;
      }
    }
  });

  // Render bars
  for (const themeName in themesSummary) {
    const data = themesSummary[themeName];
    if (data.total === 0) continue; // skip categories with no questions rendered
    
    const percent = Math.round((data.correct / data.total) * 100);
    
    // Choose progress color
    let barColor = 'var(--color-error)';
    if (percent >= 80) barColor = 'var(--color-success)';
    else if (percent >= 50) barColor = 'var(--color-warning)';
    
    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-label">
        <span>${themeName}</span>
        <span>${data.correct}/${data.total} (${percent}%)</span>
      </div>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width: ${percent}%; background: ${barColor};"></div>
      </div>
    `;
    DOM.categoryBars.appendChild(row);
  }
}

// ==========================================================================
// REVIEW SECTION FILTERS & RENDERING
// ==========================================================================
function renderReviewList(filter) {
  DOM.reviewList.innerHTML = '';
  
  let listToRender = state.userAnswers;
  if (filter === 'correct') {
    listToRender = state.userAnswers.filter(ans => ans.isCorrect);
  } else if (filter === 'incorrect') {
    listToRender = state.userAnswers.filter(ans => !ans.isCorrect);
  }
  
  if (listToRender.length === 0) {
    DOM.reviewList.innerHTML = `<div class="text-center text-muted py-3">No hay preguntas que coincidan con este filtro.</div>`;
    return;
  }
  
  listToRender.forEach((ans, idx) => {
    const item = document.createElement('div');
    item.className = `review-item ${ans.isCorrect ? 'correct' : 'incorrect'}`;
    item.innerHTML = `
      <div class="review-title-row">
        <span>Pregunta ID: #${ans.questionId} (${ans.isCorrect ? 'Correcta' : 'Incorrecta'})</span>
        <span class="${ans.isCorrect ? 'text-success' : 'text-danger'}">
          <i class="fa-solid ${ans.isCorrect ? 'fa-check' : 'fa-xmark'}"></i>
        </span>
      </div>
      <div class="review-q-text">${ans.text}</div>
      <div class="review-answer-box">
        <span><strong>Tu respuesta:</strong> ${ans.userAnswer}</span>
        ${!ans.isCorrect ? `<span><strong>Respuesta esperada:</strong> ${ans.correctAnswer}</span>` : ''}
      </div>
    `;
    DOM.reviewList.appendChild(item);
  });
}

// ==========================================================================
// DATABASE / HISTORY SERVICE (REST API & LOCALSTORAGE FALLBACK)
// ==========================================================================
function saveScore(percentage) {
  const scoreData = {
    name: state.user,
    score: percentage,
    totalQuestions: state.questionsList.length,
    mode: state.mode === 'exam' ? 'Examen' : state.mode === 'practice' ? 'Práctica' : 'Tema',
    date: new Date().toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    categoryBreakdown: {}
  };
  
  // Save to LocalStorage (primary for offline/mobile)
  saveScoreToLocalStorage(scoreData);
  
  // Optionally try to also POST to server if available (non-blocking)
  fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scoreData),
    timeout: 2000 // 2 second timeout to avoid hanging on mobile
  })
  .then(res => {
    if (res.ok) {
      console.log('✓ Score also synced to server');
    }
  })
  .catch(err => {
    // Silent fail - already saved locally
  });
}

function saveScoreToLocalStorage(scoreData) {
  let scores = [];
  try {
    scores = JSON.parse(localStorage.getItem('sysnetsim-scores')) || [];
  } catch (e) {
    scores = [];
  }
  scores.push(scoreData);
  localStorage.setItem('sysnetsim-scores', JSON.stringify(scores));
}

function loadScoreboard() {
  DOM.scoreboardBody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando puntuaciones...</td></tr>';
  
  // Load from LocalStorage first (fast, always available)
  let scores = [];
  try {
    scores = JSON.parse(localStorage.getItem('sysnetsim-scores')) || [];
  } catch (e) {
    scores = [];
  }
  renderScoreboardTable(scores);
  
  // Optionally try to fetch from server if available (non-blocking)
  fetch('/api/scores', { timeout: 3000 })
  .then(res => {
    if (res.ok) return res.json();
    throw new Error('Server unreachable');
  })
  .then(serverScores => {
    console.log('✓ Scores updated from server');
    renderScoreboardTable(serverScores);
  })
  .catch(err => {
    // Silent fail - already showing local scores
  });
}

function renderScoreboardTable(scores) {
  DOM.scoreboardBody.innerHTML = '';
  
  if (scores.length === 0) {
    DOM.scoreboardBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay puntuaciones registradas aún.</td></tr>';
    return;
  }
  
  // Sort scores by date descending
  scores.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Limit to top 10 scores
  const recentScores = scores.slice(0, 10);
  
  recentScores.forEach(s => {
    // Format date cleanly
    let dateStr = s.date;
    if (s.date.includes('T')) {
      dateStr = new Date(s.date).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${s.name}</strong></td>
      <td><span class="badge badge-outline">${s.mode}</span></td>
      <td>${dateStr}</td>
      <td>${s.score >= 70 ? `<span class="text-success">${s.score}%</span>` : `<span class="text-danger">${s.score}%</span>`}</td>
      <td>${s.score >= 70 ? '<strong class="text-success">Aprobado</strong>' : '<strong class="text-danger">Reprobado</strong>'}</td>
    `;
    DOM.scoreboardBody.appendChild(row);
  });
}

// ==========================================================================
// PWA INSTALL PROMPT
// ==========================================================================
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir el mini-infobar automático del navegador
  e.preventDefault();
  deferredInstallPrompt = e;

  // Verificar si el usuario ya lo descartó antes
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) return;

  // Mostrar el banner personalizado
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.classList.remove('hidden');
  }
});

// Botón "Instalar"
document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;

  // Mostrar el prompt nativo del navegador
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;

  if (outcome === 'accepted') {
    console.log('[PWA] Usuario aceptó la instalación');
  }

  deferredInstallPrompt = null;
  document.getElementById('pwa-install-banner')?.classList.add('hidden');
});

// Botón "Ahora no"
document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
  document.getElementById('pwa-install-banner')?.classList.add('hidden');
  localStorage.setItem('pwa-install-dismissed', 'true');
  deferredInstallPrompt = null;
});

// Ocultar banner si ya está instalada
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App instalada exitosamente');
  document.getElementById('pwa-install-banner')?.classList.add('hidden');
  deferredInstallPrompt = null;
});

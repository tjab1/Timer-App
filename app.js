// Timer App - Main Application Logic

class IntervalTimer {
    constructor() {
        // DOM Elements
        this.homeScreen = document.getElementById('home-screen');
        this.completionScreen = document.getElementById('completion-screen');
        this.currentLevelEl = document.getElementById('current-level');
        this.timeDisplay = document.getElementById('time-display');
        this.statusDisplay = document.getElementById('status-display');
        this.fillOverlay = document.getElementById('fill-overlay');
        this.phaseInfo = document.getElementById('phase-info');
        this.roundInfo = document.getElementById('round-info');
        this.startBtn = document.getElementById('start-btn');
        this.goAgainBtn = document.getElementById('go-again-btn');
        this.homeBtn = document.getElementById('home-btn');
        this.completedLevelEl = document.getElementById('completed-level');
        this.levelSelect = document.getElementById('level-select');

        // State
        this.currentLevel = this.loadLevel();
        this.isRunning = false;
        this.isPaused = false;
        this.currentRound = 1;
        this.totalRounds = 2;
        this.currentPhase = 0;
        this.currentSet = 0;
        this.timerInterval = null;
        this.remainingTime = 0;
        this.totalPhaseTime = 0;

        // Constants
        this.REST_BETWEEN_SETS = 1.5; // seconds
        this.REST_BETWEEN_ROUNDS = 8; // seconds

        // Initialize
        this.init();
    }

    init() {
        this.applyLevelDecay();
        this.updateLevelDisplay();
        this.updatePhaseInfo();
        this.bindEvents();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.handleStartClick());
        this.goAgainBtn.addEventListener('click', () => this.goAgain());
        this.homeBtn.addEventListener('click', () => this.goHome());
        this.levelSelect.addEventListener('change', (e) => this.onLevelChange(e));
    }

    onLevelChange(e) {
        if (this.isRunning) {
            // Revert to current level if timer is running
            this.levelSelect.value = this.currentLevel;
            return;
        }

        this.currentLevel = parseInt(e.target.value, 10);
        this.saveLevel(this.currentLevel);
        this.updatePhaseInfo();
    }

    setLevelSelectEnabled(enabled) {
        this.levelSelect.disabled = !enabled;
    }

    // Level configuration generator
    getLevelConfig(level) {
        // Pattern: odd levels use base durations, even levels use increased durations
        // Sets increase every 2 levels
        const setIncrement = Math.floor((level - 1) / 2);
        const useIncreasedDurations = level % 2 === 0;

        const baseSets = [5, 7, 3];
        const baseDurations = [6, 1, 8];
        const increasedDurations = [7, 1.5, 10];

        const sets = baseSets.map(s => s + setIncrement);
        const durations = useIncreasedDurations ? increasedDurations : baseDurations;

        return {
            phases: [
                { sets: sets[0], duration: durations[0], name: 'Phase 1' },
                { sets: sets[1], duration: durations[1], name: 'Phase 2' },
                { sets: sets[2], duration: durations[2], name: 'Phase 3' }
            ]
        };
    }

    // Storage
    loadLevel() {
        const saved = localStorage.getItem('timerLevel');
        return saved ? parseInt(saved, 10) : 1;
    }

    saveLevel(level) {
        localStorage.setItem('timerLevel', level.toString());
    }

    loadLastExerciseTime() {
        const saved = localStorage.getItem('lastExerciseTime');
        return saved ? parseInt(saved, 10) : null;
    }

    saveLastExerciseTime() {
        localStorage.setItem('lastExerciseTime', Date.now().toString());
    }

    applyLevelDecay() {
        const lastExercise = this.loadLastExerciseTime();
        if (!lastExercise) return; // No previous exercise, no decay

        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysMissed = Math.floor((now - lastExercise) / msPerDay);

        if (daysMissed > 0) {
            const newLevel = Math.max(1, this.currentLevel - daysMissed);
            if (newLevel !== this.currentLevel) {
                this.currentLevel = newLevel;
                this.saveLevel(this.currentLevel);
            }
        }
    }

    // Display updates
    updateLevelDisplay() {
        this.levelSelect.value = this.currentLevel;
    }

    updateTimeDisplay(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const decimal = Math.floor((seconds % 1) * 10);

        if (seconds < 60) {
            this.timeDisplay.textContent = `${secs}.${decimal}`;
        } else {
            this.timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }

    updateFillAngle(progress) {
        const angle = progress * 360;
        this.fillOverlay.style.setProperty('--fill-angle', `${angle}deg`);
    }

    updatePhaseInfo() {
        if (!this.isRunning) {
            const config = this.getLevelConfig(this.currentLevel);
            const phaseStrings = config.phases.map((p, i) =>
                `P${i + 1}: ${p.sets}×${p.duration}s`
            ).join(' | ');
            this.phaseInfo.textContent = phaseStrings;
            this.roundInfo.textContent = `Round 1 of ${this.totalRounds}`;
        }
    }

    setStatus(text, isResting = false) {
        this.statusDisplay.textContent = text;
        if (isResting) {
            this.fillOverlay.classList.add('resting');
        } else {
            this.fillOverlay.classList.remove('resting');
        }
    }

    // Timer control
    handleStartClick() {
        if (!this.isRunning) {
            this.startSequence();
        } else if (this.isPaused) {
            this.resumeTimer();
        } else {
            this.pauseTimer();
        }
    }

    startSequence() {
        this.isRunning = true;
        this.currentRound = 1;
        this.currentPhase = 0;
        this.currentSet = 0;
        this.startBtn.textContent = 'Pause';
        this.setLevelSelectEnabled(false);
        this.runPhase();
    }

    pauseTimer() {
        this.isPaused = true;
        this.startBtn.textContent = 'Resume';
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    resumeTimer() {
        this.isPaused = false;
        this.startBtn.textContent = 'Pause';
        this.continueTimer();
    }

    continueTimer() {
        const startTime = Date.now() - ((this.totalPhaseTime - this.remainingTime) * 1000);

        this.timerInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            this.remainingTime = Math.max(0, this.totalPhaseTime - elapsed);

            this.updateTimeDisplay(this.remainingTime);
            this.updateFillAngle(1 - (this.remainingTime / this.totalPhaseTime));

            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                this.onIntervalComplete();
            }
        }, 50);
    }

    runPhase() {
        const config = this.getLevelConfig(this.currentLevel);
        const phase = config.phases[this.currentPhase];

        this.phaseInfo.textContent = `${phase.name}: Set ${this.currentSet + 1} of ${phase.sets}`;
        this.roundInfo.textContent = `Round ${this.currentRound} of ${this.totalRounds}`;

        this.runSet(phase.duration);
    }

    runSet(duration) {
        this.setStatus('Hold', false);
        this.totalPhaseTime = duration;
        this.remainingTime = duration;
        this.updateTimeDisplay(duration);
        this.updateFillAngle(0);

        this.continueTimer();
    }

    runRest(duration, callback) {
        this.setStatus('Rest', true);
        this.totalPhaseTime = duration;
        this.remainingTime = duration;
        this.updateTimeDisplay(duration);
        this.updateFillAngle(0);

        const startTime = Date.now();

        this.timerInterval = setInterval(() => {
            if (this.isPaused) return;

            const elapsed = (Date.now() - startTime) / 1000;
            this.remainingTime = Math.max(0, this.totalPhaseTime - elapsed);

            this.updateTimeDisplay(this.remainingTime);
            this.updateFillAngle(1 - (this.remainingTime / this.totalPhaseTime));

            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                callback();
            }
        }, 50);
    }

    onIntervalComplete() {
        const config = this.getLevelConfig(this.currentLevel);
        const phase = config.phases[this.currentPhase];

        this.currentSet++;

        // Check if we finished all sets in this phase
        if (this.currentSet >= phase.sets) {
            this.currentSet = 0;
            this.currentPhase++;

            // Check if we finished all phases in this round
            if (this.currentPhase >= config.phases.length) {
                this.currentPhase = 0;
                this.currentRound++;

                // Check if we finished all rounds
                if (this.currentRound > this.totalRounds) {
                    this.completeLevel();
                    return;
                }

                // Rest between rounds
                this.phaseInfo.textContent = 'Round Complete!';
                this.runRest(this.REST_BETWEEN_ROUNDS, () => this.runPhase());
                return;
            }

            // Rest between phases (using same rest as between sets)
            this.runRest(this.REST_BETWEEN_SETS, () => this.runPhase());
            return;
        }

        // Rest between sets
        this.phaseInfo.textContent = `${phase.name}: Rest`;
        this.runRest(this.REST_BETWEEN_SETS, () => {
            this.phaseInfo.textContent = `${phase.name}: Set ${this.currentSet + 1} of ${phase.sets}`;
            this.runSet(phase.duration);
        });
    }

    completeLevel() {
        this.isRunning = false;
        this.isPaused = false;
        this.startBtn.textContent = 'Start';
        this.setStatus('Complete!', false);
        this.updateFillAngle(0);

        // Save exercise completion time
        this.saveLastExerciseTime();

        // Show completion screen
        this.completedLevelEl.textContent = this.currentLevel;
        this.homeScreen.classList.remove('active');
        this.completionScreen.classList.add('active');
    }

    goAgain() {
        this.completionScreen.classList.remove('active');
        this.homeScreen.classList.add('active');
        this.resetTimer();
        this.startSequence();
    }

    goHome() {
        // Advance to next level if not at max
        if (this.currentLevel < 15) {
            this.currentLevel++;
            this.saveLevel(this.currentLevel);
        }

        this.completionScreen.classList.remove('active');
        this.homeScreen.classList.add('active');
        this.resetTimer();
        this.updateLevelDisplay();
        this.updatePhaseInfo();
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentRound = 1;
        this.currentPhase = 0;
        this.currentSet = 0;
        this.startBtn.textContent = 'Start';
        this.setStatus('Ready', false);
        this.updateTimeDisplay(0);
        this.updateFillAngle(0);
        this.setLevelSelectEnabled(true);

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.timerApp = new IntervalTimer();
});

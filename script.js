'use strict';

const STORAGE_KEY = 'taskquest.save.v1';
const THEME_KEY = 'taskquest.theme.v1';
const DAILY_BONUS_XP = 25;
const DAILY_BONUS_COINS = 10;
const XP_BY_DIFFICULTY = { Easy: 10, Medium: 20, Hard: 40 };
const COINS_BY_DIFFICULTY = { Easy: 5, Medium: 10, Hard: 20 };
const CATEGORIES = ['Study', 'Work', 'Fitness', 'Personal', 'Other'];

const CHALLENGE_POOL = [
  { id: 'three-wins', title: 'Complete 3 tasks', detail: 'A few little wins go a long way.', icon: '✓', reward: 15, measure: state => todayCompletions(state).length, target: 3 },
  { id: 'hard-win', title: 'Take on a hard task', detail: 'Challenge yourself to a big win.', icon: '↗', reward: 20, measure: state => todayCompletions(state).filter(item => item.difficulty === 'Hard').length, target: 1 },
  { id: 'study-sprint', title: 'Finish your Study tasks', detail: 'Clear every Study task on your list.', icon: '▤', reward: 15, measure: state => {
    const studyTasks = state.tasks.filter(task => task.category === 'Study' && !task.completed);
    const completedToday = todayCompletions(state).some(item => item.category === 'Study');
    return state.tasks.some(task => task.category === 'Study') && studyTasks.length === 0 && completedToday ? 1 : 0;
  }, target: 1 },
  { id: 'evening-finish', title: 'Finish a task before 8 PM', detail: 'Get one important thing done early.', icon: '◷', reward: 10, measure: state => todayCompletions(state).filter(item => {
    const date = new Date(item.completedAt);
    return date.getHours() < 20;
  }).length, target: 1 },
  { id: 'steady-start', title: 'Complete your first task', detail: 'Start the day with a little momentum.', icon: '✦', reward: 10, measure: state => todayCompletions(state).length, target: 1 },
  { id: 'double-down', title: 'Complete 2 tasks', detail: 'Build momentum one win at a time.', icon: '◎', reward: 12, measure: state => todayCompletions(state).length, target: 2 }
];

const ACHIEVEMENTS = [
  { id: 'first-task', title: 'First Steps', description: 'Complete your very first task.', icon: '✦', unlocked: state => state.completionEvents.length >= 1 },
  { id: 'ten-tasks', title: 'Getting Things Done', description: 'Complete 10 tasks.', icon: '✓', unlocked: state => state.completionEvents.length >= 10 },
  { id: 'fifty-tasks', title: 'Quest Regular', description: 'Complete 50 tasks.', icon: '⚑', unlocked: state => state.completionEvents.length >= 50 },
  { id: 'seven-streak', title: 'A Week of Wins', description: 'Reach a 7-day streak.', icon: '♨', unlocked: state => state.longestStreak >= 7 },
  { id: 'thirty-streak', title: 'Unstoppable', description: 'Reach a 30-day streak.', icon: '♨', unlocked: state => state.longestStreak >= 30 },
  { id: 'task-master', title: 'Task Master', description: 'Reach level 10.', icon: '♛', unlocked: state => state.level >= 10 },
  { id: 'perfect-day', title: 'Perfect Day', description: 'Complete every task from your day.', icon: '☼', unlocked: state => state.perfectDayDates.includes(localDateKey()) }
];

let savedProgressLoadFailed = false;

function freshState() {
  return {
    playerName: 'Player',
    tasks: [],
    xp: 0,
    totalXp: 0,
    coins: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    completionEvents: [],
    unlockedAchievements: [],
    claimedChallenges: [],
    perfectDayDates: [],
    dailyBonusDates: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    const initial = freshState();
    const state = { ...initial, ...parsed };
    state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks.filter(task => task && typeof task.id === 'string' && typeof task.name === 'string').map(task => ({
      ...task,
      description: typeof task.description === 'string' ? task.description : '',
      difficulty: XP_BY_DIFFICULTY[task.difficulty] ? task.difficulty : 'Medium',
      category: CATEGORIES.includes(task.category) ? task.category : 'Other',
      priority: ['Low', 'Medium', 'High'].includes(task.priority) ? task.priority : 'Medium',
      dueAt: typeof task.dueAt === 'string' ? task.dueAt : '',
      completed: task.completed === true,
      completedAt: typeof task.completedAt === 'string' ? task.completedAt : '',
      rewardClaimed: task.rewardClaimed === true
    })) : [];
    state.completionEvents = Array.isArray(parsed.completionEvents) ? parsed.completionEvents.filter(event => event && typeof event.completedAt === 'string') : [];
    state.unlockedAchievements = Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [];
    state.claimedChallenges = Array.isArray(parsed.claimedChallenges) ? parsed.claimedChallenges : [];
    state.perfectDayDates = Array.isArray(parsed.perfectDayDates) ? parsed.perfectDayDates : [];
    state.dailyBonusDates = Array.isArray(parsed.dailyBonusDates) ? parsed.dailyBonusDates : [];
    state.xp = finiteNonNegative(parsed.xp);
    state.totalXp = finiteNonNegative(parsed.totalXp);
    state.coins = finiteNonNegative(parsed.coins);
    state.level = Math.max(1, Math.floor(finiteNonNegative(parsed.level)) || 1);
    state.streak = finiteNonNegative(parsed.streak);
    state.longestStreak = finiteNonNegative(parsed.longestStreak);
    state.lastActiveDate = typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : '';
    state.playerName = typeof parsed.playerName === 'string' && parsed.playerName.trim() ? parsed.playerName.trim().slice(0, 24) : 'Player';
    return state;
  } catch (error) {
    console.error('TaskQuest could not load saved progress.', error);
    savedProgressLoadFailed = true;
    return freshState();
  }
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

let state = loadState();
let activeTaskView = 'pending';
let activeCategoryFilter = 'All';

const elements = {
  taskForm: document.querySelector('#task-form'),
  taskName: document.querySelector('#task-name'),
  taskDescription: document.querySelector('#task-description'),
  taskPriority: document.querySelector('#task-priority'),
  taskCategory: document.querySelector('#task-category'),
  taskDifficulty: document.querySelector('#task-difficulty'),
  taskDue: document.querySelector('#task-due'),
  editingTaskId: document.querySelector('#editing-task-id'),
  formError: document.querySelector('#form-error'),
  taskList: document.querySelector('#task-list'),
  categoryFilter: document.querySelector('#category-filter'),
  toastRegion: document.querySelector('#toast-region'),
  levelDialog: document.querySelector('#level-dialog')
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dayDifference(earlier, later) {
  return Math.round((dateFromKey(later) - dateFromKey(earlier)) / 86400000);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('TaskQuest could not save progress.', error);
    showToast('Your progress could not be saved. Check your browser storage settings.', 'error');
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function todayCompletions(source = state) {
  const today = localDateKey();
  return source.completionEvents.filter(event => localDateKey(new Date(event.completedAt)) === today);
}

function xpForLevel(level) {
  return 100 + (level - 1) * 50;
}

function updateStreak(today) {
  if (state.lastActiveDate === today) return;
  state.streak = state.lastActiveDate && dayDifference(state.lastActiveDate, today) === 1 ? state.streak + 1 : 1;
  state.longestStreak = Math.max(state.longestStreak, state.streak);
  state.lastActiveDate = today;
}

function awardXp(amount) {
  state.xp += amount;
  state.totalXp += amount;
  let leveledUp = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    leveledUp = true;
  }
  return leveledUp;
}

function dailyTaskSet() {
  const today = localDateKey();
  return state.tasks.filter(task => (task.createdAt && localDateKey(new Date(task.createdAt)) === today)
    || (task.dueAt && localDateKey(new Date(task.dueAt)) === today));
}

function updatePerfectDay() {
  const today = localDateKey();
  const dailyTasks = dailyTaskSet();
  if (!dailyTasks.length || dailyTasks.some(task => !task.completed) || state.dailyBonusDates.includes(today)) return false;
  state.dailyBonusDates.push(today);
  state.perfectDayDates.push(today);
  awardXp(DAILY_BONUS_XP);
  state.coins += DAILY_BONUS_COINS;
  return true;
}

function challengeListForToday() {
  const key = localDateKey();
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const pool = [...CHALLENGE_POOL];
  const chosen = [];
  for (let i = 0; i < 3; i += 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    chosen.push(pool.splice(hash % pool.length, 1)[0]);
  }
  return chosen;
}

function challengeProgress(challenge) {
  return Math.min(challenge.target, challenge.measure(state));
}

function isChallengeComplete(challenge) {
  return challengeProgress(challenge) >= challenge.target;
}

function challengeClaimKey(challenge) {
  return `${localDateKey()}:${challenge.id}`;
}

function checkAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    if (!state.unlockedAchievements.includes(achievement.id) && achievement.unlocked(state)) {
      state.unlockedAchievements.push(achievement.id);
      showToast(`Achievement unlocked: ${achievement.title}`, 'success');
    }
  }
}

function renderDashboard() {
  const today = new Date();
  const todayKey = localDateKey(today);
  const completedToday = todayCompletions().length;
  const completedTotal = state.completionEvents.length;
  const completedTasks = state.tasks.filter(task => task.completed).length;
  const rate = state.tasks.length ? Math.round((completedTasks / state.tasks.length) * 100) : 0;
  const xpThreshold = xpForLevel(state.level);

  document.querySelector('#today-label').textContent = formatDate(today, { weekday: 'short', month: 'short', day: 'numeric' });
  document.querySelector('#welcome-date').textContent = formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  document.querySelector('#player-greeting').textContent = state.playerName;
  document.querySelector('#sidebar-player-name').textContent = state.playerName;
  document.querySelector('#avatar-initials').textContent = Array.from(state.playerName.trim())[0]?.toUpperCase() || 'P';
  document.querySelector('#sidebar-player-level').textContent = `Level ${state.level} adventurer`;
  document.querySelector('#level-number').textContent = state.level;
  document.querySelector('#level-title').textContent = `Level ${state.level} Adventurer`;
  document.querySelector('#xp-progress-fill').style.width = `${Math.min(100, (state.xp / xpThreshold) * 100)}%`;
  document.querySelector('#xp-progress').setAttribute('aria-valuemax', String(xpThreshold));
  document.querySelector('#xp-progress').setAttribute('aria-valuenow', String(state.xp));
  document.querySelector('#xp-caption').textContent = `${state.xp} / ${xpThreshold} XP`;
  document.querySelector('#xp-next').textContent = `${xpThreshold - state.xp} XP to next level`;
  document.querySelector('#coin-count').textContent = state.coins.toLocaleString();
  document.querySelector('#stat-completed-today').textContent = completedToday;
  document.querySelector('#today-task-total').textContent = `of ${dailyTaskSet().length} tasks`;
  const streakIsActive = state.lastActiveDate === todayKey || (state.lastActiveDate && dayDifference(state.lastActiveDate, todayKey) === 1);
  document.querySelector('#stat-streak').textContent = streakIsActive ? state.streak : 0;
  document.querySelector('#streak-note').textContent = state.lastActiveDate === todayKey ? 'You showed up today — nice work!' : 'Your next win starts today';
  document.querySelector('#stat-total-completed').textContent = completedTotal;
  document.querySelector('#total-xp-note').textContent = `${state.totalXp.toLocaleString()} XP earned`;
  document.querySelector('#stat-completion-rate').textContent = `${rate}%`;
  document.querySelector('#completion-progress-fill').style.width = `${rate}%`;
  document.querySelector('#nav-task-count').textContent = state.tasks.filter(task => !task.completed).length;
  document.querySelector('#stats-pending').textContent = state.tasks.filter(task => !task.completed).length;
  document.querySelector('#stats-xp').textContent = state.totalXp.toLocaleString();
  document.querySelector('#stats-longest-streak').textContent = `${state.longestStreak} ${state.longestStreak === 1 ? 'day' : 'days'}`;
  document.querySelector('#task-count').textContent = state.tasks.length;
  document.querySelector('#pending-count').textContent = state.tasks.filter(task => !task.completed).length;
  document.querySelector('#completed-count').textContent = state.tasks.filter(task => task.completed).length;
  document.querySelector('#quest-day-label').textContent = formatDate(today, { month: 'short', day: 'numeric' });
  renderTasks();
  renderChallenges();
  renderAchievements();
  renderStatistics();
}

function renderTasks() {
  const isCompletedView = activeTaskView === 'completed';
  const tasks = state.tasks.filter(task => task.completed === isCompletedView && (activeCategoryFilter === 'All' || task.category === activeCategoryFilter));
  tasks.sort((first, second) => {
    if (!isCompletedView && first.dueAt && second.dueAt) return first.dueAt.localeCompare(second.dueAt);
    if (!isCompletedView && first.dueAt) return -1;
    if (!isCompletedView && second.dueAt) return 1;
    return (second.createdAt || '').localeCompare(first.createdAt || '');
  });
  if (!tasks.length) {
    const filtered = activeCategoryFilter !== 'All';
    const title = filtered ? 'No tasks in this category' : isCompletedView ? 'Your wins will show up here' : 'Your quest starts here';
    const copy = filtered ? 'Try another category or add a task in this one.' : isCompletedView ? 'Complete a task and take a moment to celebrate.' : 'Add your first task above and start earning XP.';
    elements.taskList.innerHTML = `<div class="task-empty"><span class="empty-icon" aria-hidden="true">${isCompletedView ? '✓' : '✦'}</span><strong>${title}</strong><p>${copy}</p></div>`;
    return;
  }
  elements.taskList.innerHTML = tasks.map(task => taskMarkup(task)).join('');
}

function taskMarkup(task) {
  const priority = task.priority.toLowerCase();
  const category = task.category.toLowerCase();
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = dueAt && !task.completed && dueAt.getTime() < Date.now();
  const dueLabel = dueAt
    ? `${formatDate(dueAt, { month: 'short', day: 'numeric' })}, ${formatDate(dueAt, { hour: 'numeric', minute: '2-digit' })}`
    : '';
  const reward = XP_BY_DIFFICULTY[task.difficulty];
  return `<article class="task-item${task.completed ? ' task-completed' : ''}" data-task-id="${escapeHtml(task.id)}">
    <button class="task-check${task.completed ? ' checked' : ''}" type="button" data-action="toggle" aria-label="${task.completed ? 'Reopen' : 'Complete'} ${escapeHtml(task.name)}" aria-pressed="${task.completed}"></button>
    <div class="task-body">
      <div class="task-title-row"><span class="task-title">${escapeHtml(task.name)}</span><div class="task-actions">
        <button class="task-action" type="button" data-action="edit" aria-label="Edit ${escapeHtml(task.name)}" title="Edit task">✎</button>
        <button class="task-action delete" type="button" data-action="delete" aria-label="Delete ${escapeHtml(task.name)}" title="Delete task">×</button>
      </div></div>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-meta"><span class="task-badge category-${category}">${escapeHtml(task.category)}</span><span class="priority-tag priority-${priority}"><span class="priority-dot"></span>${escapeHtml(task.priority)}</span>${dueLabel ? `<span class="task-due${overdue ? ' overdue' : ''}"><span aria-hidden="true">◷</span>${overdue ? 'Overdue · ' : ''}${escapeHtml(dueLabel)}</span>` : ''}<span class="task-xp">✦ ${reward} XP</span></div>
    </div>
  </article>`;
}

function renderChallenges() {
  const todayChallenges = challengeListForToday();
  const claimed = new Set(state.claimedChallenges);
  document.querySelector('#challenge-list').innerHTML = todayChallenges.map(challenge => {
    const progress = challengeProgress(challenge);
    const complete = isChallengeComplete(challenge);
    const claimKey = challengeClaimKey(challenge);
    const rewardClaimed = claimed.has(claimKey);
    const progressText = `${progress} / ${challenge.target}`;
    return `<article class="challenge-card${complete ? ' complete' : ''}">
      <div class="challenge-top"><span class="challenge-icon" aria-hidden="true">${challenge.icon}</span><div class="challenge-copy"><strong>${escapeHtml(challenge.title)}</strong><span>${escapeHtml(challenge.detail)}</span></div><span class="challenge-copy challenge-reward">${rewardClaimed ? '✓ Earned' : `+${challenge.reward} XP`}</span></div>
      <div class="challenge-progress"><div class="challenge-track"><span style="width:${(progress / challenge.target) * 100}%"></span></div><small>${complete ? rewardClaimed ? 'Claimed' : 'Ready to claim' : progressText}</small></div>
    </article>`;
  }).join('');
}

function renderAchievements() {
  const unlocked = new Set(state.unlockedAchievements);
  document.querySelector('#achievement-total').textContent = `${unlocked.size} / ${ACHIEVEMENTS.length}`;
  document.querySelector('#achievement-list').innerHTML = ACHIEVEMENTS.map(achievement => {
    const isUnlocked = unlocked.has(achievement.id);
    return `<div class="achievement-row${isUnlocked ? ' unlocked' : ''}"><span class="achievement-icon" aria-hidden="true">${achievement.icon}</span><div class="achievement-copy"><strong>${escapeHtml(achievement.title)}</strong><span>${escapeHtml(achievement.description)}</span></div><span class="achievement-status" aria-label="${isUnlocked ? 'Unlocked' : 'Locked'}">${isUnlocked ? '✓' : '·'}</span></div>`;
  }).join('');
}

function renderStatistics() {
  const today = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = localDateKey(day);
    const count = state.completionEvents.filter(event => localDateKey(new Date(event.completedAt)) === key).length;
    days.push({ date: day, key, count });
  }
  const maxCount = Math.max(1, ...days.map(day => day.count));
  document.querySelector('#weekly-chart').innerHTML = days.map(day => {
    const height = day.count ? Math.max(8, (day.count / maxCount) * 100) : 3;
    return `<div class="chart-day${day.key === localDateKey() ? ' today' : ''}" title="${day.count} ${day.count === 1 ? 'task' : 'tasks'} completed"><span class="chart-value">${day.count || ''}</span><div class="chart-bar-wrap"><div class="chart-bar" style="height:${height}%"></div></div><span>${formatDate(day.date, { weekday: 'short' }).slice(0, 2)}</span></div>`;
  }).join('');
  const colors = { Study: '#8878e8', Work: '#6794df', Fitness: '#4daf83', Personal: '#e5a25e', Other: '#9a99a8' };
  document.querySelector('#category-breakdown').innerHTML = CATEGORIES.map(category => {
    const count = state.completionEvents.filter(event => event.category === category).length;
    return `<div class="category-stat"><span class="category-dot" style="background:${colors[category]}"></span><span>${category}</span><strong>${count}</strong></div>`;
  }).join('');
}

function showToast(message, type = 'success') {
  if (!elements.toastRegion) return;
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${type === 'error' ? '!' : '✓'}</span><span>${escapeHtml(message)}</span>`;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

function celebrateTask(element, xp, coins) {
  const rect = element.getBoundingClientRect();
  const reward = document.createElement('span');
  reward.className = 'reward-float';
  reward.textContent = `+${xp} XP`;
  reward.style.left = `${rect.left + rect.width / 2}px`;
  reward.style.top = `${rect.top}px`;
  document.body.append(reward);
  window.setTimeout(() => reward.remove(), 1000);
  const coin = document.createElement('span');
  coin.className = 'reward-float coin-float';
  coin.textContent = `+${coins} coins`;
  coin.style.left = `${rect.left + rect.width / 2 + 40}px`;
  coin.style.top = `${rect.top + 8}px`;
  document.body.append(coin);
  window.setTimeout(() => coin.remove(), 1000);
  const confetti = document.querySelector('#celebration-layer');
  const colors = ['#7265df', '#e6a643', '#50b989', '#d583c8', '#72a4ed'];
  for (let index = 0; index < 22; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * .3}s`;
    confetti.append(piece);
    window.setTimeout(() => piece.remove(), 1600);
  }
}

function showLevelUp() {
  document.querySelector('#level-dialog-copy').textContent = `You've reached Level ${state.level}. Your next adventure is waiting.`;
  if (typeof elements.levelDialog.showModal === 'function') elements.levelDialog.showModal();
  else showToast(`LEVEL UP! You are now Level ${state.level}.`);
}

function resetTaskForm() {
  elements.taskForm.reset();
  elements.editingTaskId.value = '';
  document.querySelector('#submit-task-label').textContent = 'Add task';
  document.querySelector('#submit-task-icon').textContent = '＋';
  document.querySelector('#cancel-edit').hidden = true;
  elements.formError.hidden = true;
}

function startEditingTask(task) {
  elements.editingTaskId.value = task.id;
  elements.taskName.value = task.name;
  elements.taskDescription.value = task.description;
  elements.taskPriority.value = task.priority;
  elements.taskCategory.value = task.category;
  elements.taskDifficulty.value = task.difficulty;
  elements.taskDue.value = task.dueAt;
  document.querySelector('#submit-task-label').textContent = 'Save changes';
  document.querySelector('#submit-task-icon').textContent = '✓';
  document.querySelector('#cancel-edit').hidden = false;
  elements.formError.hidden = true;
  document.querySelector('#add-task').scrollIntoView({ behavior: 'smooth', block: 'start' });
  elements.taskName.focus({ preventScroll: true });
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const name = elements.taskName.value.trim();
  if (!name) {
    elements.formError.textContent = 'Add a task name before saving.';
    elements.formError.hidden = false;
    elements.taskName.focus();
    return;
  }
  const taskId = elements.editingTaskId.value;
  const updates = {
    name,
    description: elements.taskDescription.value.trim(),
    priority: elements.taskPriority.value,
    category: elements.taskCategory.value,
    difficulty: elements.taskDifficulty.value,
    dueAt: elements.taskDue.value
  };
  if (taskId) {
    const task = state.tasks.find(item => item.id === taskId);
    if (!task) {
      showToast('This task is no longer available. Refresh and try again.', 'error');
      resetTaskForm();
      return;
    }
    Object.assign(task, updates);
    showToast('Task updated. Your quest, your way.');
  } else {
    state.tasks.push({
      id: crypto.randomUUID(),
      ...updates,
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: '',
      rewardClaimed: false
    });
    showToast('Task added. You’ve got this!');
  }
  resetTaskForm();
  checkAchievements();
  persist();
  renderDashboard();
}

function toggleTask(task, button) {
  if (task.completed) {
    task.completed = false;
    task.completedAt = '';
    persist();
    renderDashboard();
    showToast('Task moved back to your in-progress list.');
    return;
  }

  task.completed = true;
  const completedAt = new Date().toISOString();
  task.completedAt = completedAt;
  const previousLevel = state.level;
  let levelUp = false;
  if (!task.rewardClaimed) {
    const xp = XP_BY_DIFFICULTY[task.difficulty];
    const coins = COINS_BY_DIFFICULTY[task.difficulty];
    task.rewardClaimed = true;
    state.coins += coins;
    levelUp = awardXp(xp);
    state.completionEvents.push({
      taskId: task.id,
      completedAt,
      difficulty: task.difficulty,
      category: task.category,
      xp,
      coins
    });
    updateStreak(localDateKey(new Date(completedAt)));
    celebrateTask(button, xp, coins);
    showToast(`Nice work! +${xp} XP and +${coins} coins.`);
  } else {
    showToast('Task complete! Your original XP reward is already banked.');
  }

  const bonusEarned = updatePerfectDay();
  if (bonusEarned) showToast(`Perfect day! +${DAILY_BONUS_XP} bonus XP and +${DAILY_BONUS_COINS} coins.`);
  const completedChallenges = challengeListForToday().filter(challenge => isChallengeComplete(challenge) && !state.claimedChallenges.includes(challengeClaimKey(challenge)));
  for (const challenge of completedChallenges) {
    state.claimedChallenges.push(challengeClaimKey(challenge));
    const challengeLevelUp = awardXp(challenge.reward);
    levelUp = levelUp || challengeLevelUp;
    showToast(`Daily quest complete: +${challenge.reward} bonus XP!`);
  }
  levelUp = levelUp || state.level > previousLevel;
  checkAchievements();
  persist();
  renderDashboard();
  if (levelUp) window.setTimeout(showLevelUp, 350);
}

function deleteTask(task) {
  if (!window.confirm(`Permanently delete "${task.name}"? This cannot be undone.`)) return;
  state.tasks = state.tasks.filter(item => item.id !== task.id);
  if (elements.editingTaskId.value === task.id) resetTaskForm();
  persist();
  renderDashboard();
  showToast('Task deleted.');
}

function switchTaskView(button) {
  activeTaskView = button.dataset.taskView;
  document.querySelectorAll('.task-tab').forEach(tab => {
    const isActive = tab === button;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  renderTasks();
}

function claimCompletedChallenges() {
  const eligible = challengeListForToday().filter(challenge => isChallengeComplete(challenge) && !state.claimedChallenges.includes(challengeClaimKey(challenge)));
  for (const challenge of eligible) {
    state.claimedChallenges.push(challengeClaimKey(challenge));
    awardXp(challenge.reward);
    showToast(`Daily quest complete: +${challenge.reward} bonus XP!`);
  }
}

elements.taskForm.addEventListener('submit', handleTaskSubmit);
document.querySelector('#cancel-edit').addEventListener('click', resetTaskForm);
document.querySelectorAll('.task-tab').forEach(button => button.addEventListener('click', () => switchTaskView(button)));
elements.categoryFilter.addEventListener('change', event => {
  activeCategoryFilter = event.target.value;
  renderTasks();
});
elements.taskList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const taskElement = button.closest('[data-task-id]');
  const task = state.tasks.find(item => item.id === taskElement?.dataset.taskId);
  if (!task) return;
  if (button.dataset.action === 'toggle') toggleTask(task, button);
  else if (button.dataset.action === 'edit') startEditingTask(task);
  else if (button.dataset.action === 'delete') deleteTask(task);
});
document.querySelector('#theme-toggle').addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  document.body.classList.toggle('dark', nextTheme === 'dark');
  document.documentElement.style.colorScheme = nextTheme;
  document.querySelector('#theme-icon').textContent = nextTheme === 'dark' ? '☀' : '☾';
  document.querySelector('#theme-toggle').setAttribute('aria-label', `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} theme`);
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (error) {
    console.error('TaskQuest could not save the theme preference.', error);
    showToast('Your theme preference could not be saved.', 'error');
  }
});
document.querySelector('#profile-button').addEventListener('click', () => {
  const enteredName = window.prompt('What should we call you?', state.playerName);
  if (enteredName === null) return;
  const name = enteredName.trim();
  if (!name) {
    showToast('Your player name cannot be empty.', 'error');
    return;
  }
  state.playerName = Array.from(name).slice(0, 24).join('');
  persist();
  renderDashboard();
  showToast('Player name updated.');
});
document.querySelector('#level-dialog-close').addEventListener('click', () => elements.levelDialog.close());
elements.levelDialog.addEventListener('click', event => {
  if (event.target === elements.levelDialog) elements.levelDialog.close();
});

try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    document.querySelector('#theme-icon').textContent = '☀';
    document.querySelector('#theme-toggle').setAttribute('aria-label', 'Switch to light theme');
  }
} catch (error) {
  console.error('TaskQuest could not load the theme preference.', error);
}

if (savedProgressLoadFailed) showToast('Saved progress could not be loaded. Your current session will start fresh.', 'error');
claimCompletedChallenges();
checkAchievements();
persist();
renderDashboard();

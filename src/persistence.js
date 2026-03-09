import { PLAYTEST_MODE_KEY, TUTORIAL_SEEN_KEY } from './config.js';

export function loadPlaytestMode() {
  try {
    return localStorage.getItem(PLAYTEST_MODE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

export function savePlaytestMode(enabled) {
  try {
    localStorage.setItem(PLAYTEST_MODE_KEY, enabled ? '1' : '0');
  } catch (error) {
    // persistence is optional
  }
}

export function loadTutorialSeen() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch (error) {
    return false;
  }
}

export function saveTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (error) {
    // persistence is optional
  }
}
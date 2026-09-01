// ─────────────────────────────────────────────────────────────────
// Budget Buddy — Network Status Detection
// Uses React Native's built-in fetch-based connectivity check
// and a polling + event listener pattern.
// No external dependencies required.
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Internal state (module-level singleton) ────────────────────────
let _isOnline = true;
let _listeners = new Set();
let _pollingInterval = null;
let _isSyncing = false;

/** Probe URL — tiny public endpoint for connectivity check. */
const PROBE_URL = 'https://www.google.com/generate_204';
const PROBE_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 10000; // 10s polling

// ── Core connectivity probe ────────────────────────────────────────

/**
 * Returns true if we can reach the internet.
 * Uses a no-cache HEAD/GET request to a lightweight public URL.
 */
async function probeConnectivity() {
  // ── Web guard ────────────────────────────────────────────────────
  // On Web, a cross-origin HEAD to google.com/generate_204 is always
  // blocked by CORS (Google does not send Access-Control-Allow-Origin).
  // The resulting network error is indistinguishable from genuine
  // offline inside catch{}, causing a false offline state in browsers.
  //
  // navigator.onLine reflects the browser/NIC's actual connectivity
  // status and is not subject to CORS restrictions.  It is accurate
  // enough for the login-gate check; real Supabase failures are then
  // surfaced through the normal auth error path.
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }

  // ── Native (Android / iOS) — unchanged ──────────────────────────
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(PROBE_URL, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch {
    return false;
  }
}

// ── Notify all React subscribers ──────────────────────────────────

function notifyListeners() {
  for (const fn of _listeners) {
    try { fn({ isOnline: _isOnline, isSyncing: _isSyncing }); } catch {}
  }
}

// ── Update global status ──────────────────────────────────────────

async function updateNetworkStatus() {
  const wasOnline = _isOnline;
  const online = await probeConnectivity();
  if (online !== wasOnline) {
    _isOnline = online;
    notifyListeners();
  }
}

// ── Start/stop polling ────────────────────────────────────────────

function startPolling() {
  if (_pollingInterval) return;
  _pollingInterval = setInterval(updateNetworkStatus, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (_pollingInterval) {
    clearInterval(_pollingInterval);
    _pollingInterval = null;
  }
}

// ── Public: set syncing state ─────────────────────────────────────

export function setIsSyncing(val) {
  _isSyncing = val;
  notifyListeners();
}

// ── Public: imperatively check connectivity ───────────────────────

export async function getIsOnline() {
  return probeConnectivity();
}

// ── Public: initialize network monitoring ────────────────────────
// Call once from the root component.

export function initNetworkMonitoring() {
  updateNetworkStatus();
  startPolling();
}

export function teardownNetworkMonitoring() {
  stopPolling();
}

// ── Public: status string ─────────────────────────────────────────

export function getNetworkStatusString() {
  if (_isSyncing) return 'syncing';
  return _isOnline ? 'online' : 'offline';
}

// ── React Hook ────────────────────────────────────────────────────

/**
 * useNetworkStatus()
 * Returns { isOnline, status } where status is 'online' | 'offline' | 'syncing'
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(_isOnline);
  const [isSyncing, setIsSyncingState] = useState(_isSyncing);

  useEffect(() => {
    // Register
    const handler = ({ isOnline: online, isSyncing: syncing }) => {
      setIsOnline(online);
      setIsSyncingState(syncing);
    };
    _listeners.add(handler);

    // Initial probe on mount
    updateNetworkStatus();
    startPolling();

    return () => {
      _listeners.delete(handler);
    };
  }, []);

  const status = isSyncing ? 'syncing' : (isOnline ? 'online' : 'offline');
  return { isOnline, isSyncing, status };
}

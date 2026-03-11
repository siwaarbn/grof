/**
 * Critical Path API
 * 
 * API functions for fetching critical path analysis data.
 * Currently falls back to mock data since backend endpoint may not exist.
 * 
 * When backend implements /sessions/{id}/critical-path, 
 * simply update the try block to use the real endpoint.
 */

import { api } from "./client";
import type { CriticalPath } from "../types/criticalPath";
import { mockCriticalPath } from "../data/mockCriticalPath";

/**
 * Fetch critical path analysis for a session
 * Falls back to mock data if API is unavailable
 */
export async function fetchCriticalPath(sessionId: string): Promise<CriticalPath> {
    try {
        // Attempt to fetch from real API
        const response = await api.get(`/sessions/${sessionId}/critical-path`);
        return response.data;
    } catch {
        // Fallback to mock data for development
        console.log(`[CriticalPath API] Using mock data for session ${sessionId}`);
        return {
            ...mockCriticalPath,
            sessionId,
        };
    }
}

/**
 * Check if critical path API is available
 */
export async function isCriticalPathApiAvailable(): Promise<boolean> {
    try {
        await api.head("/sessions/test/critical-path");
        return true;
    } catch {
        return false;
    }
}

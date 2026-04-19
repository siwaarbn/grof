/**
 * CorrelationContext - Shared state for CPU-GPU view synchronization
 * 
 * This context manages the selection state between Flamegraph and Timeline
 * components, enabling bidirectional correlation:
 * - Clicking a flamegraph node highlights related GPU events
 * - Clicking a GPU event highlights related flamegraph nodes
 * 
 * Uses React Context + useReducer for lightweight state management.
 * Easy to migrate to Zustand/Redux if needed in the future.
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { CorrelationSelection, GpuStats } from '../types/correlation';

// Action types
type CorrelationAction =
    | { type: 'SELECT_FLAMEGRAPH_NODE'; nodeId: string; relatedGpuEvents: string[] }
    | { type: 'SELECT_GPU_EVENT'; eventId: string; relatedFlamegraphNodes: string[] }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'SET_GPU_STATS'; stats: GpuStats | null };

// State shape
interface CorrelationState {
    selection: CorrelationSelection;
    gpuStats: GpuStats | null;
}

// Initial state
const initialState: CorrelationState = {
    selection: {
        type: null,
        nodeId: null,
        relatedIds: [],
    },
    gpuStats: null,
};

// Reducer
function correlationReducer(state: CorrelationState, action: CorrelationAction): CorrelationState {
    switch (action.type) {
        case 'SELECT_FLAMEGRAPH_NODE':
            return {
                ...state,
                selection: {
                    type: 'flamegraph',
                    nodeId: action.nodeId,
                    relatedIds: action.relatedGpuEvents,
                },
            };
        case 'SELECT_GPU_EVENT':
            return {
                ...state,
                selection: {
                    type: 'timeline',
                    nodeId: action.eventId,
                    relatedIds: action.relatedFlamegraphNodes,
                },
            };
        case 'CLEAR_SELECTION':
            return initialState;
        case 'SET_GPU_STATS':
            return {
                ...state,
                gpuStats: action.stats,
            };
        default:
            return state;
    }
}

// Context
interface CorrelationContextValue {
    state: CorrelationState;
    dispatch: React.Dispatch<CorrelationAction>;
    // Convenience methods
    selectFlamegraphNode: (nodeId: string, relatedGpuEvents: string[]) => void;
    selectGpuEvent: (eventId: string, relatedFlamegraphNodes: string[]) => void;
    clearSelection: () => void;
    setGpuStats: (stats: GpuStats | null) => void;
}

const CorrelationContext = createContext<CorrelationContextValue | null>(null);

// Provider component
interface CorrelationProviderProps {
    children: ReactNode;
}

export function CorrelationProvider({ children }: CorrelationProviderProps) {
    const [state, dispatch] = useReducer(correlationReducer, initialState);

    const value: CorrelationContextValue = {
        state,
        dispatch,
        selectFlamegraphNode: (nodeId: string, relatedGpuEvents: string[]) => {
            dispatch({ type: 'SELECT_FLAMEGRAPH_NODE', nodeId, relatedGpuEvents });
        },
        selectGpuEvent: (eventId: string, relatedFlamegraphNodes: string[]) => {
            dispatch({ type: 'SELECT_GPU_EVENT', eventId, relatedFlamegraphNodes });
        },
        clearSelection: () => {
            dispatch({ type: 'CLEAR_SELECTION' });
        },
        setGpuStats: (stats: GpuStats | null) => {
            dispatch({ type: 'SET_GPU_STATS', stats });
        },
    };

    return (
        <CorrelationContext.Provider value={value}>
            {children}
        </CorrelationContext.Provider>
    );
}

// Hook for consuming the context
export function useCorrelation(): CorrelationContextValue {
    const context = useContext(CorrelationContext);
    if (!context) {
        throw new Error('useCorrelation must be used within a CorrelationProvider');
    }
    return context;
}

export { CorrelationContext };

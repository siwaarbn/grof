/**
 * ConnectionThread - Visual connection between Flamegraph and Timeline
 * 
 * Draws curved SVG lines connecting selected elements between the two views.
 * This provides a visual "thread" showing the relationship between CPU and GPU.
 */

import { useEffect, useRef, useState } from "react";
import { useCorrelation } from "../context/CorrelationContext";

interface ConnectionThreadProps {
    flamegraphRef: React.RefObject<HTMLDivElement | null>;
    timelineRef: React.RefObject<HTMLDivElement | null>;
}

interface ConnectionPoint {
    x: number;
    y: number;
}

const ConnectionThread = ({ flamegraphRef, timelineRef }: ConnectionThreadProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [connections, setConnections] = useState<{ start: ConnectionPoint; end: ConnectionPoint }[]>([]);

    const { state } = useCorrelation();
    const { selection } = state;

    // Update SVG dimensions on resize
    useEffect(() => {
        const handleResize = () => {
            // Force re-render on resize
            setConnections([]);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Calculate connection points when selection changes
    useEffect(() => {
        if (!selection.type || !flamegraphRef.current || !timelineRef.current) {
            setConnections([]);
            return;
        }

        const calculateConnections = () => {
            const newConnections: { start: ConnectionPoint; end: ConnectionPoint }[] = [];
            const containerRect = svgRef.current?.parentElement?.getBoundingClientRect();

            if (!containerRect) return;

            if (selection.type === "flamegraph") {
                // Connect flamegraph node to related GPU events
                const flamegraphRect = flamegraphRef.current?.querySelector(
                    `[data-node-id="${selection.nodeId}"]`
                )?.getBoundingClientRect();

                if (flamegraphRect) {
                    selection.relatedIds.forEach((eventId) => {
                        const timelineRect = timelineRef.current?.querySelector(
                            `[data-event-id="${eventId}"]`
                        )?.getBoundingClientRect();

                        if (timelineRect) {
                            newConnections.push({
                                start: {
                                    x: flamegraphRect.right - containerRect.left,
                                    y: flamegraphRect.top + flamegraphRect.height / 2 - containerRect.top,
                                },
                                end: {
                                    x: timelineRect.left - containerRect.left,
                                    y: timelineRect.top + timelineRect.height / 2 - containerRect.top,
                                },
                            });
                        }
                    });
                }
            } else if (selection.type === "timeline") {
                // Connect GPU event to related flamegraph nodes
                const timelineRect = timelineRef.current?.querySelector(
                    `[data-event-id="${selection.nodeId}"]`
                )?.getBoundingClientRect();

                if (timelineRect) {
                    selection.relatedIds.slice(0, 3).forEach((nodeId) => {
                        // Only show first 3 connections to avoid visual clutter
                        const flamegraphRect = flamegraphRef.current?.querySelector(
                            `[data-node-id="${nodeId}"]`
                        )?.getBoundingClientRect();

                        if (flamegraphRect) {
                            newConnections.push({
                                start: {
                                    x: flamegraphRect.right - containerRect.left,
                                    y: flamegraphRect.top + flamegraphRect.height / 2 - containerRect.top,
                                },
                                end: {
                                    x: timelineRect.left - containerRect.left,
                                    y: timelineRect.top + timelineRect.height / 2 - containerRect.top,
                                },
                            });
                        }
                    });
                }
            }

            setConnections(newConnections);
        };

        // Delay calculation to allow DOM to update
        const timer = setTimeout(calculateConnections, 100);
        return () => clearTimeout(timer);
    }, [selection, flamegraphRef, timelineRef]);

    // Generate curved path
    const generatePath = (start: ConnectionPoint, end: ConnectionPoint): string => {
        const midX = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
    };

    if (connections.length === 0) {
        return null;
    }

    return (
        <svg
            ref={svgRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 100,
            }}
        >
            <defs>
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ff88" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffd700" stopOpacity="0.8" />
                </linearGradient>
                <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {connections.map((conn, index) => (
                <path
                    key={index}
                    d={generatePath(conn.start, conn.end)}
                    fill="none"
                    stroke="url(#connectionGradient)"
                    strokeWidth="2"
                    strokeDasharray="8,4"
                    filter="url(#connectionGlow)"
                    opacity="0.7"
                >
                    <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="24"
                        dur="1s"
                        repeatCount="indefinite"
                    />
                </path>
            ))}
        </svg>
    );
};

export default ConnectionThread;

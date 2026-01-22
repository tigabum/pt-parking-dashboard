"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface CircularSessionCounterProps {
    startTime: string | Date;
    endTime: string | Date;
    displayTime: string;
    stopped?: boolean;
    size?: number; // Added size prop
}

export function CircularSessionCounter({ startTime, endTime, displayTime, stopped = false, size = 288 }: CircularSessionCounterProps) {
    const [percentage, setPercentage] = useState(0);
    const [liveTime, setLiveTime] = useState(displayTime);

    useEffect(() => {
        const updatePercentage = () => {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            const now = new Date().getTime();

            const total = end - start;
            if (total <= 0) {
                setPercentage(100);
                return;
            }

            const elapsed = now - start;
            const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
            setPercentage(pct);
        };

        updatePercentage();
        const interval = setInterval(updatePercentage, 1000);
        return () => clearInterval(interval);
    }, [startTime, endTime]);

    useEffect(() => {
        const updateLiveTime = () => {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            const now = new Date().getTime();

            // If stopped, use fixed calculation (End - Start). Otherwise live (Now - Start)
            const diff = Math.max(0, (stopped ? end : now) - start);

            const hrs = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            setLiveTime(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        };

        updateLiveTime();
        if (!stopped) {
            const interval = setInterval(updateLiveTime, 1000);
            return () => clearInterval(interval);
        }
    }, [startTime, endTime, stopped]);

    const radius = size * 0.38; // Slightly larger radius
    const center = size / 2;
    const strokeWidth = size * 0.05;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div
            className="relative flex items-center justify-center mx-auto group"
            style={{ width: size, height: size }}
        >
            {/* Outer Glows - Layered */}
            <div className="absolute inset-0 bg-[#0066FF]/5 rounded-full blur-[80px] animate-pulse group-hover:bg-[#0066FF]/8 transition-colors duration-700" />
            <div className="absolute inset-[15%] bg-white rounded-full shadow-[0_0_50px_rgba(0,102,255,0.08)] pointer-events-none" />

            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 relative z-10 drop-shadow-[0_20px_40px_rgba(0,102,255,0.12)]"
            >
                <defs>
                    <linearGradient id="counterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0066FF" />
                        <stop offset="50%" stopColor="#0088FF" />
                        <stop offset="100%" stopColor="#00C2FF" />
                    </linearGradient>
                    <filter id="glow-heavy" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                    </filter>
                </defs>

                {/* Subtle outer ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius + 8}
                    stroke="rgba(0,102,255,0.03)"
                    strokeWidth="1"
                    fill="transparent"
                />

                {/* Background Track - Industrial look */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-slate-50"
                />

                {/* Main Progress Track - Animated shadow */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="url(#counterGradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{
                        strokeDashoffset,
                        transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
                        filter: percentage > 0 ? 'url(#glow-heavy)' : 'none'
                    }}
                    strokeLinecap="round"
                />

                {/* Inner decorative ticks or ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius - strokeWidth - 4}
                    stroke="rgba(0,0,0,0.02)"
                    strokeWidth="1"
                    strokeDasharray="1, 8"
                    fill="transparent"
                />
            </svg>

            <div className="absolute text-center z-20 flex flex-col items-center justify-center p-4">
                <div className="flex items-center justify-center gap-2 mb-2 bg-[#0066FF]/5 px-3 py-1.5 rounded-full border border-primary/5">
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                        <Zap className="h-2 w-2 text-white fill-white animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] antialiased">Live Radar Session</span>
                </div>

                <div
                    className="font-mono font-black text-slate-900 tracking-tighter tabular-nums leading-none select-none"
                    style={{ fontSize: size * 0.17 }}
                >
                    {liveTime}
                </div>

                <div className="mt-4 sm:mt-6">
                    <div className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-1 shadow-2xl shadow-slate-300 transition-transform hover:scale-105 active:scale-95 cursor-default">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p
                                className="font-black text-white uppercase tracking-[0.2em] leading-none"
                                style={{ fontSize: Math.max(8, size * 0.028) }}
                            >
                                {Math.round(percentage)}% Complete
                            </p>
                        </div>
                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Digital Terminal Sync Active</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

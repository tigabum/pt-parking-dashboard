"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface CircularSessionCounterProps {
    startTime: string | Date;
    endTime: string | Date;
    displayTime: string;
    stopped?: boolean;
}

export function CircularSessionCounter({ startTime, endTime, displayTime, stopped = false }: CircularSessionCounterProps) {
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

    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-72 h-72 mx-auto">
            {/* Outer Glows */}
            <div className="absolute inset-0 bg-[#0066FF]/5 rounded-full blur-[80px] animate-pulse" />
            <div className="absolute inset-10 bg-[#0066FF]/10 rounded-full blur-[40px]" />

            <svg className="w-full h-full transform -rotate-90 relative z-10 drop-shadow-[0_0_15px_rgba(0,102,255,0.1)]">
                <defs>
                    <linearGradient id="counterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0066FF" />
                        <stop offset="100%" stopColor="#00C2FF" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background Track */}
                <circle
                    cx="144"
                    cy="144"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-slate-50"
                />

                {/* Progress Track (Shadow/Glow) */}
                <circle
                    cx="144"
                    cy="144"
                    r={radius}
                    stroke="#0066FF"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset, transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)", opacity: 0.1 }}
                    strokeLinecap="round"
                />

                {/* Main Progress Track */}
                <circle
                    cx="144"
                    cy="144"
                    r={radius}
                    stroke="url(#counterGradient)"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset, transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
                    strokeLinecap="round"
                    filter="url(#glow)"
                />
            </svg>

            <div className="absolute text-center z-20 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-full bg-[#0066FF]/10 flex items-center justify-center">
                        <Zap className="h-3 w-3 text-[#0066FF] fill-[#0066FF]" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Live Session</span>
                </div>

                <div className="text-6xl font-mono font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                    {liveTime}
                </div>

                <div className="mt-6">
                    <div className="px-4 py-1.5 bg-slate-900 rounded-full flex items-center gap-2 shadow-xl shadow-slate-200">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#0066FF] animate-pulse" />
                        <p className="text-[9px] font-black text-white uppercase tracking-widest">
                            {Math.round(percentage)}% Cycle Complete
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

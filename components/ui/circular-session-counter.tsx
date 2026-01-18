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
        <div className="relative flex items-center justify-center w-64 h-64 mx-auto">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse" />

            <svg className="w-full h-full transform -rotate-90 relative z-10">
                <circle
                    cx="128"
                    cy="128"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                />
                <circle
                    cx="128"
                    cy="128"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-in-out" }}
                    strokeLinecap="round"
                    className="text-primary drop-shadow-[0_0_8px_rgba(0,77,230,0.3)]"
                />
            </svg>
            <div className="absolute text-center z-20">
                <div className="flex items-center justify-center gap-1.5 text-[8px] font-black uppercase text-slate-300 tracking-[0.4em] mb-2">
                    <Zap className="h-2.5 w-2.5 text-primary" /> Elapsed
                </div>
                <div className="text-5xl font-mono font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                    {liveTime}
                </div>
                <div className="mt-4 px-3 py-1 bg-primary/5 rounded-full inline-block">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{Math.round(percentage)}% Expected</p>
                </div>
            </div>
        </div>
    );
}

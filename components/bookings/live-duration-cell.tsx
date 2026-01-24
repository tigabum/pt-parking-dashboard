"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { BookingResponse, ParkingResponse } from "@/components/types";
import { cn } from "@/lib/utils";

dayjs.extend(duration);

interface LiveDurationCellProps {
    booking: BookingResponse;
    parking?: ParkingResponse;
    className?: string;
}

export function LiveDurationCell({ booking, parking, className }: LiveDurationCellProps) {
    const [durationStr, setDurationStr] = useState<string>("00:00:00");
    const [livePrice, setLivePrice] = useState<number>(0);

    // Statuses that should show a live counter
    const isActive = ['PENDING', 'ACTIVE', 'WAITING_CONFIRMATION'].includes(booking.status);

    useEffect(() => {
        if (!isActive) {
            // If finalized, just show the stored duration and total amount
            if (booking.totalDurationMinutes) {
                const d = dayjs.duration(booking.totalDurationMinutes, 'minutes');
                const h = Math.floor(d.asHours());
                const m = d.minutes();
                const s = d.seconds();
                setDurationStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setDurationStr("—");
            }
            setLivePrice(Number(booking.totalAmount) || 0);
            return;
        }

        const calculate = () => {
            const start = dayjs(booking.startTime);
            const now = dayjs();
            const diff = dayjs.duration(now.diff(start));

            const h = Math.floor(diff.asHours());
            const m = diff.minutes();
            const s = diff.seconds();
            setDurationStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

            // Price Calculation
            if (parking?.pricing) {
                const type = booking.type || booking.bookingType || 'HOURLY';
                const pricing = type === 'MONTHLY'
                    ? parking.pricing.monthly
                    : type === 'DAILY'
                        ? parking.pricing.daily
                        : parking.pricing.hourly;

                if (pricing && pricing.price) {
                    let total = 0;
                    const diffMs = now.diff(start);
                    if (type === 'HOURLY') {
                        const hours = diffMs / (1000 * 60 * 60);
                        total = pricing.price * hours;
                    } else if (type === 'DAILY') {
                        const days = diffMs / (1000 * 60 * 60 * 24);
                        total = pricing.price * Math.ceil(days || 1);
                    } else {
                        const days = diffMs / (1000 * 60 * 60 * 24);
                        const months = days / 30;
                        total = pricing.price * months;
                    }
                    const discounted = total * (1 - (pricing.discount || 0) / 100);
                    setLivePrice(discounted);
                }
            } else {
                setLivePrice(Number(booking.totalAmount) || 0);
            }
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [booking, parking, isActive]);

    return (
        <div className={cn("flex flex-col gap-0.5", className)}>
            <div className="flex items-center gap-1.5">
                <span className={cn(
                    "text-xs font-black tabular-nums tracking-tight",
                    isActive ? "text-primary" : "text-slate-400"
                )}>
                    {durationStr}
                </span>
                {isActive && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
            </div>
            <div className="flex items-baseline gap-1">
                <span className={cn(
                    "text-[10px] font-black uppercase",
                    isActive ? "text-emerald-600" : "text-slate-500"
                )}>
                    {livePrice.toFixed(2)}
                </span>
                <span className="text-[8px] font-bold text-slate-400">ETB</span>
            </div>
        </div>
    );
}

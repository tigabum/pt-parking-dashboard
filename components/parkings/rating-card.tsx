"use client";

import React, { useState } from "react";
import { Star, MessageSquare, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ratingService } from "@/lib/services/rating-service";
import { toast } from "sonner";

interface RatingCardProps {
    parkingId: string;
    parkingName?: string;
    customerPhone?: string;
    onSuccess?: () => void;
}

export function RatingCard({
    parkingId,
    parkingName = "this parking",
    customerPhone,
    onSuccess,
}: RatingCardProps) {
    const [rating, setRating] = useState<number>(0);
    const [hover, setHover] = useState<number>(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            return toast.error("Please select a star rating first");
        }

        try {
            setSubmitting(true);
            await ratingService.rateParking({
                parkingId,
                rating,
                comment: comment.trim() || undefined,
                customerPhone,
            });
            toast.success("Thank you for your rating!");
            setSubmitted(true);
            onSuccess?.();
        } catch (error: any) {
            toast.error(error?.message || "Failed to submit rating");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-500">
                <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                    <Star className="h-6 w-6 fill-white" />
                </div>
                <h3 className="text-lg font-black text-emerald-900 tracking-tight">Feedback Received!</h3>
                <p className="text-emerald-700/70 text-xs font-bold uppercase tracking-widest leading-relaxed">
                    Thank you for helping us improve {parkingName}.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
            <div className="text-center space-y-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Rate your Experience</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">How was your stay at {parkingName}?</p>
            </div>

            {/* Star Rating Selection */}
            <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            className="relative transition-all duration-300 hover:scale-125 active:scale-95"
                        >
                            <Star
                                className={cn(
                                    "h-10 w-10 sm:h-12 sm:w-12 transition-colors",
                                    (hover || rating) >= star
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-200 fill-white"
                                )}
                            />
                            {(hover || rating) >= star && (
                                <div className="absolute inset-0 blur-xl bg-amber-400/20 -z-10 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
                {rating > 0 && (
                    <p className="text-center font-black text-amber-500 text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                        {rating === 1 ? "Disappointing" :
                            rating === 2 ? "Below Average" :
                                rating === 3 ? "Satisfactory" :
                                    rating === 4 ? "Very Good" :
                                        "Exceptional!"}
                    </p>
                )}
            </div>

            {/* Comment Field */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                    <MessageSquare className="h-3 w-3 text-slate-400" />
                    <Label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">
                        Anything we can improve?
                    </Label>
                </div>
                <Textarea
                    placeholder="Tell us about your experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[100px] rounded-[1.5rem] bg-white border-slate-100 focus:ring-primary/10 transition-all font-medium text-slate-900 p-4 text-sm placeholder:text-slate-300 placeholder:text-xs"
                />
            </div>

            <Button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full h-14 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-black uppercase tracking-[0.2em] transition-all active:scale-95 border-none text-[10px] shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
            >
                {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <>
                        <Send className="h-4 w-4" />
                        Submit Review
                    </>
                )}
            </Button>
        </div>
    );
}

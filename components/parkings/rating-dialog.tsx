"use client";

import React, { useState } from "react";
import { Star, MessageSquare, Loader2, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ratingService } from "@/lib/services/rating-service";
import { toast } from "sonner";

interface RatingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parkingId: string;
    parkingName?: string;
    customerPhone?: string;
    onSuccess?: () => void;
}

export function RatingDialog({
    open,
    onOpenChange,
    parkingId,
    parkingName = "this parking",
    customerPhone,
    onSuccess,
}: RatingDialogProps) {
    const [rating, setRating] = useState<number>(0);
    const [hover, setHover] = useState<number>(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
            onSuccess?.();
            onOpenChange(false);
            // Reset for next time
            setRating(0);
            setComment("");
        } catch (error: any) {
            toast.error(error?.message || "Failed to submit rating");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
                <div className="bg-primary p-8 text-white relative">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight uppercase tracking-widest leading-tight">
                            Rate Experience
                        </DialogTitle>
                        <DialogDescription className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-2">
                            Share your feedback for {parkingName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="absolute top-6 right-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-full h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Star Rating Selection */}
                    <div className="space-y-4">
                        <Label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] block text-center">
                            Satisfaction Score
                        </Label>
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
                                            "h-10 w-10 transition-colors",
                                            (hover || rating) >= star
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-slate-100 fill-slate-50"
                                        )}
                                    />
                                    {(hover || rating) >= star && (
                                        <div className="absolute inset-0 blur-xl bg-amber-400/20 -z-10 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-center font-bold text-slate-900 text-sm">
                            {rating === 1 ? "Disappointing" :
                                rating === 2 ? "Below Average" :
                                    rating === 3 ? "Satisfactory" :
                                        rating === 4 ? "Very Good" :
                                            rating === 5 ? "Exceptional!" :
                                                "Select Stars"}
                        </p>
                    </div>

                    {/* Comment Field */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-300" />
                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                Optional Comment
                            </Label>
                        </div>
                        <Textarea
                            placeholder="Enter Comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="min-h-[120px] rounded-2xl bg-slate-50 border-none focus:ring-primary/10 transition-all font-medium text-slate-600 p-4"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || rating === 0}
                            className="w-full h-14 rounded-2xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-black uppercase tracking-[0.2em] transition-all active:scale-95 border-none text-xs shadow-none"
                        >
                            {submitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Submit Feedback"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-[10px] uppercase font-black text-slate-300 tracking-widest hover:bg-slate-50"
                        >
                            Skip for now
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

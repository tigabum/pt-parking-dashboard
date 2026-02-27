"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { parkingService } from "@/lib/services/parking-service";
import { walletService } from "@/lib/services/wallet-service";
import {
  ratingService,
  RatingStats,
  Rating,
} from "@/lib/services/rating-service";
import { bookingService } from "@/lib/services/booking-service";
import { ParkingResponse, BookingResponse, BusinessModel } from "@/components/types";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReusableTable, Column } from "@/components/tables";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Info,
  Star,
  CheckCircle2,
  QrCode as QrIcon,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Check,
  ChevronLeft,
  ArrowLeft,
  X,
  FileText,
  Power,
  CreditCard,
  UserSquare,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  Car,
  Box,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Settings2,
  DollarSign,
  Plus,
  Building2,
  Tag,
  Hash,
  Calendar,
  Phone,
  User,
  Layers,
  ToggleLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import {
  DetailLayout,
  DetailSection,
  DetailItem,
} from "@/components/layouts/detail-layout";
import { QrCodeDialog } from "@/components/parkings/qr-code-dialog";
import { BookingStats } from "@/components/parkings/booking-stats";
import { formatMoney, getImageUrl } from "@/lib/utils";
import { LiveDurationCell } from "@/components/bookings/live-duration-cell";
import { WalletTopupForm } from "@/components/forms/wallet-topup-form";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

/* ─── File type helpers ─── */
function isImageFile(path: string) {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".bmp") ||
    lower.endsWith(".svg")
  );
}

function isPdfFile(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

/** Returns true when the array has at least one non-empty string */
function hasFiles(arr?: string[] | null): arr is string[] {
  return Array.isArray(arr) && arr.some((f) => f && f.trim() !== "");
}

/* ─── Helpers ─── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200",
    ENABLED: "bg-green-100 text-green-700 border-green-200",
    PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
    INACTIVE: "bg-red-100 text-red-700 border-red-200",
    DISABLED: "bg-red-100 text-red-700 border-red-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
    PAID: "bg-green-100 text-green-700 border-green-200",
    WAITING_CONFIRMATION: "bg-yellow-100 text-yellow-700 border-yellow-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-bold uppercase text-[10px] tracking-wider px-3 h-7 rounded-full border",
        map[status] ?? "bg-slate-100 text-slate-600 border-slate-200",
      )}
    >
      {status}
    </Badge>
  );
}

/* ─── Read-only field (label + value like form) ─── */
function ReadField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      <div className="min-h-[44px] flex items-center px-3 rounded bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800">
        {value ?? <span className="text-slate-400 italic text-xs">—</span>}
      </div>
    </div>
  );
}

/* ─── Section wrapper ─── */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <div className="w-1 h-5 bg-primary rounded-full" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function ParkingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, canAccess } = useAuth();
  const [parking, setParking] = useState<ParkingResponse | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<BookingResponse[]>([]);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

  // Bookings Pagination & Filter State
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsLimit, setBookingsLimit] = useState(10);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("details");
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [bookingFilters, setBookingFilters] = useState({
    q: "",
    status: "ALL",
    createdById: "",
    updatedById: "",
    confirmedById: "",
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === "parking-booking") {
      loadBookings();
    }
    if (id && activeTab === "reviews") {
      loadReviews();
    }
    if (id && activeTab === "wallet") {
      loadTransactions();
    }
  }, [id, activeTab, bookingsPage, bookingsLimit, bookingFilters, reviewsPage]);

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const res = await ratingService.getParkingRatings(id as string, {
        page: reviewsPage,
        limit: 10,
      });
      setReviews(res.data || []);
      setReviewsTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const params: any = {
        parkingId: id as string,
        page: bookingsPage,
        limit: bookingsLimit,
        sortBy: "createdAt",
        sortOrder: "DESC",
      };

      if (bookingFilters.q) params.q = bookingFilters.q;
      if (bookingFilters.status !== "ALL")
        params.status = bookingFilters.status;
      if (bookingFilters.createdById)
        params.createdById = bookingFilters.createdById;
      if (bookingFilters.updatedById)
        params.updatedById = bookingFilters.updatedById;
      if (bookingFilters.confirmedById)
        params.confirmedById = bookingFilters.confirmedById;

      const res = await bookingService.getAllBookings(params);

      const bookingData = res.data || (res as any).bookings || [];
      setBookings(bookingData);
      setBookingsTotal(res.total || bookingData.length);
      setBookingsTotalPages(
        res.totalPages || Math.ceil((res.total || 1) / bookingsLimit),
      );
    } catch (err) {
      toast.error("Failed to load bookings");
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTxLoading(true);
      const res = await walletService.getTransactions(
        id as string,
        { skipToast: true } as any,
      );
      setTransactions(Array.isArray(res) ? res : []);
    } catch (err: any) {
      const is404 = err?.response?.status === 404 || err?.status === 404;
      if (!is404) {
        toast.error("Failed to load transactions");
      }
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const pRes = await parkingService.getParkingById(id as string);

      if (pRes && pRes.data) {
        setParking(pRes.data);
      } else {
        throw new Error("Parking not found");
      }

      Promise.allSettled([
        ratingService.getRatingStats(id as string),
        bookingService.getAllBookings({ parkingId: id as string, limit: 5 }),
      ]).then(([rRes, bRes]) => {
        if (rRes.status === "fulfilled" && rRes.value?.data) {
          setRatingStats(rRes.value.data);
        }
        if (bRes.status === "fulfilled" && bRes.value?.data) {
          const bookings = Array.isArray(bRes.value.data)
            ? bRes.value.data
            : (bRes.value.data as any).data || [];
          setRecentBookings(bookings);
        }
      });
    } catch (err) {
      toast.error("Failed to load parking details");
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (amount?: number, currency = "ETB") =>
    amount != null ? `${amount} ${currency}` : "—";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-slate-400 font-medium">Loading parking details…</p>
      </div>
    );
  }

  if (!parking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <ImageIcon className="h-16 w-16 text-red-500/20" />
        <p className="text-xl font-bold text-slate-900">Parking not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const canApprove =
    canAccess([UserRole.SYSTEM_SUPER_ADMIN]) && parking.status === "PENDING";

  const handleApprove = async () => {
    if (!parking || approving) return;
    const loadingToast = toast.loading("Approving parking...");
    try {
      setApproving(true);
      await parkingService.approveParking(parking.id);
      toast.success("Parking approved successfully", { id: loadingToast });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve parking", {
        id: loadingToast,
      });
    } finally {
      setApproving(false);
      setIsApproveConfirmOpen(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!parking) return;
    const action = parking.status === "ACTIVE" ? "disable" : "enable";
    const loadingToast = toast.loading(
      `${action === "disable" ? "Disabling" : "Enabling"} parking...`,
    );
    try {
      await parkingService.deleteParking(parking.id);
      toast.success(`Parking ${action}d successfully`, { id: loadingToast });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} parking`, {
        id: loadingToast,
      });
    } finally {
      setIsStatusConfirmOpen(false);
    }
  };

  const reviewColumns: Column<Rating>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (review) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-slate-100">
            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black uppercase">
              {(review.customer?.fullName || "A").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
              {review.customer?.fullName || "Anonymous Member"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Verified User
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (review) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs px-2 h-7 rounded-lg">
            {review.rating}
            <Star size={10} className="ml-1 fill-current stroke-[3px]" />
          </Badge>
          <div className="flex items-center gap-0.5 ml-1 hidden md:flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={8}
                className={cn(
                  "fill-current",
                  s <= review.rating ? "text-amber-400" : "text-slate-100",
                )}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (review) => (
        <p className="text-sm font-medium text-slate-500 line-clamp-1 max-w-sm italic">
          {review.comment || "No comment provided."}
        </p>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (review) => (
        <div className="flex flex-col text-right lg:text-left">
          <span className="font-bold text-slate-700 text-xs">
            {dayjs(review.createdAt).format("MMM D, YYYY")}
          </span>
          <span className="text-[10px] text-slate-400">
            {dayjs(review.createdAt).fromNow()}
          </span>
        </div>
      ),
    },
  ];

  const txColumns: Column<any>[] = [
    {
      key: "type",
      header: "Type",
      render: (tx) => (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              tx.type === "DEPOSIT"
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600",
            )}
          >
            {tx.type === "DEPOSIT" ? (
              <ArrowDownLeft size={16} />
            ) : (
              <ArrowUpRight size={16} />
            )}
          </div>
          <span className="font-bold text-xs uppercase tracking-tighter">
            {tx.type}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (tx) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm">
            {tx.description}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {tx.reference}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (tx) => (
        <span
          className={cn(
            "font-black text-sm",
            tx.type === "DEPOSIT" ? "text-green-600" : "text-red-600",
          )}
        >
          {tx.type === "DEPOSIT" ? "+" : "-"}
          {tx.amount}{" "}
          <span className="text-[10px] font-bold opacity-60">ETB</span>
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (tx) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">
            {dayjs(tx.createdAt).format("MMM D, YYYY")}
          </span>
          <span className="text-[10px] text-slate-400">
            {dayjs(tx.createdAt).format("HH:mm")}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (tx) => <StatusBadge status={tx.status} />,
    },
  ];

  return (
    <DetailLayout
      backLink={{ label: "Parkings", href: "/dashboard/parkings" }}
      title={parking.name}
      subtitle={`ID: ${parking.id.substring(0, 8)} · ${dayjs(parking.createdAt).format("MMM D, YYYY")}`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge */}
          <StatusBadge status={parking.status} />

          {/* QR Code */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQrOpen(true)}
            className="h-9 px-4 font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 transition-all"
          >
            <QrIcon className="h-3.5 w-3.5 mr-2" />
            QR Code
          </Button>

          {/* Edit */}
          {(user?.role === UserRole.SYSTEM_SUPER_ADMIN ||
            user?.role === UserRole.PARKING_SUPER_ADMIN) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/parkings/${id}/edit`)}
                className="h-9 px-4 font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 transition-all"
              >
                <Settings2 className="h-3.5 w-3.5 mr-2" />
                Edit
              </Button>
            )}

          {/* Approve (pending only) */}
          {canApprove && (
            <Button
              size="sm"
              onClick={() => setIsApproveConfirmOpen(true)}
              disabled={approving}
              className="h-9 px-4 font-semibold bg-green-600 hover:bg-green-700 text-white border-transparent transition-all"
            >
              {approving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              )}
              Approve
            </Button>
          )}

          {/* Toggle status (disable / enable) */}
          {canAccess([UserRole.SYSTEM_SUPER_ADMIN]) &&
            parking.status !== "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsStatusConfirmOpen(true)}
                className={cn(
                  "h-9 px-4 font-semibold border transition-all",
                  parking.status === "ACTIVE"
                    ? "border-red-300 text-red-600 hover:bg-red-50"
                    : "border-green-300 text-green-600 hover:bg-green-50",
                )}
              >
                <Power className="h-3.5 w-3.5 mr-2" />
                {parking.status === "ACTIVE" ? "Disable" : "Enable"}
              </Button>
            )}
        </div>
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-8"
      >
        {/* Tab list */}
        <div className="w-full border-b border-slate-200">
          <TabsList className="bg-transparent p-0 h-auto gap-8 w-full justify-start rounded-none">
            {[
              "Details",
              "Reviews",
              "Wallet",
              ...(canAccess([UserRole.SYSTEM_SUPER_ADMIN]) ? ["Parking Booking"] : []),
            ].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab.toLowerCase().replace(" ", "-")}
                className="rounded-none px-0 py-3 text-sm font-semibold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all text-slate-500 data-[state=active]:text-primary"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ──────────── TAB: DETAILS ──────────── */}
        <TabsContent
          value="details"
          className="animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="w-full max-w-5xl mx-auto space-y-10 pb-20">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-10">

              {/* Feature image */}
              {parking.featureImage && (
                <div className="h-52 w-full rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={getImageUrl(parking.featureImage)}
                    className="w-full h-full object-cover"
                    alt="Feature"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      (e.currentTarget.parentElement as HTMLElement).innerHTML =
                        '<div class="flex items-center justify-center h-full text-slate-300 text-sm font-medium">Image unavailable</div>';
                    }}
                  />
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-slate-100" />

              {/* SECTION 1 – Basic Information */}
              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ReadField label="Parking Name" value={parking.name} />
                  <ReadField label="Parking Code" value={parking.parkingCode} />
                  <ReadField label="Parking Type" value={parking.parkingType} />
                  <ReadField label="License Number" value={(parking as any).licenseNumber} />
                  <ReadField label="TIN / Tax ID" value={parking.tinNumber} />
                  <ReadField label="VAT Number" value={parking.vatRegistrationNumber} />
                  <ReadField
                    label="Status"
                    value={<StatusBadge status={parking.status} />}
                  />
                  <ReadField
                    label="Registration Date"
                    value={dayjs(parking.createdAt).format("MMM D, YYYY HH:mm")}
                  />
                  <ReadField
                    label="Managed By"
                    value={parking.createdBy?.fullName}
                  />
                </div>
              </FormSection>

              <div className="h-px bg-slate-100" />

              {/* SECTION 2 – Capacity */}
              <FormSection title="Capacity">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <ReadField
                    label="Total Spots"
                    value={`${parking.numberOfSpots} spots`}
                  />
                  <ReadField
                    label="Available Spots"
                    value={
                      <span className="text-green-700 font-semibold">
                        {parking.availableSpots} unoccupied
                      </span>
                    }
                  />
                  <ReadField
                    label="Occupied Spots"
                    value={
                      <span className="text-red-600 font-semibold">
                        {parking.numberOfSpots - (parking.availableSpots || 0)} in use
                      </span>
                    }
                  />
                  <ReadField
                    label="Fill Rate"
                    value={`${Math.round(((parking.numberOfSpots - (parking.availableSpots || 0)) / (parking.numberOfSpots || 1)) * 100)}%`}
                  />
                  <ReadField
                    label="Indoor Facility"
                    value={(parking as any).isIndoor ? "Yes" : "No"}
                  />
                </div>
              </FormSection>

              <div className="h-px bg-slate-100" />

              {/* SECTION 3 – Business & Pricing */}
              <FormSection title="Business & Pricing">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ReadField
                    label="Business Model"
                    value={
                      parking.businessModel === BusinessModel.SUBSCRIPTION
                        ? "Subscription Based"
                        : "Commission Based"
                    }
                  />
                  {parking.businessModel === BusinessModel.SUBSCRIPTION ? (
                    <>
                      <ReadField
                        label="Annual Subscription Fee"
                        value={fmtMoney(parking.subscriptionFee)}
                      />
                      <ReadField
                        label="Renewal Date"
                        value={
                          parking.subscriptionRenewalDate
                            ? dayjs(parking.subscriptionRenewalDate).format("MMM D, YYYY")
                            : "—"
                        }
                      />
                    </>
                  ) : (
                    <ReadField
                      label="Commission Config"
                      value={parking.commissionConfig?.name || "Standard Rate"}
                    />
                  )}
                  <ReadField
                    label="Hourly Rate"
                    value={fmtMoney(parking.pricing?.hourly?.price, parking.pricing?.hourly?.currency)}
                  />
                  <ReadField
                    label="Daily Rate"
                    value={fmtMoney(parking.pricing?.daily?.price, parking.pricing?.daily?.currency)}
                  />
                  <ReadField
                    label="Monthly Rate"
                    value={fmtMoney(parking.pricing?.monthly?.price, parking.pricing?.monthly?.currency)}
                  />
                  <ReadField
                    label="Flat Fee"
                    value={fmtMoney(parking.pricing?.flat?.price, parking.pricing?.flat?.currency)}
                  />
                  <ReadField
                    label="Satisfaction Score"
                    value={
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span>
                          {parking.ratingsCount > 0
                            ? `${Number(parking.averageRating).toFixed(1)} / 5.0`
                            : "No ratings yet"}
                        </span>
                        {parking.ratingsCount > 0 && (
                          <span className="text-slate-400 text-xs">
                            ({parking.ratingsCount} reviews)
                          </span>
                        )}
                      </div>
                    }
                  />
                </div>
              </FormSection>

              <div className="h-px bg-slate-100" />

              {/* SECTION 4 – Address */}
              <FormSection title="Address Details">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <ReadField label="Country" value={parking.country} />
                  <ReadField label="Region" value={parking.region} />
                  <ReadField label="City" value={parking.city} />
                  <ReadField label="Sub-City" value={parking.subCity} />
                  <ReadField label="Woreda" value={parking.woreda} />
                  <ReadField label="Kebele" value={parking.kebele} />
                  <ReadField label="Street Name" value={parking.streetName} />
                  <ReadField
                    label="Coordinates"
                    value={
                      parking.lat && parking.lng
                        ? `${Number(parking.lat).toFixed(6)}, ${Number(parking.lng).toFixed(6)}`
                        : "—"
                    }
                  />
                </div>
              </FormSection>

              <div className="h-px bg-slate-100" />

              {/* SECTION 5 – Description */}
              <FormSection title="Description & Amenities">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">
                    Facility Description
                  </Label>
                  <div className="min-h-[80px] p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {parking.description || (
                      <span className="italic text-slate-400 text-xs">No description provided.</span>
                    )}
                  </div>
                </div>

                {parking.amenities && parking.amenities.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-xs font-semibold text-slate-500">
                      Operational Amenities
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 rounded bg-slate-50 border border-slate-200">
                      {parking.amenities.map((item, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="font-medium text-xs px-3 py-1 rounded-full border-slate-300 text-slate-700 bg-white"
                        >
                          <Check className="h-3 w-3 mr-1.5 text-green-500" />
                          {item.name}
                          {item.value && (
                            <span className="text-slate-400 ml-1">
                              · {item.value}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </FormSection>

              <div className="h-px bg-slate-100" />

              {/* SECTION 6 – Map */}
              <FormSection title="Location on Map">
                <div className="rounded-xl overflow-hidden border border-slate-200 h-[400px] w-full">
                  {parking.lat && parking.lng ? (
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${parking.lat},${parking.lng}&zoom=17`}
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                      <MapPin className="h-10 w-10" />
                      <p className="text-sm font-medium">
                        Location not available
                      </p>
                    </div>
                  )}
                </div>
              </FormSection>

              {/* SECTION 7 – Documents */}
              {(hasFiles(parking.licenseFiles) ||
                hasFiles(parking.agreementDocuments)) && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <FormSection title="Legal Documents">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          ...(parking.licenseFiles || []).filter(Boolean).map((f, idx) => ({
                            url: f,
                            type: "Business License",
                            label: `License Certificate #${idx + 1}`,
                          })),
                          ...(parking.agreementDocuments || []).filter(Boolean).map((f, idx) => ({
                            url: f,
                            type: "Operation Agreement",
                            label: `Agreement #${idx + 1}`,
                          })),
                        ].map((doc, i) => {
                          const fullUrl = getImageUrl(doc.url);
                          const isImg = isImageFile(doc.url);
                          const isPdf = isPdfFile(doc.url);
                          return (
                            <button
                              key={i}
                              onClick={() =>
                                setPreviewDoc({ url: fullUrl, title: doc.label })
                              }
                              className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                            >
                              {/* Thumbnail for images, icon for PDFs/others */}
                              {isImg ? (
                                <div className="h-14 w-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                  <img
                                    src={fullUrl}
                                    className="w-full h-full object-cover"
                                    alt={doc.label}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = "none";
                                      (e.currentTarget.parentElement as HTMLElement).innerHTML =
                                        '<div class="flex items-center justify-center h-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-300"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className={`h-14 w-14 rounded-lg flex items-center justify-center shrink-0 border ${isPdf
                                    ? "bg-red-50 border-red-200"
                                    : "bg-slate-100 border-slate-200"
                                  }`}>
                                  <FileText className={`h-6 w-6 ${isPdf ? "text-red-400" : "text-slate-400"
                                    }`} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 pt-1">
                                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate">
                                  {doc.label}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {doc.type}
                                </p>
                                <p className="text-[10px] text-primary mt-1 font-medium group-hover:underline">
                                  {isPdf ? "View PDF" : isImg ? "View Image" : "Open File"}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </FormSection>
                  </>
                )}

              {/* SECTION 8 – Gallery */}
              {hasFiles(parking.galleryImages) && (
                <>
                  <div className="h-px bg-slate-100" />
                  <FormSection title="Photo Gallery">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {(parking.galleryImages || []).filter(Boolean).map((img, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setPreviewDoc({ url: getImageUrl(img), title: `Photo ${i + 1}` })
                          }
                          className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 cursor-zoom-in"
                        >
                          {isImageFile(img) ? (
                            <img
                              src={getImageUrl(img)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              alt={`Gallery ${i}`}
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-300 gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style="font-size:9px">No preview</span></div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1">
                              <FileText className="h-6 w-6" />
                              <span className="text-[9px] font-medium uppercase">
                                {img.split(".").pop() || "File"}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </FormSection>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ──────────── TAB: PARKING BOOKING ──────────── */}
        <TabsContent
          value="parking-booking"
          className="space-y-8 animate-in slide-in-from-bottom-4 duration-300"
        >
          {canAccess([UserRole.SYSTEM_SUPER_ADMIN]) && (
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200">
              <BookingStats parkingId={parking.id} />
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Parking Activity
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Full history of parking sessions and payments.
                  </p>
                </div>
                {bookingsLoading && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search plate or phone..."
                    className="pl-9 h-9 rounded-lg border-slate-200 bg-slate-50 text-sm"
                    value={bookingFilters.q}
                    onChange={(e) =>
                      setBookingFilters((prev) => ({ ...prev, q: e.target.value }))
                    }
                  />
                </div>

                <Select
                  value={bookingFilters.status}
                  onValueChange={(val) =>
                    setBookingFilters((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-100 shadow-lg">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Created By..."
                    className="pl-9 h-9 rounded-lg border-slate-200 bg-slate-50 text-sm"
                    value={bookingFilters.createdById}
                    onChange={(e) =>
                      setBookingFilters((prev) => ({ ...prev, createdById: e.target.value }))
                    }
                  />
                </div>

                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Confirmed By..."
                    className="pl-9 h-9 rounded-lg border-slate-200 bg-slate-50 text-sm"
                    value={bookingFilters.confirmedById}
                    onChange={(e) =>
                      setBookingFilters((prev) => ({ ...prev, confirmedById: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Customer & Vehicle</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Session Duration</th>
                    <th className="px-6 py-4">System Trace</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((booking, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {booking.customerName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {booking.customerPhone}
                            </div>
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] bg-primary/10 text-primary border-none mt-1 h-5 px-1.5 rounded"
                            >
                              {booking.plateNumber}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-slate-700 font-bold min-w-[120px]">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {dayjs(booking.startTime).format("MMM D, HH:mm")}
                          </div>
                          {booking.endTime && (
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 pl-5">
                              <ArrowLeft className="h-2.5 w-2.5 rotate-180" />
                              {dayjs(booking.endTime).format("HH:mm")}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <LiveDurationCell
                          booking={booking as any}
                          parking={parking as any}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                              Created By
                            </span>
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]">
                              {booking.createdBy?.fullName || "System / Guest"}
                            </span>
                          </div>
                          {booking.confirmedBy && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                                Confirmed By
                              </span>
                              <span className="font-bold text-green-700 text-xs truncate max-w-[120px]">
                                {booking.confirmedBy.fullName}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge status={booking.status as string} />
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && !bookingsLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400 font-medium text-sm"
                      >
                        No bookings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100">
              <DashboardPagination
                page={bookingsPage}
                totalPages={bookingsTotalPages}
                total={bookingsTotal}
                onPageChange={setBookingsPage}
                limit={bookingsLimit}
                onLimitChange={setBookingsLimit}
              />
            </div>
          </div>
        </TabsContent>

        {/* ──────────── TAB: REVIEWS ──────────── */}
        <TabsContent
          value="reviews"
          className="animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customer Reviews
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Log of member reviews and facility ratings
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end pr-6 border-r border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Avg Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {ratingStats?.averageRating != null
                        ? Number(ratingStats.averageRating).toFixed(1)
                        : "0.0"}
                    </span>
                    <Star className="h-4 w-4 text-amber-400 fill-current" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Total Reviews
                  </p>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">
                    {ratingStats?.totalRatings || 0}
                  </p>
                </div>
              </div>
            </div>

            <ReusableTable
              data={reviews}
              columns={reviewColumns}
              getRowKey={(row) => row.id}
              isLoading={reviewsLoading}
              emptyText="No reviews recorded for this parking."
            />

            {reviewsTotalPages > 1 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <DashboardPagination
                  page={reviewsPage}
                  totalPages={reviewsTotalPages}
                  total={ratingStats?.totalRatings || 0}
                  onPageChange={setReviewsPage}
                  limit={10}
                  onLimitChange={() => { }}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* ──────────── TAB: WALLET ──────────── */}
        <TabsContent
          value="wallet"
          className="animate-in slide-in-from-bottom-4 duration-300 pb-20"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Wallet Balance
                </p>
                <p className="text-5xl font-black text-slate-900 tabular-nums tracking-tight">
                  {Number(parking.wallet?.balance || 0).toLocaleString()}{" "}
                  <span className="text-base font-bold text-slate-400">ETB</span>
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Active terminal credit for transactional clearance.
                </p>
              </div>

              {(user?.role === UserRole.SYSTEM_SUPER_ADMIN ||
                user?.role === UserRole.PARKING_SUPER_ADMIN) && (
                  <Button
                    onClick={() => setIsTopupOpen(true)}
                    className="h-11 px-6 font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Transaction History
              </h3>
            </div>
            <ReusableTable
              data={transactions}
              columns={txColumns}
              getRowKey={(row) => row.id}
              isLoading={txLoading}
              emptyText={
                !parking?.wallet
                  ? "No wallet initialized for this parking."
                  : "No transactions recorded yet."
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      {parking && (
        <>
          <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
            <DialogContent className="max-w-md p-8 rounded-2xl border border-slate-200 shadow-sm">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Add Funds to Wallet
                </DialogTitle>
              </DialogHeader>
              <WalletTopupForm
                parkingId={parking.id}
                parkingName={parking.name}
                onSuccess={() => {
                  setIsTopupOpen(false);
                  loadData();
                  loadTransactions();
                }}
                onCancel={() => setIsTopupOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <QrCodeDialog
            open={isQrOpen}
            onOpenChange={setIsQrOpen}
            parkingId={parking.id}
            parkingName={parking.name}
          />
        </>
      )}

      {/* Document Preview */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden border border-slate-200 rounded-2xl">
          {previewDoc && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{previewDoc.title || "Document Preview"}</DialogTitle>
              </DialogHeader>
              <div className="absolute top-4 right-4 z-50">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewDoc(null)}
                  className="h-10 w-10 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md"
                >
                  <X size={20} />
                </Button>
              </div>
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                {previewDoc.url ? (
                  isPdfFile(previewDoc.url) ? (
                    <iframe
                      src={previewDoc.url}
                      className="w-full h-full"
                      title={previewDoc.title}
                    />
                  ) : isImageFile(previewDoc.url) ? (
                    <img
                      src={previewDoc.url}
                      className="max-w-full max-h-full object-contain shadow-2xl"
                      alt={previewDoc.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "";
                        (e.currentTarget as HTMLImageElement).alt = "Failed to load image";
                      }}
                    />
                  ) : (
                    // For unknown file types, try rendering as iframe
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                      <FileText className="h-16 w-16" />
                      <p className="font-medium text-sm">Preview not available</p>
                      <a
                        href={previewDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Open File
                      </a>
                    </div>
                  )
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirm */}
      <AlertDialog
        open={isApproveConfirmOpen}
        onOpenChange={setIsApproveConfirmOpen}
      >
        <AlertDialogContent className="rounded-2xl border border-slate-200 shadow-sm p-10 max-w-sm">
          <AlertDialogHeader className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-center text-slate-900">
              Approve Parking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              This will make the parking facility live and available for customer bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex-col sm:flex-col gap-3">
            <AlertDialogAction
              onClick={handleApprove}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11 rounded-lg transition-all"
            >
              Confirm Approval
            </AlertDialogAction>
            <AlertDialogCancel className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold h-11 rounded-lg transition-all">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirm */}
      <AlertDialog
        open={isStatusConfirmOpen}
        onOpenChange={setIsStatusConfirmOpen}
      >
        <AlertDialogContent className="rounded-2xl border border-slate-200 shadow-sm p-10 max-w-sm">
          {parking && (
            <>
              <AlertDialogHeader className="space-y-4">
                <div
                  className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center mx-auto",
                    parking.status === "ACTIVE"
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600",
                  )}
                >
                  <Power size={28} />
                </div>
                <AlertDialogTitle className="text-lg font-bold text-center text-slate-900">
                  {parking.status === "ACTIVE" ? "Disable" : "Enable"} Facility?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
                  Are you sure you want to{" "}
                  {parking.status === "ACTIVE" ? "disable" : "enable"} this
                  parking?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 flex-col sm:flex-col gap-3">
                <AlertDialogAction
                  onClick={handleToggleStatus}
                  className={cn(
                    "w-full font-semibold h-11 rounded-lg transition-all text-white",
                    parking.status === "ACTIVE"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700",
                  )}
                >
                  Confirm {parking.status === "ACTIVE" ? "Disable" : "Enable"}
                </AlertDialogAction>
                <AlertDialogCancel className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold h-11 rounded-lg transition-all">
                  Cancel
                </AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </DetailLayout>
  );
}

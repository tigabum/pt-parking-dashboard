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
import { ParkingResponse, BookingResponse } from "@/components/types";
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

  // Bookings Pagination & Filter State
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsLimit, setBookingsLimit] = useState(10);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
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
      // Silence wallet not found errors (404)
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

      // Load secondary data in parallel, but don't fail if they error
      Promise.allSettled([
        ratingService.getRatingStats(id as string),
        bookingService.getAllBookings({ parkingId: id as string, limit: 5 }),
      ]).then(([rRes, bRes]) => {
        if (rRes.status === "fulfilled" && rRes.value?.data) {
          setRatingStats(rRes.value.data);
        }
        if (bRes.status === "fulfilled" && bRes.value?.data) {
          // Check if data is array or object with data property
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

  const formatMoney = (amount?: number, currency = "ETB") =>
    amount != null ? `${amount} ${currency}` : "—";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 font-bold text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin opacity-20" />
        <p className="uppercase tracking-widest text-[10px]">
          Synchronizing Assigned Parking Data...
        </p>
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
    if (!confirm("Are you sure you want to approve this parking?")) return;

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
    }
  };

  const handleToggleStatus = async () => {
    if (!parking) return;
    const action = parking.status === "ACTIVE" ? "disable" : "enable";
    if (!confirm(`Are you sure you want to ${action} this parking?`)) return;

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
    }
  };

  const DetailItemComp = ({
    label,
    value,
    icon: Icon,
    className,
  }: {
    label: string;
    value: React.ReactNode;
    icon?: any;
    className?: string;
  }) => (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </Label>
      <div className="flex items-center gap-3 p-3.5 rounded bg-slate-50 border border-slate-100 min-h-[50px]">
        {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
        <div className="text-sm font-bold text-slate-900 truncate w-full">
          {value || "—"}
        </div>
      </div>
    </div>
  );

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
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
              Verified User
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Sentiment",
      render: (review) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-amber-50 text-amber-600 border border-amber-100 font-black text-xs px-2 h-7 rounded-lg group-hover:bg-amber-100 transition-colors">
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
          "{review.comment || "No written sentiment provided."}"
        </p>
      ),
    },
    {
      key: "createdAt",
      header: "Observed",
      render: (review) => (
        <div className="flex flex-col text-right lg:text-left">
          <span className="font-bold text-slate-700 text-xs">
            {dayjs(review.createdAt).format("MMM D, YYYY")}
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase">
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
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
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
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {dayjs(tx.createdAt).format("HH:mm")}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (tx) => (
        <Badge
          variant="outline"
          className={cn(
            "font-bold uppercase text-[9px] px-2 h-6 rounded-lg border-none shadow-none",
            tx.status === "COMPLETED"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {tx.status}
        </Badge>
      ),
    },
  ];

  return (
    <DetailLayout
      backLink={{ label: "Parkings", href: "/dashboard/parkings" }}
      title={parking.name}
      subtitle={`ID: ${parking.id.substring(0, 8)} • ${dayjs(parking.createdAt).format("MMM D, YYYY")}`}
      actions={
        <div className="flex items-center gap-1.5 md:gap-2">
          {canAccess([UserRole.SYSTEM_SUPER_ADMIN]) &&
            parking.status !== "PENDING" && (
              <Button
                onClick={handleToggleStatus}
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 rounded-full px-4 font-bold border-slate-200",
                  parking.status === "ACTIVE"
                    ? "text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                    : "text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200",
                )}
              >
                <Power className="h-3.5 w-3.5 mr-2" />
                {parking.status === "ACTIVE"
                  ? "Disable Terminal"
                  : "Enable Terminal"}
              </Button>
            )}
          {canApprove && (
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-500 text-white rounded-full h-9 px-6 text-xs font-bold shadow-sm"
            >
              {approving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              )}
              Approve
            </Button>
          )}
          {(user?.role === UserRole.SYSTEM_SUPER_ADMIN ||
            user?.role === UserRole.PARKING_SUPER_ADMIN) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/parkings/${id}/edit`)}
                className="h-9 rounded-full px-4 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
              >
                <Settings2 className="h-3.5 w-3.5 mr-2" />
                Edit Parking
              </Button>
            )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQrOpen(true)}
            className="h-9 rounded-full px-4 font-bold text-slate-700 bg-white border-slate-200"
          >
            <QrIcon className="h-3.5 w-3.5 mr-2" />
            QR Code
          </Button>
          <Badge
            className={cn(
              "h-9 px-4 rounded-full flex items-center justify-center font-bold uppercase text-[10px] tracking-wider border-none shadow-sm",
              parking.status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {parking.status}
          </Badge>
        </div>
      }
    >
      {/* Hero Section */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-slate-900 rounded-[2rem] overflow-hidden mb-12">
        {parking.featureImage ? (
          <img
            src={getImageUrl(parking.featureImage)}
            className="w-full h-full object-cover opacity-80"
            alt="Cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <Badge
              variant="outline"
              className="text-white border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold"
            >
              {parking.parkingType || "Public Parking"}
            </Badge>
            <h1 className="text-2xl md:text-5xl font-black text-white leading-tight">
              {parking.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {parking.city || "Unknown City"}
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-current" />
                <span className="text-white font-bold">
                  {ratingStats?.averageRating != null
                    ? Number(ratingStats.averageRating).toFixed(1)
                    : "New"}
                </span>
                <span className="opacity-60">
                  ({ratingStats?.totalRatings || 0} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="details"
        className="w-full space-y-12"
        onValueChange={setActiveTab}
      >
        <div className="bg-slate-100/50 p-1.5 rounded-2xl w-fit">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            {[
              "Details",
              "Reviews",
              "Wallet",
              ...(canAccess([UserRole.SYSTEM_SUPER_ADMIN])
                ? ["Parking Booking"]
                : []),
            ].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab.toLowerCase().replace(" ", "-")}
                className="rounded px-6 py-2.5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TAB: DETAILS (Consolidated) */}
        <TabsContent
          value="details"
          className="space-y-16 animate-in slide-in-from-bottom-4 duration-500 pb-20"
        >
          {/* Visual Live Capacity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-amber-500">
                <Box className="h-24 w-24" />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-black">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">
                  Total Capacity
                </p>
                <p className="text-4xl font-black text-slate-900">
                  {parking.numberOfSpots}{" "}
                  <span className="text-sm font-bold text-slate-300">
                    Spots
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-24 w-24 text-emerald-500" />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-1">
                  Live Available
                </p>
                <p className="text-4xl font-black text-emerald-600">
                  {parking.availableSpots}{" "}
                  <span className="text-sm font-bold text-emerald-600/30">
                    Free
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Car className="h-24 w-24 text-red-500" />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">
                  Currently Occupied
                </p>
                <p className="text-4xl font-black text-red-600">
                  {parking.numberOfSpots - (parking.availableSpots ?? 0)}{" "}
                  <span className="text-sm font-bold text-red-600/30">
                    Reserved
                  </span>
                </p>
              </div>
            </div>
          </div>

          <DetailSection title="Parking Detail">
            {/* Capacity Stats */}
            <DetailItem
              label="Total Capacity"
              value={`${parking.numberOfSpots} Spots`}
            />
            <DetailItem
              label="Available Spots"
              value={`${parking.availableSpots} Free`}
              className="text-emerald-600"
            />
            <DetailItem
              label="Occupied Spots"
              value={`${parking.numberOfSpots - (parking.availableSpots || 0)} Busy`}
              className="text-amber-600"
            />
            <DetailItem
              label="Current Fill Rate"
              value={`${Math.round(((parking.numberOfSpots - (parking.availableSpots || 0)) / (parking.numberOfSpots || 1)) * 100)}%`}
              className="text-primary"
            />

            {/* System Info */}
            <DetailItem
              label="Assigned Manager"
              value={parking.createdBy?.fullName || "—"}
            />
            <DetailItem
              label="Customer Satisfaction"
              value={
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>
                    {parking.ratingsCount > 0
                      ? `${Number(parking.averageRating).toFixed(1)} / 5.0`
                      : "New / No ratings"}
                  </span>
                  {parking.ratingsCount > 0 && (
                    <span className="text-slate-400 font-medium">
                      ({parking.ratingsCount} reviews)
                    </span>
                  )}
                </div>
              }
            />
            <DetailItem
              label="Commission Structure"
              value={parking.commissionConfig?.name || "—"}
              className="text-primary"
            />
            <DetailItem
              label="VAT Number"
              value={parking.vatRegistrationNumber || "—"}
            />
            <DetailItem label="TIN/Tax ID" value={parking.tinNumber || "—"} />
            <DetailItem
              label="Registration Date"
              value={dayjs(parking.createdAt).format("MMM D, YYYY HH:mm")}
            />
            <DetailItem label="Terminal Status" value={parking.status} />

            {/* Pricing */}
            <DetailItem
              label="Hourly Rate"
              value={formatMoney(
                parking.pricing?.hourly?.price,
                parking.pricing?.hourly?.currency,
              )}
            />
            <DetailItem
              label="Daily Rate"
              value={formatMoney(
                parking.pricing?.daily?.price,
                parking.pricing?.daily?.currency,
              )}
            />
            <DetailItem
              label="Monthly Plan"
              value={formatMoney(
                parking.pricing?.monthly?.price,
                parking.pricing?.monthly?.currency,
              )}
            />
            <DetailItem
              label="Flat Fee"
              value={formatMoney(
                parking.pricing?.flat?.price,
                parking.pricing?.flat?.currency,
              )}
            />

            {/* Geographic */}
            <DetailItem label="Region" value={parking.region || "—"} />
            <DetailItem label="City" value={parking.city || "—"} />
            <DetailItem label="Sub-City" value={parking.subCity || "—"} />
            <DetailItem label="Woreda" value={parking.woreda || "—"} />
            <DetailItem label="Kebele" value={parking.kebele || "—"} />
            <DetailItem label="Street Name" value={parking.streetName || "—"} />
            <DetailItem label="Country" value={parking.country || "—"} />

            {/* Description & Amenities */}
            <div className="col-span-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Facility Overview
                </Label>
                <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {parking.description || "No facility description provided."}
                </p>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Available Services & Amenities
                </Label>
                <div className="flex flex-wrap gap-2 text-primary p-2">
                  {parking.amenities?.length > 0 ||
                    (parking as any).amenitiesList?.length > 0 ? (
                    <>
                      {parking.amenities?.map((item, i) => (
                        <div
                          key={`json-${i}`}
                          className="px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-[11px] font-black uppercase tracking-tight flex items-center gap-2"
                        >
                          <Check className="h-3 w-3" />
                          <span>
                            {item.name}
                            {item.value && (
                              <span className="text-primary/60 ml-1 font-bold normal-case">
                                ({item.value})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      {(!parking.amenities || parking.amenities.length === 0) &&
                        (parking as any).amenitiesList?.map(
                          (item: any, i: number) => (
                            <div
                              key={`list-${i}`}
                              className="px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-[11px] font-black uppercase tracking-tight flex items-center gap-2"
                            >
                              <Check className="h-3 w-3" />
                              {item.name}
                            </div>
                          ),
                        )}
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs italic">
                      No amenities listed.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="col-span-full mt-8">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">
                Exact Geographic Positioning
              </Label>
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative bg-slate-50 h-[450px]">
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
                  <div className="flex items-center justify-center h-full text-slate-400 font-bold italic">
                    Exact coordinates not provided.
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            {((parking.licenseFiles && parking.licenseFiles.length > 0) ||
              (parking.agreementDocuments &&
                parking.agreementDocuments.length > 0)) && (
                <div className="col-span-full mt-8">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">
                    Legal Compliance & Certifications
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      ...(parking.licenseFiles || []).map((f, idx) => ({
                        url: f,
                        type: "Business License",
                        label: `License #${idx + 1}`,
                      })),
                      ...(parking.agreementDocuments || []).map((f, idx) => ({
                        url: f,
                        type: "Agreement Doc",
                        label: `Agreement #${idx + 1}`,
                      })),
                    ].map((doc, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          setPreviewDoc({
                            url: getImageUrl(doc.url),
                            title: doc.label,
                          })
                        }
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="h-10 w-10 rounded bg-white border border-slate-100 shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {doc.label}
                          </p>
                          <p className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-widest">
                            {doc.type} • Click to view
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Gallery */}
            {parking.galleryImages && parking.galleryImages.length > 0 && (
              <div className="col-span-full mt-8">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">
                  Visual Media & Facility Gallery
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {parking.galleryImages.map((img, i) => (
                    <div
                      key={i}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm cursor-zoom-in transition-all hover:shadow-lg hover:border-primary/20"
                    >
                      <img
                        src={getImageUrl(img)}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                        alt={`Gallery ${i}`}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DetailSection>
        </TabsContent>

        {/* TAB: PARKING BOOKING (Only for Super Admin) */}
        <TabsContent
          value="parking-booking"
          className="space-y-8 animate-in slide-in-from-bottom-4 duration-500"
        >
          {canAccess([UserRole.SYSTEM_SUPER_ADMIN]) && (
            <div className="bg-white rounded p-6 md:p-8 shadow-sm border">
              <BookingStats parkingId={parking.id} />
            </div>
          )}

          <div className="bg-white rounded overflow-hidden border shadow-sm">
            <div className="p-6 md:p-8 border-b bg-slate-50/50 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">
                    Parking Activity
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search plate or phone..."
                    className="pl-10 h-11 rounded border-slate-200"
                    value={bookingFilters.q}
                    onChange={(e) =>
                      setBookingFilters((prev) => ({
                        ...prev,
                        q: e.target.value,
                      }))
                    }
                  />
                </div>

                <Select
                  value={bookingFilters.status}
                  onValueChange={(val) =>
                    setBookingFilters((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger className="h-11 rounded border-slate-200 bg-white font-bold text-slate-700">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Created By (User ID)..."
                    className="pl-10 h-11 rounded border-slate-200"
                    value={bookingFilters.createdById}
                    onChange={(e) =>
                      setBookingFilters((prev) => ({
                        ...prev,
                        createdById: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Confirmed By (User ID)..."
                    className="pl-10 h-11 rounded border-slate-200"
                    value={bookingFilters.confirmedById}
                    onChange={(e) =>
                      setBookingFilters((prev) => ({
                        ...prev,
                        confirmedById: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Customer & Vehicle</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Session Pulse</th>
                    <th className="px-6 py-4">System Trace</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bookings.map((booking, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {booking.customerName}
                            </div>
                            <div className="text-xs font-mono text-slate-400">
                              {booking.customerPhone}
                            </div>
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] bg-primary/10 text-primary border-none mt-1 h-5 px-1.5"
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              Created By
                            </span>
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]">
                              {booking.createdBy?.fullName ||
                                "GuestPortal / System"}
                            </span>
                          </div>
                          {booking.confirmedBy && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                Confirmed By
                              </span>
                              <span className="font-bold text-green-700 text-xs truncate max-w-[120px]">
                                {booking.confirmedBy.fullName}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          className={cn(
                            "font-bold uppercase text-[10px] tracking-wider border-none shadow-none px-3 h-7 rounded-full",
                            (booking.status as any) === "PAID"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : booking.status === "WAITING_CONFIRMATION"
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : booking.status === "ACTIVE"
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  : booking.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                    : booking.status === "CANCELLED"
                                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && !bookingsLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-40"
                      >
                        No activity recorded for this member.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
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

        {/* TAB: REVIEWS */}
        <TabsContent
          value="reviews"
          className="space-y-8 animate-in slide-in-from-bottom-4 duration-500"
        >
          <div className="bg-white rounded overflow-hidden border shadow-sm">
            <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">
                  Sentiment Registry
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight opacity-70">
                  Log of member reviews and facility ratings
                </p>
              </div>

              <div className="flex items-center gap-6 pr-4">
                <div className="flex flex-col items-end px-6 py-2 border-r border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                    Satisfactory Score
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {ratingStats?.averageRating != null
                        ? Number(ratingStats.averageRating).toFixed(1)
                        : "0.0"}
                    </span>
                    <Star className="h-4 w-4 text-amber-400 fill-current mb-0.5" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                    Total Signals
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
              emptyText="No customer sentiments recorded for this terminal."
            />

            {reviewsTotalPages > 1 && (
              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
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

        <TabsContent
          value="wallet"
          className="space-y-8 animate-in slide-in-from-bottom-4 duration-500"
        >
          <div className="bg-white rounded overflow-hidden border shadow-sm">
            <div className="p-8 border-b bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">
                  Transaction History
                </h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight opacity-70">
                  Audit trail of all financial movements
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 md:gap-6 shrink-0">
                <div className="flex flex-col items-end px-6 py-1.5 border-r border-slate-200">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em] mb-0.5">
                    Current Balance
                  </p>
                  <p className="text-3xl font-black text-primary tabular-nums tracking-tighter">
                    {Number(parking.wallet?.balance || 0).toLocaleString()}{" "}
                    <span className="text-xs opacity-50 font-black uppercase">
                      ETB
                    </span>
                  </p>
                </div>

                {(user?.role === UserRole.SYSTEM_SUPER_ADMIN ||
                  user?.role === UserRole.PARKING_SUPER_ADMIN) && (
                    <Button
                      onClick={() => setIsTopupOpen(true)}
                      className="bg-primary hover:opacity-90 text-white rounded h-12 px-8 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Plus className="h-4 w-4 mr-2 stroke-[4px]" />
                      Topup Wallet
                    </Button>
                  )}
              </div>
            </div>
            <ReusableTable
              data={transactions}
              columns={txColumns}
              getRowKey={(row) => row.id}
              isLoading={txLoading}
              emptyText={
                !parking?.wallet
                  ? "No wallet initialization detected for this terminal."
                  : "No transactions recorded yet."
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Topup Dialog */}
      <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
        <DialogContent className="max-w-md p-6 rounded border-none shadow-2xl overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Topup Terminal Wallet
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

      {/* QR Code Dialog */}
      <QrCodeDialog
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        parkingId={parking.id}
        parkingName={parking.name}
      />

      {/* Doc Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden border-none shadow-2xl rounded">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewDoc?.title || "Document Preview"}</DialogTitle>
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
            {previewDoc?.url ? (
              previewDoc.url.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewDoc.url} className="w-full h-full" />
              ) : (
                <img
                  src={previewDoc.url}
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  alt={previewDoc.title}
                />
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </DetailLayout>
  );
}

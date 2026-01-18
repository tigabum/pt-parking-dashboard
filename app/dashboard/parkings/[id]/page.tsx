"use client";
import { UserRole } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { parkingService } from "@/lib/services/parking-service";
import { walletService } from "@/lib/services/wallet-service";
import { ratingService, RatingStats, Rating } from "@/lib/services/rating-service";
import { bookingService } from "@/lib/services/booking-service";
import { ParkingResponse, BookingResponse } from "@/components/types";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReusableTable, Column } from "@/components/tables";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import { DetailLayout, DetailSection, DetailItem } from "@/components/layouts/detail-layout";
import { QrCodeDialog } from "@/components/parkings/qr-code-dialog";
import { BookingStats } from "@/components/parkings/booking-stats";
import { getImageUrl } from "@/lib/utils";
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
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

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
    confirmedById: ""
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === "bookings") {
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
        limit: 10
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
        sortOrder: "DESC"
      };

      if (bookingFilters.q) params.q = bookingFilters.q;
      if (bookingFilters.status !== "ALL") params.status = bookingFilters.status;
      if (bookingFilters.createdById) params.createdById = bookingFilters.createdById;
      if (bookingFilters.updatedById) params.updatedById = bookingFilters.updatedById;
      if (bookingFilters.confirmedById) params.confirmedById = bookingFilters.confirmedById;

      const res = await bookingService.getAllBookings(params);

      const bookingData = res.data || (res as any).bookings || [];
      setBookings(bookingData);
      setBookingsTotal(res.total || bookingData.length);
      setBookingsTotalPages(res.totalPages || Math.ceil((res.total || 1) / bookingsLimit));
    } catch (err) {
      toast.error("Failed to load bookings");
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTxLoading(true);
      const res = await walletService.getTransactions(id as string);
      setTransactions(res || []);
    } catch (err) {
      toast.error("Failed to load transactions");
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
        <p className="text-xl font-bold text-slate-900">
          Parking not found
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const canApprove = canAccess([UserRole.SYSTEM_SUPER_ADMIN]) && parking.status === "PENDING";

  const handleApprove = async () => {
    if (!parking || approving) return;
    if (!confirm("Are you sure you want to approve this parking?"))
      return;

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

    const loadingToast = toast.loading(`${action === "disable" ? "Disabling" : "Enabling"} parking...`);
    try {
      await parkingService.deleteParking(parking.id);
      toast.success(`Parking ${action}d successfully`, { id: loadingToast });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} parking`, { id: loadingToast });
    }
  };

  const DetailItem = ({ label, value, icon: Icon, className }: { label: string; value: React.ReactNode; icon?: any; className?: string }) => (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{label}</Label>
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-h-[50px]">
        {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
        <div className="text-sm font-bold text-slate-900 truncate w-full">
          {value || "—"}
        </div>
      </div>
    </div>
  );

  const txColumns: Column<any>[] = [
    {
      key: "type",
      header: "Type",
      render: (tx) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
            tx.type === "DEPOSIT" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          )}>
            {tx.type === "DEPOSIT" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
          </div>
          <span className="font-bold text-xs uppercase tracking-tighter">{tx.type}</span>
        </div>
      )
    },
    {
      key: "description",
      header: "Description",
      render: (tx) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm">{tx.description}</span>
          <span className="text-[10px] text-slate-400 font-mono">{tx.reference}</span>
        </div>
      )
    },
    {
      key: "amount",
      header: "Amount",
      render: (tx) => (
        <span className={cn(
          "font-black text-sm",
          tx.type === "DEPOSIT" ? "text-green-600" : "text-red-600"
        )}>
          {tx.type === "DEPOSIT" ? "+" : "-"}{tx.amount} <span className="text-[10px] font-bold opacity-60">ETB</span>
        </span>
      )
    },
    {
      key: "createdAt",
      header: "Date",
      render: (tx) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">{dayjs(tx.createdAt).format("MMM D, YYYY")}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{dayjs(tx.createdAt).format("HH:mm")}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (tx) => (
        <Badge variant="outline" className={cn(
          "font-bold uppercase text-[9px] px-2 h-6 rounded-lg border-none shadow-none",
          tx.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        )}>
          {tx.status}
        </Badge>
      )
    }
  ];

  return (
    <DetailLayout
      backLink={{ label: "Parkings", href: "/dashboard/parkings" }}
      title={parking.name}
      subtitle={`ID: ${parking.id.substring(0, 8)} • ${dayjs(parking.createdAt).format("MMM D, YYYY")}`}
      actions={
        <div className="flex items-center gap-1.5 md:gap-2">
          {canAccess([UserRole.SYSTEM_SUPER_ADMIN]) && parking.status !== "PENDING" && (
            <Button
              onClick={handleToggleStatus}
              variant="outline"
              size="sm"
              className={cn(
                "h-9 rounded-full px-4 font-bold border-slate-200",
                parking.status === "ACTIVE"
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  : "text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
              )}
            >
              <Power className="h-3.5 w-3.5 mr-2" />
              {parking.status === "ACTIVE" ? "Disable Terminal" : "Enable Terminal"}
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-500 text-white rounded-full h-9 px-6 text-xs font-bold shadow-sm"
            >
              {approving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
              Approve
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
              parking.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
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
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100">
            <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">No Cover Image</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold">
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
                <span className="text-white font-bold">{ratingStats?.averageRating != null ? Number(ratingStats.averageRating).toFixed(1) : "New"}</span>
                <span className="opacity-60">({ratingStats?.totalRatings || 0} reviews)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-12" onValueChange={setActiveTab}>
        <div className="bg-slate-100/50 p-1.5 rounded-2xl w-fit">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            {["Overview", "Address", "Location", "Media & Docs", "Bookings", "Reviews", "Wallet"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab.toLowerCase().split(" ")[0]}
                className="rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              >
                {tab.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TAB: OVERVIEW */}
        <TabsContent value="overview" className="space-y-16 animate-in slide-in-from-bottom-4 duration-500">
          <DetailSection title="Operational Details" icon={<Info className="h-5 w-5" />}>
            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-1 transition-all hover:bg-white hover:shadow-lg hover:border-primary/20">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Capacity</p>
              <p className="text-2xl font-black text-slate-900">{parking.numberOfSpots} Spots</p>
            </div>
            <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-100/50 flex flex-col gap-1 transition-all hover:bg-white hover:shadow-lg hover:border-green-200">
              <p className="text-[10px] font-black text-green-600/60 uppercase tracking-widest">Available Spots</p>
              <p className="text-2xl font-black text-green-700">{parking.availableSpots} Free</p>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50 flex flex-col gap-1 transition-all hover:bg-white hover:shadow-lg hover:border-amber-200">
              <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest">Occupied</p>
              <p className="text-2xl font-black text-amber-700">{parking.numberOfSpots - parking.availableSpots} Busy</p>
            </div>
            <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex flex-col gap-1 transition-all hover:bg-white hover:shadow-lg hover:border-primary/20">
              <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Fill Rate</p>
              <p className="text-2xl font-black text-primary">
                {Math.round(((parking.numberOfSpots - parking.availableSpots) / (parking.numberOfSpots || 1)) * 100)}%
              </p>
            </div>
          </DetailSection>

          <DetailSection title="System Information" icon={<ShieldCheck className="h-5 w-5" />}>
            <DetailItem label="Assigned Manager" value={parking.createdBy?.fullName} icon={<UserSquare className="h-4 w-4" />} />
            <DetailItem label="Commission Config" value={parking.commissionConfig?.name} icon={<ShieldCheck className="h-4 w-4" />} className="text-primary font-bold" />
            <DetailItem label="VAT Number" value={parking.vatRegistrationNumber} icon={<FileText className="h-4 w-4" />} />
            <DetailItem label="TIN/Tax ID" value={parking.tinNumber} icon={<CreditCard className="h-4 w-4" />} />
            <DetailItem label="Registration Date" value={dayjs(parking.createdAt).format("MMM D, YYYY HH:mm")} icon={<Clock className="h-4 w-4" />} />
            <DetailItem label="Terminal Status" value={parking.status} icon={<Power className="h-4 w-4" />} />
          </DetailSection>

          <DetailSection title="Pricing Schedule" icon={<CreditCard className="h-5 w-5" />}>
            <DetailItem label="Hourly Rate" value={`${parking.pricing?.hourly?.price || 0} ${parking.pricing?.hourly?.currency || "ETB"}`} />
            <DetailItem label="Daily Rate" value={`${parking.pricing?.daily?.price || 0} ${parking.pricing?.daily?.currency || "ETB"}`} />
            <DetailItem label="Monthly Rate" value={`${parking.pricing?.monthly?.price || 0} ${parking.pricing?.monthly?.currency || "ETB"}`} />
            <DetailItem label="Flat Rate" value={`${parking.pricing?.flat?.price || 0} ${parking.pricing?.flat?.currency || "ETB"}`} />
          </DetailSection>

          <DetailSection title="Description & Amenities" icon={<FileText className="h-5 w-5" />}>
            <div className="col-span-1 md:col-span-2 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Facility Description</p>
              <p className="text-base font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                {parking.description || "No description provided."}
              </p>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Available Amenities</p>
              <div className="flex flex-wrap gap-3">
                {parking.amenities && parking.amenities.length > 0 ? (
                  parking.amenities.map((item, i) => (
                    <div key={i} className="px-5 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-sm font-bold text-slate-700 flex items-center gap-3 transition-all hover:border-primary/30 hover:shadow-md">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {item.name}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm italic">No amenities listed.</span>
                )}
              </div>
            </div>
          </DetailSection>
        </TabsContent>

        {/* TAB: ADDRESS */}
        <TabsContent value="address" className="animate-in slide-in-from-bottom-4 duration-500">
          <DetailSection title="Address Information" icon={<MapPin className="h-5 w-5" />}>
            <DetailItem label="Region" value={parking.region} />
            <DetailItem label="City" value={parking.city} />
            <DetailItem label="Sub-City" value={parking.subCity} />
            <DetailItem label="Woreda" value={parking.woreda} />
            <DetailItem label="Kebele" value={parking.kebele} />
            <DetailItem label="Street Name" value={parking.streetName} />
            <DetailItem label="Country" value={parking.country} />
          </DetailSection>
        </TabsContent>

        {/* TAB: LOCATION */}
        <TabsContent value="location" className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-3xl overflow-hidden border shadow-sm relative bg-slate-100 h-[600px]">
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
              <div className="flex items-center justify-center h-full text-slate-400 font-bold">Map Unavailable</div>
            )}
          </div>
        </TabsContent>

        {/* TAB: MEDIA */}
        <TabsContent value="media" className="space-y-16 animate-in slide-in-from-bottom-4 duration-500">
          <DetailSection title="Legal Documents & Agreements" icon={<FileText className="h-5 w-5" />}>
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                ...(parking.licenseFiles || []).map((f, idx) => ({ url: f, type: 'Business License', label: `License #${idx + 1}` })),
                ...(parking.agreementDocuments || []).map((f, idx) => ({ url: f, type: 'Agreement Doc', label: `Agreement #${idx + 1}` }))
              ].map((doc, i) => (
                <div
                  key={i}
                  onClick={() => setPreviewDoc({ url: getImageUrl(doc.url), title: doc.label })}
                  className="group flex items-start gap-4 p-5 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-primary/20 hover:shadow-xl transition-all duration-500 cursor-pointer"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <FileText className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-black text-slate-900 truncate group-hover:text-primary transition-colors">
                      {doc.label}
                    </p>
                    <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">
                      Preview Document
                    </p>
                  </div>
                  <div className="self-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ArrowLeft className="h-4 w-4 rotate-180 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
              {[...(parking.licenseFiles || []), ...(parking.agreementDocuments || [])].length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest opacity-60">No documents uploaded.</p>
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection title="Photo Gallery" icon={<ImageIcon className="h-5 w-5" />}>
            <div className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {parking.galleryImages && parking.galleryImages.length > 0 ? (
                parking.galleryImages.map((img, i) => (
                  <div key={i} className="group relative aspect-square rounded-[2rem] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm cursor-zoom-in transition-all hover:shadow-2xl hover:border-primary/20">
                    <img
                      src={getImageUrl(img)}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                      alt={`Gallery ${i}`}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-4 right-4 h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed rounded-[2rem] bg-slate-50 text-slate-400">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-60">No gallery images available.</p>
                </div>
              )}
            </div>
          </DetailSection>
        </TabsContent>

        {/* TAB: BOOKINGS */}
        <TabsContent value="bookings" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {canAccess([UserRole.SYSTEM_SUPER_ADMIN]) && (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border">
              <BookingStats parkingId={parking.id} />
            </div>
          )}

          <div className="bg-white rounded-3xl overflow-hidden border shadow-sm">
            <div className="p-6 md:p-8 border-b bg-slate-50/50 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">Parking Activity</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Full history of parking sessions and payments.</p>
                </div>
                {bookingsLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search plate or phone..."
                    className="pl-10 h-11 rounded-xl border-slate-200"
                    value={bookingFilters.q}
                    onChange={(e) => setBookingFilters(prev => ({ ...prev, q: e.target.value }))}
                  />
                </div>

                <Select
                  value={bookingFilters.status}
                  onValueChange={(val) => setBookingFilters(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-700">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                {/* Simple inputs for ID filters for now, can be improved with searchable selects later */}
                <div className="relative">
                  <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Created By (User ID)..."
                    className="pl-10 h-11 rounded-xl border-slate-200"
                    value={bookingFilters.createdById}
                    onChange={(e) => setBookingFilters(prev => ({ ...prev, createdById: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Confirmed By (User ID)..."
                    className="pl-10 h-11 rounded-xl border-slate-200"
                    value={bookingFilters.confirmedById}
                    onChange={(e) => setBookingFilters(prev => ({ ...prev, confirmedById: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Customer & Vehicle</th>
                    <th className="px-6 py-4">Session Info</th>
                    <th className="px-6 py-4">System Trace</th>
                    <th className="px-6 py-4">Financials</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bookings.map((booking, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{booking.customerName}</div>
                            <div className="text-xs font-mono text-slate-400">{booking.customerPhone}</div>
                            <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary border-none mt-1 h-5 px-1.5">
                              {booking.plateNumber}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-700 font-bold">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {dayjs(booking.startTime).format("MMM D, HH:mm")}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 pl-5">
                            <ArrowLeft className="h-2.5 w-2.5 rotate-180" />
                            {booking.endTime ? dayjs(booking.endTime).format("MMM D, HH:mm") : "ONGOING"}
                          </div>
                          {booking.totalDurationMinutes && (
                            <div className="text-[10px] font-black text-slate-900 bg-slate-100 w-fit px-1.5 py-0.5 rounded ml-5">
                              {Math.floor(booking.totalDurationMinutes / 60)}h {booking.totalDurationMinutes % 60}m
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Created By</span>
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]">
                              {booking.createdBy?.fullName || "GuestPortal / System"}
                            </span>
                          </div>
                          {booking.confirmedBy && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Confirmed By</span>
                              <span className="font-bold text-green-700 text-xs truncate max-w-[120px]">
                                {booking.confirmedBy.fullName}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="font-black text-slate-900 text-base">{formatMoney(Number(booking.totalAmount))}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{booking.paymentMethod || "Pending"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={cn(
                          "font-bold uppercase text-[10px] tracking-wider border-none shadow-none px-3 h-7 rounded-full",
                          booking.status === "PAID" || booking.status === "COMPLETED" ? "bg-green-100 text-green-700 hover:bg-green-200" :
                            booking.status === "ACTIVE" ? "bg-primary/10 text-primary hover:bg-primary/20" :
                              booking.status === "PENDING" ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                                "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}>
                          {booking.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && !bookingsLoading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                            <Search className="h-8 w-8" />
                          </div>
                          <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">No booking records found matching your filters.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {bookingsTotalPages > 1 && (
              <div className="p-4 border-t bg-slate-50/30">
                <DashboardPagination
                  page={bookingsPage}
                  totalPages={bookingsTotalPages}
                  total={bookingsTotal}
                  onPageChange={setBookingsPage}
                  limit={bookingsLimit}
                  onLimitChange={setBookingsLimit}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: REVIEWS */}
        <TabsContent value="reviews" className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  Customer Feedback
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Detailed ratings and comments from customers.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900">{ratingStats?.averageRating != null ? Number(ratingStats.averageRating).toFixed(1) : "0.0"}</div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-3 w-3", s <= (ratingStats?.averageRating || 0) ? "text-amber-400 fill-current" : "text-slate-200")} />
                    ))}
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-100" />
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ratingStats?.totalRatings || 0} Total Reviews</div>
              </div>
            </div>

            <div className="space-y-6">
              {reviewsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Reviews...</p>
                </div>
              ) : reviews.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                              {review.customer?.profileImage ? (
                                <img src={getImageUrl(review.customer.profileImage)} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                                  {review.customer?.fullName?.charAt(0) || "C"}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{review.customer?.fullName || "Anonymous"}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{dayjs(review.createdAt).fromNow()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border shadow-sm">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-black text-slate-900">{review.rating != null ? Number(review.rating).toFixed(1) : "0.0"}</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                          "{review.comment || "No comment provided."}"
                        </p>
                      </div>
                    ))}
                  </div>

                  {reviewsTotalPages > 1 && (
                    <div className="flex justify-center pt-4">
                      <DashboardPagination
                        page={reviewsPage}
                        totalPages={reviewsTotalPages}
                        total={ratingStats?.totalRatings || 0}
                        limit={10}
                        onPageChange={setReviewsPage}
                        onLimitChange={() => { }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed rounded-3xl bg-slate-50">
                  <Star className="h-12 w-12 text-slate-200" />
                  <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">No customer reviews yet.</div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wallet" className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border space-y-6 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <WalletIcon size={30} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wallet Balance</h3>
                  <div className="text-3xl font-black text-slate-900 flex items-baseline gap-2 mt-1">
                    {parking.wallet?.balance?.toLocaleString() || "0.00"}
                    <span className="text-sm text-slate-400 font-bold uppercase">{parking.wallet?.currency || "ETB"}</span>
                  </div>
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-400">Wallet Status</span>
                <Badge variant="outline" className={cn(
                  "rounded-lg px-2 py-0.5 border-none",
                  parking.wallet?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {parking.wallet?.isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border space-y-6">
              <div className="flex items-center justify-between border-b pb-6">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Transaction History
                </h3>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                  {transactions.length} Records
                </div>
              </div>

              <div className="overflow-x-auto">
                <ReusableTable
                  data={transactions}
                  columns={txColumns}
                  getRowKey={(tx) => tx.id}
                  isLoading={txLoading}
                  emptyText="No transaction records found."
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800">
            <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white font-bold">{previewDoc.title}</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center">
              {previewDoc.url.match(/\.(pdf)($|\?)/i) || previewDoc.url.includes("blob") ? (
                <iframe src={previewDoc.url} className="w-full h-full border-none" title="PDF Preview" />
              ) : (
                <img src={previewDoc.url} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl" />
              )}
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end shrink-0">
              <Button asChild variant="outline" className="rounded-full font-bold border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                <a href={previewDoc.url} download target="_blank" rel="noopener noreferrer">
                  Download Document
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isQrOpen && parking && (
        <QrCodeDialog
          open={isQrOpen}
          onOpenChange={setIsQrOpen}
          parkingId={parking.id}
          parkingName={parking.name}
        />
      )}
    </DetailLayout>
  );
}

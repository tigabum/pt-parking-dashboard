"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { customerService } from "@/lib/services/customer-service";
import { bookingService } from "@/lib/services/booking-service";
import { Customer, BookingResponse } from "@/components/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Hash,
  MapPin,
  CheckCircle2,
  XCircle,
  Layers,
  Car as CarIcon,
  Star,
  Info,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import dayjs from "dayjs";

import {
  DetailLayout,
  DetailSection,
  DetailItem,
} from "@/components/layouts/detail-layout";
import { cn } from "@/lib/utils";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recentBookings, setRecentBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomerById(id as string);
      if (res && res.data) {
        setCustomer(res.data);
        if (res.data.phoneNumber) {
          const bRes = await bookingService.getAllBookings({
            customerPhone: res.data.phoneNumber,
            limit: 5,
          });
          if (bRes && bRes.data) {
            setRecentBookings(bRes.data);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load customer details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-bold text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin opacity-20" />
        <p className="uppercase tracking-widest text-[10px]">
          Synchronizing Identity Data...
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-red-500/20" />
        <p className="text-xl font-bold text-slate-900">Customer not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const formatDateTime = (date?: string | Date) =>
    date ? new Date(date).toLocaleString() : "—";

  return (
    <DetailLayout
      backLink={{ label: "Customer Management", href: "/dashboard/customers" }}
      title={customer.fullName || "Customer Profile"}
      subtitle={`ID: ${customer.id.substring(0, 12).toUpperCase()}`}
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              toast.info("Edit functionality coming soon");
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded h-10 px-4 font-bold transition-all"
          >
            Edit Profile
          </Button>
          <Badge
            className={`h-10 px-5 rounded flex items-center justify-center font-black uppercase text-[10px] tracking-widest border-none ${customer.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}
          >
            {customer.isActive ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>
      }
    >
      <DetailSection title="Customer Detail">
        <div className="col-span-1 md:col-span-2 lg:col-span-1 row-span-2">
          <div className="relative aspect-square w-48 rounded-lg overflow-hidden border-2 border-slate-100 shadow bg-slate-50 mx-auto lg:mx-0 p-1">
            <Avatar className="h-full w-full rounded-lg">
              <AvatarImage src={getImageUrl(customer.profileImage)} />
              <AvatarFallback className="bg-primary/5 text-primary text-4xl font-black">
                {customer.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || <User className="h-16 w-16" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <DetailItem label="Full Name" value={customer.fullName} />
          <DetailItem
            label="Customer Role"
            value={
              <Badge
                variant="outline"
                className="uppercase tracking-wider font-bold"
              >
                Standard User
              </Badge>
            }
          />

          <DetailItem
            label="Email Address"
            value={
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {customer.email || "—"}
                {customer.isEmailVerified && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </div>
            }
          />
          <DetailItem
            label="Phone Number"
            value={
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                {customer.phoneNumber || "—"}
                {customer.isPhoneVerified && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </div>
            }
          />
        </div>

        <DetailItem
          label="Account Status"
          value={customer.isActive ? "Active & Verified" : "Restricted"}
        />
        <DetailItem
          label="Registered Since"
          value={formatDateTime(customer.createdAt)}
        />
        <DetailItem
          label="Total Vehicles"
          value={`${customer.vehicles?.length || 0} Registered Assets`}
        />
        <DetailItem
          label="Last Updated"
          value={formatDateTime(customer.updatedAt)}
        />
      </DetailSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DetailSection
          title={`Registered Vehicles (${customer.vehicles?.length || 0})`}
          className="lg:col-span-1"
        >
          <div className="space-y-4 pt-2">
            {customer.vehicles && customer.vehicles.length > 0 ? (
              customer.vehicles.map((v: any) => (
                <div
                  key={v.id}
                  onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}
                  className="flex items-center justify-between p-4 bg-white rounded border border-slate-100 shadow-sm cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-slate-900 text-white flex items-center justify-center">
                      <CarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 leading-tight uppercase tracking-wide">
                        {v.plateNumber}
                      </p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">
                        {v.brand} {v.name || v.model}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-200">
                    <Info className="h-3 w-3 mr-1 text-slate-400" />
                    Details
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-300">
                <CarIcon className="h-10 w-10 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest leading-none">
                  No registered vehicles
                </p>
              </div>
            )}
          </div>
        </DetailSection>

        <DetailSection title="Recent Activity" className="lg:col-span-1">
          <div className="space-y-4 pt-2">
            {recentBookings.length > 0 ? (
              recentBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                  className="flex items-center justify-between p-4 bg-white rounded border border-slate-100 shadow-sm cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm leading-none">
                        {b.plateNumber}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                        Ref: {b.referenceNo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={`mb-1 uppercase text-[8px] font-black tracking-widest ${b.status === "PAID" ? "bg-green-500" : "bg-amber-500"}`}
                    >
                      {b.status}
                    </Badge>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                      {dayjs(b.startTime).format("MMM D, HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Clock className="h-10 w-10 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest leading-none">
                  No transactions recorded
                </p>
              </div>
            )}
          </div>
        </DetailSection>
      </div>
    </DetailLayout>
  );
}

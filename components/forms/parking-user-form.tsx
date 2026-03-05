"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, UserRole } from "@/lib/auth";
import { ParkingResponse } from "@/components/types";
import { parkingService } from "@/lib/services/parking-service";
import {
  X,
  Loader2,
  Shield,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Search,
  Upload,
  CheckCircle2,
  ParkingCircle,
  Info,
} from "lucide-react";
import { PermissionSelector } from "./permission-selector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PERMISSION_LABELS,
  PARKING_DASHBOARD_PERMISSIONS,
  DEFAULT_PERMISSIONS_BY_ROLE,
  getPermissionsByContext,
} from "@/lib/permissions";
import {
  Search as SearchIcon,
  Check,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  Users,
  UserSquare,
  Car,
  Wallet,
  Settings,
  CreditCard,
  Star,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParkingUserFormProps {
  onOpenChange: (open: boolean) => void;
  onSave: (data: FormData) => Promise<void>;
  initialData?: User;
  isLoading?: boolean;
  isNew?: boolean;
}

export function ParkingUserForm({
  onOpenChange,
  onSave,
  initialData,
  isLoading = false,
  isNew = true,
}: ParkingUserFormProps) {
  const [parkings, setParkings] = useState<ParkingResponse[]>([]);
  const [parkingId, setParkingId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState(UserRole.PARKING_MANAGER);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permSearch, setPermSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!profileImage) return;
    const url = URL.createObjectURL(profileImage);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileImage]);

  useEffect(() => {
    loadParkings();
    if (initialData) {
      setName(initialData.fullName || "");
      setEmail(initialData.email || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setRole(initialData.role || UserRole.PARKING_MANAGER);
      setParkingId(initialData.orgId || "");
      if (
        initialData.profileImage &&
        typeof initialData.profileImage === "string"
      ) {
        setPreview(initialData.profileImage);
      }
      if (initialData.permissions && Array.isArray(initialData.permissions)) {
        setPermissions(initialData.permissions);
      }
    } else {
      // Pre-fill for new users based on default role
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[role] || []);
    }
  }, [initialData]);

  // Handle role change pre-filling for new users
  useEffect(() => {
    if (!initialData && role) {
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[role] || []);
    }
  }, [role, initialData]);

  const loadParkings = async () => {
    try {
      const response = await parkingService.getAllParking({ limit: 1000 });
      if (response && response.data) {
        setParkings(response.data);
      }
    } catch (error) {
      // Silent failure, parkings list remains empty
    }
  };

  const filteredParkings = parkings.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.parkingCode?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    if (!parkingId) newErrors.parkingId = "Please assign a parking";
    if (!role) newErrors.role = "Access role is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fill in all required fields marked in red");
      return;
    }

    const formData = new FormData();
    formData.append("fullName", name);
    formData.append("email", email);
    formData.append("phoneNumber", phoneNumber);
    formData.append("role", role);
    formData.append("isStaffUser", "false");
    formData.append("orgId", parkingId); // Backend expects orgId for assigned parking

    if (profileImage) {
      formData.append("profileImage", profileImage);
    }

    // Add Permissions
    if (permissions.length > 0) {
      permissions.forEach((p) => formData.append("permissions", p));
    }

    await onSave(formData);
  };

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const toggleCategory = (categoryPermissions: string[]) => {
    const allSelected = categoryPermissions.every((p) =>
      permissions.includes(p),
    );
    if (allSelected) {
      setPermissions((prev) =>
        prev.filter((p) => !categoryPermissions.includes(p)),
      );
    } else {
      setPermissions((prev) => {
        const newPerms = [...prev];
        categoryPermissions.forEach((p) => {
          if (!newPerms.includes(p)) newPerms.push(p);
        });
        return newPerms;
      });
    }
  };

  const selectAllAll = (allPerms: string[]) => {
    const allSelected = allPerms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions([]);
    } else {
      setPermissions(allPerms);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Booking Operations":
        return <Calendar className="h-4 w-4" />;
      case "Customer & Vehicle":
        return <UserSquare className="h-4 w-4" />;
      case "Financial & Wallet":
        return <Wallet className="h-4 w-4" />;
      case "Dashboard & Reports":
        return <LayoutDashboard className="h-4 w-4" />;
      case "Reviews Management":
        return <Star className="h-4 w-4" />;
      case "Staff Management":
        return <Users className="h-4 w-4" />;
      case "Settings":
        return <Settings className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const selectedParking = parkings.find((p) => p.id === parkingId);

  return (
    <div className="fixed inset-0 z-100 bg-white overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-5 shrink-0 bg-white border-b shadow-sm z-20">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isNew ? "Create Parking Manager" : "Update Manager Assignment"}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Assign staff to manage parking facilities and set permissions
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="h-10 w-10 p-0 rounded-full hover:bg-primary hover:text-white text-slate-500 flex items-center justify-center border border-slate-200 shadow-sm transition-all"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-6 bg-slate-50/30 flex flex-col">
        <div className="max-w-7xl mx-auto my-auto pt-6 md:pt-10 w-full">
          <div className="bg-white rounded md:rounded-lg border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Left Column: Profile & Parking Identity */}
              <div className="lg:col-span-1 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30 space-y-8 md:space-y-10">
                {/* Profile Photo */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Profile Identity
                  </h3>
                  <div className="flex flex-col items-center gap-6">
                    <div className="h-48 w-48 rounded-full border-8 border-white shadow-2xl flex items-center justify-center bg-slate-200 overflow-hidden relative group cursor-pointer transition-transform hover:scale-105">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-20 w-20 text-slate-400" />
                      )}
                      <label
                        htmlFor="profileImage"
                        className="absolute inset-0 bg-primary/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Upload className="h-10 w-10 text-white" />
                      </label>
                    </div>

                    <input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setProfileImage(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                </div>

                {/* Parking Assignment */}
                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ParkingCircle className="h-4 w-4" />
                    Assignment
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Target Site *
                      </Label>
                      <Select
                        value={parkingId}
                        onValueChange={(val) => {
                          setParkingId(val);
                          if (errors.parkingId)
                            setErrors({ ...errors, parkingId: "" });
                        }}
                      >
                        <SelectTrigger
                          className={`h-12 w-full rounded border-slate-200 bg-white font-bold transition-all hover:border-primary/50 ${errors.parkingId ? "border-red-500 bg-red-50" : ""}`}
                        >
                          <SelectValue placeholder="Enter Parking Selection" />
                        </SelectTrigger>
                        <SelectContent className="rounded shadow-2xl border-slate-100">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                              <Input
                                placeholder="Enter Search Query"
                                className="pl-9 h-9 w-full border-none bg-slate-100 rounded-lg text-xs focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>
                          {filteredParkings.map((parking) => (
                            <SelectItem
                              key={parking.id}
                              value={parking.id}
                              className="h-10 font-bold"
                            >
                              {parking.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedParking && (
                        <div className="p-3 bg-white rounded border border-primary/10 shadow-sm flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-black text-primary uppercase leading-tight">
                              {selectedParking.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate italic">
                              {selectedParking.city}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Manager Level *
                      </Label>
                      <Select
                        value={role}
                        onValueChange={(val) => {
                          setRole(val as UserRole);
                          if (errors.role) setErrors({ ...errors, role: "" });
                        }}
                      >
                        <SelectTrigger
                          className={`h-12 w-full rounded border-slate-200 bg-white font-bold transition-all hover:border-slate-400/50 ${errors.role ? "border-red-500 bg-red-50" : ""}`}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="rounded shadow-2xl border-slate-100">
                          <SelectItem
                            value={UserRole.PARKING_SUPER_ADMIN}
                            className="h-10 font-bold uppercase"
                          >
                            Parking Super Admin
                          </SelectItem>
                          <SelectItem
                            value={UserRole.PARKING_MANAGER}
                            className="h-10 font-bold uppercase"
                          >
                            Parking Manager
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Info & Permissions */}
              <div className="lg:col-span-2 p-6 md:p-12 space-y-10 md:space-y-12 bg-white">
                {/* Contact Information */}
                <div className="space-y-6 md:space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                    <div className="p-2.5 bg-primary/10 text-primary rounded">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        Personal Information
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        System access & contact details
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Manager Full Name *
                      </Label>
                      <Input
                        className={`h-12 w-full rounded border-slate-200 bg-slate-50/30 px-4 font-bold focus:ring-2 focus:ring-primary/10 transition-all ${errors.name ? "border-red-500 bg-red-50" : ""}`}
                        placeholder="Enter Manager Full Name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors({ ...errors, name: "" });
                        }}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        Direct Email *
                      </Label>
                      <Input
                        className={`h-12 w-full rounded border-slate-200 bg-slate-50/30 px-4 font-bold focus:ring-2 focus:ring-primary/10 transition-all ${errors.email ? "border-red-500 bg-red-50" : ""}`}
                        type="email"
                        placeholder="Enter Direct Email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: "" });
                        }}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        Phone Contact *
                      </Label>
                      <Input
                        className={`h-12 w-full rounded border-slate-200 bg-slate-50/30 px-4 font-bold focus:ring-2 focus:ring-primary/10 transition-all ${errors.phoneNumber ? "border-red-500 bg-red-50" : ""}`}
                        placeholder="Enter Phone Contact"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (errors.phoneNumber)
                            setErrors({ ...errors, phoneNumber: "" });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Access Permissions Field */}
                <div className="space-y-8 pt-8 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="h-1 w-12 rounded-full bg-primary/20" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Site Capabilities
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Operation Permission Registry
                      </Label>
                      <PermissionSelector
                        permissions={permissions}
                        onPermissionsChange={setPermissions}
                        categories={PARKING_DASHBOARD_PERMISSIONS}
                        placeholder="Enter Site Permissions"
                      />
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-white hover:shadow-sm group">
                        <div className="h-10 w-10 rounded bg-white flex items-center justify-center text-primary shadow-sm transition-transform group-hover:scale-110">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 font-bold">
                            {permissions.length === 0
                              ? "Standard Operating Status"
                              : `${permissions.length} Site-Specific Permissions`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight">
                            {permissions.length === 0
                              ? "User will inherit general parking management privileges."
                              : "Only specific selected operations will be enabled for this account."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t py-6 px-4 md:px-10 bg-white shrink-0 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-slate-500 font-medium">
            {permissions.length > 0 && (
              <span className="text-primary font-bold">
                {permissions.length} permissions
              </span>
            )}{" "}
            selected
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-14 px-8 rounded font-bold text-slate-400 hover:text-slate-900"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="h-14 px-16 rounded bg-primary text-white font-bold transition-all min-w-40 shadow-none border-none"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Create User" : "Update User"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { User, UserRole } from "@/lib/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PermissionSelector } from "./permission-selector";
import {
  User as UserIcon,
  Shield,
  Info,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Mail,
  Phone,
  Building2,
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
  Target,
  MapPin,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { SYSTEM_ORG_ID } from "@/lib/constants";
import {
  PERMISSION_LABELS,
  getPermissionsByContext,
  DEFAULT_PERMISSIONS_BY_ROLE,
} from "@/lib/permissions";

type Props = {
  onOpenChange: (open: boolean) => void;
  onSave: (data: FormData) => void;
  initialData?: Partial<User>;
  isNew?: boolean;
  isLoading?: boolean;
};

export function UserForm({
  onOpenChange,
  onSave,
  initialData,
  isNew = true,
  isLoading = false,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.SYSTEM_ADMIN);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [permSearch, setPermSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || "");
      setEmail(initialData.email || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setRole((initialData.role as UserRole) || UserRole.SYSTEM_ADMIN);
      if (
        initialData.profileImage &&
        typeof initialData.profileImage === "string"
      ) {
        setPreview(initialData.profileImage);
      }
      // Handle permissions if backend returns it as array
      if (initialData.permissions && Array.isArray(initialData.permissions)) {
        setPermissions(initialData.permissions);
      }
    } else {
      // Pre-fill for new users
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[role] || []);
    }
  }, [initialData]);

  // Handle role change pre-filling for new users
  useEffect(() => {
    if (!initialData && role) {
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[role] || []);
    }
  }, [role, initialData]);

  useEffect(() => {
    if (!profileImage) return;
    const url = URL.createObjectURL(profileImage);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileImage]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    if (!role) newErrors.role = "Role is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("Please fill in all required fields marked in red");
      return;
    }

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("phoneNumber", phoneNumber);
    formData.append("role", role);
    formData.append("isStaffUser", "true");

    // Default orgId for system users
    if (
      role === UserRole.SYSTEM_SUPER_ADMIN ||
      role === UserRole.SYSTEM_ADMIN
    ) {
      formData.append("orgId", SYSTEM_ORG_ID);
    }

    if (profileImage) {
      formData.append("profileImage", profileImage);
    }

    // Add Permissions
    if (permissions.length > 0) {
      permissions.forEach((p) => formData.append("permissions", p));
    }

    onSave(formData);
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
      case "Parking Management":
        return <MapPin className="h-4 w-4" />;
      case "Booking Management":
        return <Calendar className="h-4 w-4" />;
      case "User Management":
        return <Users className="h-4 w-4" />;
      case "Customer Management":
        return <UserSquare className="h-4 w-4" />;
      case "Vehicle Management":
        return <Car className="h-4 w-4" />;
      case "Wallet & Transactions":
        return <Wallet className="h-4 w-4" />;
      case "Reviews & Ratings":
        return <Star className="h-4 w-4" />;
      case "Configuration Management":
        return <Settings className="h-4 w-4" />;
      case "Dashboard & Analytics":
        return <LayoutDashboard className="h-4 w-4" />;
      case "Financial Access":
        return <CreditCard className="h-4 w-4" />;
      case "System Settings & Security":
        return <Shield className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-white overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-5 shrink-0 bg-white border-b shadow-sm z-20">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isNew ? "Create System User" : "Update User Account"}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage staff access and permissions for the dashboard
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
      <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-6 bg-slate-50/30">
        <div className="max-w-7xl mx-auto h-full pt-6 md:pt-10">
          <div className="bg-white rounded md:rounded-lg border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Left Column: Profile & Basic Info */}
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

                {/* Role Selection */}
                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Access Level
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Defined Role *
                      </Label>
                      <Select
                        value={role}
                        onValueChange={(val) => setRole(val as UserRole)}
                      >
                        <SelectTrigger className="h-12 w-full rounded border-slate-200 bg-white font-bold transition-all hover:border-slate-400/50">
                          <SelectValue placeholder="Enter Role Selection" />
                        </SelectTrigger>
                        <SelectContent className="rounded shadow-2xl border-slate-100">
                          <SelectItem
                            value={UserRole.SYSTEM_SUPER_ADMIN}
                            className="h-10 font-bold uppercase"
                          >
                            System Super Admin
                          </SelectItem>
                          <SelectItem
                            value={UserRole.SYSTEM_ADMIN}
                            className="h-10 font-bold uppercase"
                          >
                            System Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Organization Registry
                      </Label>
                      <div className="flex items-center gap-3 p-3 bg-white rounded border border-slate-100 shadow-sm">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-slate-600">
                          Possible Tech
                        </span>
                      </div>
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
                        Full Legal Name *
                      </Label>
                      <Input
                        className={`h-12 w-full rounded border-slate-200 bg-slate-50/30 px-4 font-bold focus:ring-2 focus:ring-primary/10 transition-all ${errors.fullName ? "border-red-500 bg-red-50" : ""}`}
                        placeholder="Enter Full Legal Name"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errors.fullName)
                            setErrors({ ...errors, fullName: "" });
                        }}
                      />
                      {errors.fullName && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1">
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        Official Email *
                      </Label>
                      <Input
                        className={`h-12 w-full rounded border-slate-200 bg-slate-50/30 px-4 font-bold focus:ring-2 focus:ring-primary/10 transition-all ${errors.email ? "border-red-500 bg-red-50" : ""}`}
                        type="email"
                        placeholder="Enter Official Email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: "" });
                        }}
                      />
                      {errors.email && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        Primary Contact *
                      </Label>
                      <Input
                        className={`h-12 w-full rounded border-slate-200 bg-slate-50/30 px-4 font-bold focus:ring-2 focus:ring-primary/10 transition-all ${errors.phoneNumber ? "border-red-500 bg-red-50" : ""}`}
                        placeholder="Enter Primary Contact"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (errors.phoneNumber)
                            setErrors({ ...errors, phoneNumber: "" });
                        }}
                      />
                      {errors.phoneNumber && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1">
                          {errors.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Access Permissions Field */}
                <div className="space-y-8 pt-8 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="h-1 w-12 rounded-full bg-primary/20" />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      System Capabilities
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Custom Permission Registry
                      </Label>
                      <PermissionSelector
                        permissions={permissions}
                        onPermissionsChange={setPermissions}
                        categories={getPermissionsByContext(
                          role === UserRole.PARKING_SUPER_ADMIN ||
                          role === UserRole.PARKING_MANAGER,
                        )}
                        placeholder="Enter Site Permissions"
                      />
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-white hover:shadow-sm group">
                        <div className="h-10 w-10 rounded bg-white flex items-center justify-center text-primary shadow-sm transition-transform group-hover:scale-110">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 font-bold">
                            {permissions.length === 0
                              ? "Default Access Protocol"
                              : `${permissions.length} Advanced Capabilities`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {permissions.length === 0
                              ? "This user will operate under standard role restrictions."
                              : "Selected permissions will override standard role defaults."}
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

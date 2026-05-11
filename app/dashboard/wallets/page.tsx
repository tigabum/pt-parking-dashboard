"use client";

import { useEffect, useState } from "react";
import { walletService } from "@/lib/services/wallet-service";
import { toast } from "sonner";
import { useAuth } from "@/app/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { UserRole } from "@/lib/auth";
import { PageHeader } from "@/components/layouts/page-header";
import { DashboardPagination } from "@/components/tables/dashboard-pagination";
import {
  Search,
  Wallet,
  Eye,
  Plus,
  History as HistoryIcon,
} from "lucide-react";
import { WalletTransactions } from "@/components/wallets/wallet-transactions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ReusableTable, Column } from "@/components/tables";
import { cn } from "@/lib/utils";

export default function WalletsPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Top Up State
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [inputParkingCode, setInputParkingCode] = useState("");
  const [topUpDescription, setTopUpDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only load if user is available
    if (user) {
      loadWallets();
    }
  }, [page, limit, searchQuery, user]);

  // Remove hardcoding as requested
  /*
  useEffect(() => {
    if (!inputParkingCode) {
      setInputParkingCode("FOHKSGJ7");
    }
  }, [inputParkingCode]);
  */

  const loadWallets = async () => {
    try {
      setLoading(true);

      if (user?.role === UserRole.OWNER && user.orgId) {
        // For Owner, fetch only their parking's wallet
        // This bypasses the System Admin only restriction on getAllWallets
        const wallet = await walletService.getWalletByParkingId(user.orgId);
        if (wallet) {
          setWallets([wallet]);
          setTotal(1);
          setTotalPages(1);
        } else {
          setWallets([]);
        }
      } else {
        // For System Admins, allow listing all wallets
        const response = await walletService.getAllWallets({
          page,
          limit,
          q: searchQuery || undefined,
        });

        if (response && response.success) {
          setWallets(response.data);
          setTotal(response.total);
          setTotalPages(response.totalPages);
        }
      }
    } catch (err) {
      // Silent failure
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTopUp = () => {
    setSelectedWallet(null);
    setTopUpAmount("");
    // Keep inputParkingCode if already resolved from wallets
    if (wallets.length > 0) {
      setInputParkingCode(wallets[0].parking?.parkingCode || "");
    }
    setTopUpDescription("");
    setIsTopUpOpen(true);
  };

  const handleTopUp = async () => {
    const code = inputParkingCode || selectedWallet?.parking?.parkingCode;
    if (!code || !topUpAmount) {
      toast.error("Parking code and amount are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // 1. Get wallet/parking ID from code if not already selected
      let parkingId = selectedWallet?.parking?.id;
      if (!parkingId) {
        // We'll rely on the backend's ability to handle either ID or Code in addFunds too
        // or just pass the code if the backend update I did earlier supports it.
        parkingId = code; 
      }

      const response = await walletService.addFunds(
        parkingId,
        amount,
        topUpDescription ||
        (user?.role === UserRole.OWNER
          ? "Parking Admin Top-up"
          : "System Admin Top-up"),
      );

      if (response.success) {
        toast.success("Funds added successfully");
        setIsTopUpOpen(false);
        loadWallets(); 
      } else {
        toast.error(response.message || "Failed to add funds");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add funds");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTelebirrTopUp = async () => {
    if (!topUpAmount) {
      toast.error("Please enter a top-up amount");
      return;
    }

    try {
      setIsSubmitting(true);
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount < 1) {
        toast.error("Please enter a valid amount (minimum 1 ETB)");
        return;
      }

      const parkingIdOrCode = inputParkingCode || selectedWallet?.parking?.parkingCode || selectedWallet?.parking?.id;
      if (!parkingIdOrCode) {
        toast.error("Please enter a Parking Code");
        return;
      }

      // 1. Call the backend to initiate Telebirr prefund
      const response = await walletService.initiateTelebirrPrefund(parkingIdOrCode, amount);

      if (response.success && response.data?.paymentUrl) {
        toast.success("Telebirr order created. Redirecting to payment...");
        
        // 2. Open the real Telebirr payment page directly
        window.location.href = response.data.paymentUrl;
      } else {
        toast.error(response.message || "Telebirr integration failed. Please check the backend configuration.");
      }

    } catch (error: any) {
      console.error("Telebirr top-up error:", error);
      toast.error(error.message || "Failed to initiate Telebirr payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Parking Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">
            {row.parking?.name || "—"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider">
            {row.parking?.parkingCode || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      render: (row) => (
        <span className="text-lg font-black text-slate-900">
          {Number(row.balance).toLocaleString()}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      render: (row) => (
        <Badge
          variant="outline"
          className="font-bold text-slate-500 bg-slate-50 border-slate-200"
        >
          {row.currency || "ETB"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          className={cn(
            "font-bold uppercase text-[10px] tracking-wider border-none shadow-none px-3 h-7 rounded-full",
            row.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Operations",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300"
            onClick={() => {
              setSelectedWallet(row);
              setIsHistoryOpen(true);
            }}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">History</span>
          </Button>
        </div>
      ),
    },
  ];

  if (!hasPermission(PERMISSIONS.REVENUE_VIEW)) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Access Denied: Missing REVENUE_VIEW permission
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Parking Wallets"
        description="Monitor and manage parking wallet balance."
      >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full mt-2">
          <div className="flex flex-col lg:flex-row lg:items-center flex-1 gap-3 overflow-hidden">
            <div className="relative w-full lg:w-[320px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search parking name..."
                className="pl-10 h-11 rounded border-slate-200 bg-slate-50 focus:bg-white w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {user?.role === UserRole.OWNER && (
            <Button 
              className="shrink-0 premium-gradient text-white font-bold h-11 px-6 rounded shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleOpenTopUp}
            >
              <Plus className="w-4 h-4 mr-2" />
              Topup Wallet
            </Button>
          )}
        </div>
      </PageHeader>

      <ReusableTable
        data={wallets}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={loading}
        emptyText="No wallets found."
      />

      <DashboardPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
      />

      {/* Top Up Modal */}
      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Top Up Wallet</DialogTitle>
            <DialogDescription>
              {selectedWallet 
                ? `Initiating top-up for ${selectedWallet.parking?.name} (${selectedWallet.parking?.parkingCode})`
                : "Enter parking details to initiate a Telebirr top-up."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-bold uppercase text-slate-500 tracking-wider">Top-up Amount (ETB)</Label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm transition-colors group-focus-within:text-primary">
                  ETB
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-12 h-12 text-lg font-bold"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 italic">
                {inputParkingCode 
                  ? `Target: Parking ${inputParkingCode}. You will be redirected to Telebirr.`
                  : "Identifying parking... Please wait."}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsTopUpOpen(false)} className="sm:flex-1">
              Cancel
            </Button>
            
            <Button
              className="sm:flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
              onClick={handleTelebirrTopUp}
              disabled={isSubmitting || !topUpAmount}
            >
              {isSubmitting ? "Processing..." : "Pay with Telebirr"}
            </Button>

            {user?.role === UserRole.SYSTEM_SUPER_ADMIN && (
              <Button
                variant="ghost"
                className="sm:flex-1 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase"
                onClick={handleTopUp}
                disabled={isSubmitting || !topUpAmount}
              >
                Manual Add
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Wallet Transaction History</DialogTitle>
            <DialogDescription>
              Showing recent transactions for{" "}
              <b>{selectedWallet?.parking?.name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedWallet?.parking?.id && (
              <WalletTransactions parkingId={selectedWallet.parking.id} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

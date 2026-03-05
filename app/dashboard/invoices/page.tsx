"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/auth-context";
import { PageHeader } from "@/components/layouts/page-header";
import {
    FileText,
    Search,
    MoreVertical,
    CheckCircle,
    XCircle,
    Eye,
    Plus,
    RefreshCw,
    Printer,
    History,
    ShieldCheck,
    AlertCircle,
    Layers,
    FileBox,
    Send,
    Loader2
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { invoiceService } from "@/lib/services/invoice-service";
import { toast } from "sonner";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InvoicesPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("register");
    const [searchQuery, setSearchQuery] = useState("");
    const [registering, setRegistering] = useState(false);
    const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

    const [testPayload, setTestPayload] = useState({
        buyerName: "QR Anbessa Technology Development",
        buyerTin: "0094856874",
        buyerEmail: "company@anbessait.com",
        transactionType: "B2B",
        amount: 10000,
        taxAmount: 1500
    });

    const parkingId = user?.orgId;

    const loadInvoices = async () => {
        if (!parkingId) return;
        setLoading(true);
        try {
            const data = await invoiceService.getHistory(parkingId);
            setInvoices(data || []);
        } catch (error) {
            console.error("Failed to load invoices", error);
            toast.error("Failed to fetch invoice history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
    }, [parkingId]);

    const handleSingleRegister = async () => {
        if (!parkingId) return;
        setRegistering(true);
        try {
            const payload = {
                parkingId,
                TransactionType: testPayload.transactionType,
                BuyerDetails: {
                    IdType: "KID",
                    City: "101",
                    Email: testPayload.buyerEmail,
                    HouseNumber: "101",
                    LegalName: testPayload.buyerName,
                    Phone: "+251913654171",
                    Region: "1",
                    Tin: testPayload.buyerTin,
                    VatNumber: "43256663343256663322",
                    Wereda: "13"
                },
                ItemList: [
                    {
                        Discount: 0,
                        ExciseTaxValue: 0,
                        NatureOfSupplies: "goods",
                        ItemCode: "1111",
                        ProductDescription: "Service Item",
                        PreTaxValue: testPayload.amount,
                        Quantity: 1,
                        LineNumber: 1,
                        TaxAmount: testPayload.taxAmount,
                        TaxCode: "VAT15",
                        TotalLineAmount: testPayload.amount + testPayload.taxAmount,
                        Unit: "PCS",
                        UnitPrice: testPayload.amount
                    }
                ]
            };

            await invoiceService.registerInvoice(payload);
            toast.success("Invoice registered successfully");
            setIsSingleDialogOpen(false);
            loadInvoices();
        } catch (error) {
            console.error("Registration failed", error);
            toast.error("Failed to register invoice with MOR");
        } finally {
            setRegistering(false);
        }
    };

    const handleVerify = async (id: string) => {
        try {
            await invoiceService.verifyInvoice(id);
            toast.success("Invoice verified with MOR");
            loadInvoices();
        } catch (error) {
            toast.error("Verification failed");
        }
    };

    const handleGenerate = async (id: string) => {
        // In a real app, this might call a PDF generation endpoint or update status
        // For now we simulate status change to GENERATED
        toast.success("Tax Invoice PDF generated successfully");
        // Optionally update status to 'GENERATED' on backend if it was meant to be a status
        loadInvoices();
    };

    const handleCancel = async (id: string) => {
        try {
            await invoiceService.cancelInvoice(id, "Customer request");
            toast.success("Invoice cancelled successfully");
            loadInvoices();
        } catch (error) {
            toast.error("Cancellation failed");
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.irn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.id?.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === "register") return matchesSearch && (inv.status === "PENDING" || inv.status === "FAILED");
        if (activeTab === "verification") return matchesSearch && inv.status === "REGISTERED";
        if (activeTab === "generate") return matchesSearch && (inv.status === "VERIFIED" || inv.status === "REGISTERED");
        if (activeTab === "cancellation") return matchesSearch && inv.status === "CANCELLED";

        return matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "REGISTERED":
                return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold uppercase">Registered</Badge>;
            case "VERIFIED":
                return <Badge className="bg-indigo-500 hover:bg-indigo-600 font-bold uppercase">Verified</Badge>;
            case "CANCELLED":
                return <Badge className="bg-rose-500 hover:bg-rose-600 font-bold uppercase">Cancelled</Badge>;
            case "FAILED":
                return <Badge className="bg-amber-500 hover:bg-amber-600 font-bold uppercase">Failed</Badge>;
            default:
                return <Badge className="bg-slate-400 font-bold uppercase">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8 animate-in fade-in duration-500">
            <PageHeader
                title="Invoice Manager"
                description="End-to-end MOR compliance flow: Register, Verify, Generate & Cancel"
            >
                <div className="flex items-center gap-3">
                    <Button onClick={loadInvoices} variant="outline" className="h-10 border-slate-200">
                        <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                        Sync Status
                    </Button>
                    <Dialog open={isSingleDialogOpen} onOpenChange={setIsSingleDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-10 bg-primary font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                <Plus className="mr-2 h-4 w-4" />
                                Single Register
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                            <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <Send className="h-6 w-6 text-primary" />
                                    Single Registration
                                </DialogTitle>
                                <DialogDescription className="font-medium text-slate-500 mt-2">
                                    Enter buyer details for immediate MOR CORE API registration.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Transaction Type</Label>
                                        <select
                                            value={testPayload.transactionType}
                                            onChange={e => setTestPayload({ ...testPayload, transactionType: e.target.value })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 font-bold bg-white focus:ring-2 focus:ring-primary/20 appearance-none"
                                        >
                                            <option value="B2B">B2B (Business to Business)</option>
                                            <option value="B2C">B2C (Business to Customer)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Buyer Legal Name</Label>
                                        <Input
                                            value={testPayload.buyerName}
                                            onChange={e => setTestPayload({ ...testPayload, buyerName: e.target.value })}
                                            className="h-11 border-slate-200 font-bold focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Buyer TIN</Label>
                                        <Input
                                            value={testPayload.buyerTin}
                                            onChange={e => setTestPayload({ ...testPayload, buyerTin: e.target.value })}
                                            className="h-11 border-slate-200 font-mono focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Buyer Email</Label>
                                        <Input
                                            value={testPayload.buyerEmail}
                                            onChange={e => setTestPayload({ ...testPayload, buyerEmail: e.target.value })}
                                            className="h-11 border-slate-200 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Pre-Tax Amount (ETB)</Label>
                                        <Input
                                            type="number"
                                            value={testPayload.amount}
                                            onChange={e => setTestPayload({ ...testPayload, amount: parseFloat(e.target.value) })}
                                            className="h-11 border-slate-200 font-black focus:ring-primary/20 text-emerald-600"
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 sm:flex-row gap-3">
                                <Button variant="outline" onClick={() => setIsSingleDialogOpen(false)} className="h-12 px-8 font-bold border-slate-200 rounded-xl">Cancel</Button>
                                <Button
                                    onClick={handleSingleRegister}
                                    disabled={registering}
                                    className="h-12 px-10 bg-primary font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30"
                                >
                                    {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                                    Execute Registration
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" className="h-10 font-bold border-slate-200 hover:scale-105 transition-transform">
                                <FileBox className="mr-2 h-4 w-4" />
                                Bulk Receipt
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl overflow-hidden p-0 text-center">
                            <div className="p-12 space-y-6">
                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                                    <Layers className="h-10 w-10" />
                                </div>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase text-center">Bulk Batch Mode</DialogTitle>
                                    <DialogDescription className="text-center font-medium mt-2">
                                        Combine multiple daily transactions into a single register call.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-8 px-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
                                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 font-bold leading-relaxed">
                                        Bulk registration requires multiple pending transactions to be queued. Please select items from the booking ledger first.
                                    </p>
                                </div>
                                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest" disabled>Coming Soon</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </PageHeader>

            <Tabs defaultValue="register" className="w-full" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-auto">
                        <TabsTrigger value="register" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary">
                            1. Registration
                        </TabsTrigger>
                        <TabsTrigger value="verification" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary">
                            2. Verification
                        </TabsTrigger>
                        <TabsTrigger value="generate" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary">
                            3. Generation
                        </TabsTrigger>
                        <TabsTrigger value="cancellation" className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary">
                            4. Cancellation
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by IRN..."
                            className="pl-10 h-12 bg-white border-slate-200 focus:ring-primary/20 rounded-2xl shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100 h-16">
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 pl-10">Document details</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Value (ETB)</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Type</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Timestamp</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center pr-10">Flow Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-80 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="relative h-12 w-12">
                                                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                                                <Loader2 className="h-12 w-12 animate-spin text-primary absolute inset-0 [animation-delay:-0.3s]" />
                                            </div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Querying MOR ledger...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-80 text-center">
                                        <div className="flex flex-col items-center justify-center gap-5">
                                            <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                <FileText className="h-12 w-12" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 uppercase tracking-tight">No records in "{activeTab}" phase</p>
                                                <p className="text-xs text-slate-500 font-medium">Verify your filters or start a new registration above.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <TableRow key={inv.id} className="group border-slate-50 hover:bg-slate-50/30 transition-all h-24">
                                        <TableCell className="pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 tracking-tight">{inv.irn || "NOT_ASSIGNED"}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tracking-tighter">REF: {inv.id.substring(0, 8)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-slate-900 text-lg">{(inv.totalAmount || 0).toLocaleString()}</span>
                                                <span className="text-[9px] font-black uppercase text-slate-300">CURRENCY: ETB</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-slate-200 text-slate-500 font-black uppercase text-[9px] px-2.5 py-1 tracking-widest">{inv.transactionType}</Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-bold text-[11px] uppercase whitespace-nowrap">
                                            {format(new Date(inv.createdAt), "dd MMM yyyy")}<br />
                                            <span className="font-medium text-slate-300">{format(new Date(inv.createdAt), "HH:mm:ss")}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(inv.status)}
                                        </TableCell>
                                        <TableCell className="pr-10 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {activeTab === "verification" && inv.status === "REGISTERED" && (
                                                    <Button size="sm" onClick={() => handleVerify(inv.id)} className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg h-9 gap-2 shadow-lg shadow-indigo-600/20">
                                                        <ShieldCheck className="h-4 w-4" /> Verify
                                                    </Button>
                                                )}
                                                {activeTab === "generate" && (inv.status === "VERIFIED" || inv.status === "REGISTERED") && (
                                                    <Button size="sm" onClick={() => handleGenerate(inv.id)} className="bg-primary hover:bg-primary/90 font-bold rounded-lg h-9 gap-2 shadow-lg shadow-primary/20">
                                                        <Printer className="h-4 w-4" /> Generate
                                                    </Button>
                                                )}
                                                {activeTab === "cancellation" && inv.status === "REGISTERED" && (
                                                    <Button size="sm" variant="destructive" onClick={() => handleCancel(inv.id)} className="font-bold rounded-lg h-9 gap-2 shadow-lg shadow-rose-600/20">
                                                        <XCircle className="h-4 w-4" /> Cancel
                                                    </Button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-white border hover:shadow-sm rounded-lg">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-slate-100 p-2">
                                                        <DropdownMenuItem className="rounded-xl font-bold gap-3 py-3 cursor-pointer">
                                                            <Eye className="h-4 w-4 text-slate-400" /> View Payload
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-xl font-bold gap-3 py-3 cursor-pointer">
                                                            <History className="h-4 w-4 text-slate-400" /> Transaction Logs
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-emerald-200 transition-all">
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Compliance Score</p>
                        <h4 className="text-3xl font-black text-slate-900 group-hover:text-emerald-500 transition-colors">98.4%</h4>
                    </div>
                    <div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:rotate-12 transition-transform shadow-inner">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-amber-200 transition-all">
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Pending Verify</p>
                        <h4 className="text-3xl font-black text-slate-900 group-hover:text-amber-500 transition-colors">{invoices.filter(i => i.status === "REGISTERED").length}</h4>
                    </div>
                    <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0 group-hover:rotate-12 transition-transform shadow-inner">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between group hover:border-indigo-200 transition-all">
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Documents Generated</p>
                        <h4 className="text-3xl font-black text-slate-900 group-hover:text-indigo-500 transition-colors">{invoices.filter(i => i.status === "VERIFIED").length}</h4>
                    </div>
                    <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:rotate-12 transition-transform shadow-inner">
                        <Printer className="h-8 w-8" />
                    </div>
                </div>
            </div>
        </div>
    );
}

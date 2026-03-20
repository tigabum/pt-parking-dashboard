"use client";

import { useState } from "react";
import {
    Plus,
    Send,
    Loader2,
    ListChecks,
    Trash2
} from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { invoiceService } from "@/lib/services/invoice-service";

interface RegisterInvoiceDialogProps {
    parkingId: string;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function RegisterInvoiceDialog({ parkingId, onSuccess, trigger }: RegisterInvoiceDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [registering, setRegistering] = useState(false);

    const [testPayload, setTestPayload] = useState({
        buyerName: "QR Anbessa Technology Development",
        buyerTin: "0094856874",
        buyerEmail: "company@anbessait.com",
        buyerPhone: "+251913654171",
        buyerIdType: "KID",
        buyerCity: "101",
        buyerRegion: "1",
        buyerWereda: "13",
        buyerHouseNumber: "101",
        buyerVatNumber: "43256663343256663322",
        buyerLocality: "",
        buyerSubCity: "",
        transactionType: "B2B",
        documentDate: format(new Date(), "dd-MM-yyyy'T'HH:mm:ss"),
        documentType: "INV",
        paymentMode: "CASH",
        paymentTerm: "IMMIDIATE",
        cashierName: "System Administrator",
        salesPersonName: "POS-01",
        items: [
            {
                ProductDescription: "Standard Parking Service",
                PreTaxValue: 10000,
                TaxAmount: 1500,
                ItemCode: "PKG-01",
                Quantity: 1,
                Unit: "PCS",
                NatureOfSupplies: "service",
                TaxCode: "VAT15"
            }
        ]
    });

    const addItem = () => {
        setTestPayload({
            ...testPayload,
            items: [
                ...testPayload.items,
                {
                    ProductDescription: "Parking Fee",
                    PreTaxValue: 0,
                    TaxAmount: 0,
                    ItemCode: `ITEM-${testPayload.items.length + 1}`,
                    Quantity: 1,
                    Unit: "PCS",
                    NatureOfSupplies: "service",
                    TaxCode: "VAT15"
                }
            ]
        });
    };

    const removeItem = (index: number) => {
        const newItems = [...testPayload.items];
        newItems.splice(index, 1);
        setTestPayload({ ...testPayload, items: newItems });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...testPayload.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calculate tax if preTax changes
        if (field === 'PreTaxValue') {
            newItems[index].TaxAmount = Math.round(Number(value) * 0.15);
        }

        setTestPayload({ ...testPayload, items: newItems });
    };

    const handleSingleRegister = async () => {
        if (!parkingId) {
            toast.error("Please select a parking agent first");
            return;
        }
        if (testPayload.items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        setRegistering(true);
        try {
            const payload = {
                parkingId,
                TransactionType: testPayload.transactionType,
                BuyerDetails: {
                    IdType: testPayload.buyerIdType || "KID",
                    City: testPayload.buyerCity || "101",
                    Email: testPayload.buyerEmail || "",
                    HouseNumber: testPayload.buyerHouseNumber || "101",
                    LegalName: testPayload.buyerName || "",
                    Phone: testPayload.buyerPhone || "",
                    Region: testPayload.buyerRegion || "1",
                    Tin: testPayload.buyerTin || "",
                    VatNumber: testPayload.buyerVatNumber || "",
                    Wereda: testPayload.buyerWereda || "13",
                    Locality: testPayload.buyerLocality || null,
                    SubCity: testPayload.buyerSubCity || null
                },
                ItemList: testPayload.items.map((item, index) => ({
                    ...item,
                    PreTaxValue: Number(item.PreTaxValue),
                    TaxAmount: Number(item.TaxAmount),
                    TotalLineAmount: Number(item.PreTaxValue) + Number(item.TaxAmount),
                    UnitPrice: Number(item.PreTaxValue),
                    Discount: 0,
                    ExciseTaxValue: 0,
                    HarmonizationCode: null,
                    LineNumber: index + 1
                })),
                DocumentDetails: {
                    DocumentNumber: "AUTO",
                    Date: testPayload.documentDate,
                    Type: testPayload.documentType
                },
                PaymentDetails: {
                    Mode: testPayload.paymentMode,
                    PaymentTerm: testPayload.paymentTerm
                },
                SourceSystem: {
                    CashierName: testPayload.cashierName,
                    InvoiceCounter: 0,
                    SalesPersonName: testPayload.salesPersonName,
                    SystemNumber: "AUTO",
                    SystemType: "POS"
                }
            };

            await invoiceService.registerInvoice(payload);
            toast.success("Invoice registered successfully");
            setIsOpen(false);
            onSuccess?.();
        } catch (error: any) {
            console.error("Registration failed", error);
            const errorMsg = error.response?.data?.message || "Failed to register invoice with MOR";
            toast.error(errorMsg, { duration: 8000 });
        } finally {
            setRegistering(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="h-11 rounded px-6 bg-primary hover:opacity-90 font-bold shadow-lg shadow-primary/20 flex-1 xl:flex-none transition-all">
                        <Plus className="h-4 w-4 mr-2" />
                        Register Invoice
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Send className="h-6 w-6 text-primary" />
                        Manual Registration
                    </DialogTitle>
                    <DialogDescription className="font-medium text-slate-500 mt-2 text-left">
                        Manage buyer information and line items for MOR compliance.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="buyer" className="w-full">
                    <div className="px-8 pt-4 bg-slate-50 border-b border-slate-100">
                        <TabsList className="bg-slate-200/50 p-1 rounded-xl">
                            <TabsTrigger value="buyer" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                Buyer Info
                            </TabsTrigger>
                            <TabsTrigger value="items" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                Items
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{testPayload.items.length}</span>
                            </TabsTrigger>
                            <TabsTrigger value="payment" className="rounded-lg font-bold px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                                Payment
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="buyer" className="p-8 m-0 max-h-[50vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transaction Type</Label>
                                <Select
                                    value={testPayload.transactionType}
                                    onValueChange={(val) => setTestPayload({ ...testPayload, transactionType: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="B2B">B2B - Business</SelectItem>
                                        <SelectItem value="B2C">B2C - Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Legal Name</Label>
                                <Input
                                    value={testPayload.buyerName}
                                    onChange={e => setTestPayload({ ...testPayload, buyerName: e.target.value })}
                                    className="h-11 border-slate-200 font-bold rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TIN</Label>
                                <Input
                                    value={testPayload.buyerTin}
                                    onChange={e => setTestPayload({ ...testPayload, buyerTin: e.target.value })}
                                    className="h-11 border-slate-200 font-mono rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">VAT</Label>
                                <Input
                                    value={testPayload.buyerVatNumber}
                                    onChange={e => setTestPayload({ ...testPayload, buyerVatNumber: e.target.value })}
                                    className="h-11 border-slate-200 font-mono rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px) font-black uppercase text-slate-400 tracking-widest">Phone</Label>
                                <Input
                                    value={testPayload.buyerPhone}
                                    onChange={e => setTestPayload({ ...testPayload, buyerPhone: e.target.value })}
                                    className="h-11 border-slate-200 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</Label>
                                <Input
                                    value={testPayload.buyerEmail}
                                    onChange={e => setTestPayload({ ...testPayload, buyerEmail: e.target.value })}
                                    className="h-11 border-slate-200 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">City</Label>
                                <Input value={testPayload.buyerCity} onChange={e => setTestPayload({ ...testPayload, buyerCity: e.target.value })} className="h-11 border-slate-200 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wereda</Label>
                                <Input value={testPayload.buyerWereda} onChange={e => setTestPayload({ ...testPayload, buyerWereda: e.target.value })} className="h-11 border-slate-200 rounded-xl" />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="items" className="p-8 m-0 max-h-[50vh] overflow-y-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <ListChecks className="h-4 w-4" />
                                Line Items
                            </h3>
                            <Button onClick={addItem} size="sm" variant="outline" className="rounded-lg font-bold">
                                <Plus className="h-4 w-4 mr-2" /> Add Item
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {testPayload.items.map((item, index) => (
                                <div key={index} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                                    <Button
                                        onClick={() => removeItem(index)}
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md text-rose-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2 space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Description</Label>
                                            <Input
                                                value={item.ProductDescription}
                                                onChange={e => updateItem(index, 'ProductDescription', e.target.value)}
                                                className="h-10 bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Pre-Tax (ETB)</Label>
                                            <Input
                                                type="number"
                                                value={item.PreTaxValue}
                                                onChange={e => updateItem(index, 'PreTaxValue', parseFloat(e.target.value) || 0)}
                                                className="h-10 bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Tax</Label>
                                            <Input
                                                type="number"
                                                value={item.TaxAmount}
                                                onChange={e => updateItem(index, 'TaxAmount', parseFloat(e.target.value) || 0)}
                                                className="h-10 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="payment" className="p-8 m-0 max-h-[50vh] overflow-y-auto space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Doc Type</Label>
                                <Select value={testPayload.documentType} onValueChange={(val) => setTestPayload({ ...testPayload, documentType: val })}>
                                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INV">Invoice (INV)</SelectItem>
                                        <SelectItem value="DEB">Debit Note (DEB)</SelectItem>
                                        <SelectItem value="CRE">Credit Note (CRE)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Payment Mode</Label>
                                <Select value={testPayload.paymentMode} onValueChange={(val) => setTestPayload({ ...testPayload, paymentMode: val })}>
                                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CHQ">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Cashier</Label>
                                <Input value={testPayload.cashierName} onChange={e => setTestPayload({ ...testPayload, cashierName: e.target.value })} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                        <div className="text-left">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Grand Total</p>
                            <p className="text-2xl font-black text-emerald-600 leading-none">
                                {testPayload.items.reduce((sum, item) => sum + (Number(item.PreTaxValue) + Number(item.TaxAmount)), 0).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold px-6">Cancel</Button>
                        <Button
                            onClick={handleSingleRegister}
                            disabled={registering}
                            className="rounded-xl font-black px-8 bg-primary hover:opacity-90 shadow-xl"
                        >
                            {registering ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit to MOR"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

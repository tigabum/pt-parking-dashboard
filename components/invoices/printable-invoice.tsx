"use client";

import React from "react";
import { format } from "date-fns";
import { numberToWords } from "@/lib/number-to-words";

interface PrintableInvoiceProps {
    invoice: any;
}

export const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
    ({ invoice }, ref) => {
        if (!invoice) return null;

        const buyer = invoice.buyerDetails ?? {};
        const seller = invoice.sellerDetails ?? {};
        const val = invoice.valueDetails ?? {};
        const items: any[] = invoice.itemList ?? [];
        const doc = invoice.documentDetails ?? {};

        // In the example, total in words is just the integer part with currency? 
        // Example: "twelve thousand, six hundred fifty birr"
        // I'll make it generic.
        const totalAmount = val.TotalValue || 0;
        const totalInWords = `${numberToWords(Math.floor(totalAmount))} birr`;

        return (
            <div
                ref={ref}
                className="bg-white text-slate-900 p-8 w-[800px] mx-auto border border-slate-200"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
                {/* Header section with logos and doc info */}
                <div className="flex border border-slate-300">
                    <div className="w-1/4 p-4 border-r border-slate-300 flex items-center justify-center">
                        <img src="/login-brand.png" alt="Logo" className="max-h-20 max-w-full" />
                    </div>
                    <div className="w-2/4 p-4 border-r border-slate-300">
                        <h2 className="font-bold text-lg">{seller.LegalName || "Gelagle Park"}</h2>
                        <p className="text-xs">{seller.Address || "N/A, 101"}</p>
                    </div>
                    <div className="w-1/4 p-4 text-xs">
                        <div className="flex justify-between">
                            <span className="font-bold">የደረሰኝ ቁጥር</span>
                            <span className="border-b border-slate-900 px-2">{invoice.receipt?.receiptNumber || invoice.invoiceCounter || "—"}</span>
                        </div>
                        <div className="mt-1">Document No</div>
                        <div className="mt-2 flex justify-between">
                            <span className="font-bold">ቀን</span>
                            <span className="border-b border-slate-900 px-1">{(invoice.receipt?.receiptDate || invoice.createdAt) ? format(new Date(invoice.receipt?.receiptDate || invoice.createdAt), "d-M-yyyy") : ""} ዓ.ም</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Date</span>
                            <span>{(invoice.receipt?.receiptDate || invoice.createdAt) ? format(new Date(invoice.receipt?.receiptDate || invoice.createdAt), "dd-MM-yyyy") : ""} G.C</span>
                        </div>
                        <div className="mt-2 flex justify-between">
                            <span>ሰዓት/Time</span>
                            <span>{(invoice.receipt?.receiptDate || invoice.createdAt) ? format(new Date(invoice.receipt?.receiptDate || invoice.createdAt), "HH:mm:ss") : "00:00:00"}</span>
                        </div>
                    </div>
                </div>

                {/* Title section */}
                <div className="relative py-4 border-b border-slate-300">
                    <div className="text-center space-y-1">
                        <p className="font-bold text-sm border-b border-slate-900 inline-block">የጥሬ ገንዘብ ሽያጭ ደረሰኝ / ተ.እ.ታ / ኤክሳይስ ታክስ</p>
                        <p className="font-bold text-sm border-b border-slate-900 inline-block ml-2 text-nowrap">Cash sales invoice / VAT / Excise Tax</p>
                    </div>

                    <div className="flex justify-between items-start mt-4 px-4">
                        <div className="text-[10px] space-y-1">
                            <p className="break-all max-w-[500px]">IRN: {invoice.irn || "N/A"}</p>
                            <p>System Number: {invoice.sourceSystem?.SystemNumber || "800C04A75A"}</p>
                        </div>
                        {invoice.qrCode && (
                            <div className="shrink-0 ml-4">
                                <img src={invoice.qrCode} alt="QR Code" className="w-24 h-24" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Seller & Buyer details grid */}
                <div className="grid grid-cols-2 mt-4 border border-slate-300 text-[10px]">
                    {/* Seller column */}
                    <div className="border-r border-slate-300">
                        <div className="flex border-b border-slate-300">
                            <div className="w-16 p-1 border-r border-slate-300 font-bold">ከ <br /> From</div>
                            <div className="p-1 font-bold underline">{seller.LegalName}</div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-slate-300">
                            <div className="p-1 border-r border-slate-300">አድራሻ <br /> Address</div>
                            <div className="p-1 border-r border-slate-300">ከተማ <br /> City/Town <p className="font-bold">{seller.City || "101"}</p></div>
                            <div className="p-1">ዞን/ክ/ከተማ <br /> Zone/Sub city <p className="font-bold">{seller.Region || "N/A"}</p></div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-slate-300">
                            <div className="p-1 border-r border-slate-300">ወረዳ <br /> Woreda <p className="font-bold">{seller.Wereda || "13"}</p></div>
                            <div className="p-1 border-r border-slate-300">ቀበሌ <br /> Kebele <p className="font-bold">{seller.Kebele || "N/A"}</p></div>
                            <div className="p-1">የቤት ቁ <br /> H/No <p className="font-bold">{seller.HouseNo || "N/A"}</p></div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-slate-300">
                            <div className="p-1 border-r border-slate-300">የሻጭ የግብር ከፋይ መለያ ቁጥር <br /> Seller's TIN <p className="font-bold underline">{seller.Tin}</p></div>
                            <div className="p-1">ንዑስ-TIN <br /> Sub-TIN <p className="font-bold">{seller.SubTin || "N/A"}</p></div>
                        </div>
                        <div className="p-1 border-b border-slate-300">የሻጭ የኤ.እ.ታ ምዝገባ ቁጥር <br /> Seller's VAT Reg.No <p className="font-bold">{seller.VatNumber || "43256663343256663322"}</p></div>
                        <div className="p-1">ለተ.እ.ታ የምዝገባ ቀን <br /> Date of VAT Registration <p className="font-bold underline">{seller.VatRegistrationDate || "N/A"}</p></div>
                    </div>

                    {/* Buyer column */}
                    <div>
                        <div className="flex border-b border-slate-300">
                            <div className="w-16 p-1 border-r border-slate-300 font-bold">ለ <br /> To</div>
                            <div className="p-1 font-bold underline">{buyer.LegalName}</div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-slate-300">
                            <div className="p-1 border-r border-slate-300">አድራሻ <br /> Address</div>
                            <div className="p-1 border-r border-slate-300">ከተማ <br /> City/Town <p className="font-bold">{buyer.City || "101"}</p></div>
                            <div className="p-1">ዞን/ክ/ከተማ <br /> Zone/Sub city <p className="font-bold">{buyer.Region || "N/A"}</p></div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-slate-300">
                            <div className="p-1 border-r border-slate-300">ወረዳ <br /> Woreda <p className="font-bold">{buyer.Wereda || "13"}</p></div>
                            <div className="p-1 border-r border-slate-300">ቀበሌ <br /> Kebele <p className="font-bold">{buyer.Kebele || "N/A"}</p></div>
                            <div className="p-1">የቤት ቁ <br /> H/No <p className="font-bold">{buyer.HouseNo || "101"}</p></div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-slate-300">
                            <div className="p-1 border-r border-slate-300">የደንበኛ የግብር ከፋይ መለያ ቁጥር <br /> Customer's TIN <p className="font-bold underline">{buyer.Tin}</p></div>
                            <div className="p-1">ንዑስ-TIN <br /> Sub-TIN <p className="font-bold">{buyer.SubTin || "N/A"}</p></div>
                        </div>
                        <div className="p-1 border-b border-slate-300">የደንበኛ የኤ.እ.ታ ምዝገባ ቁጥር <br /> Customer's VAT Reg.No <p className="font-bold">{buyer.VatNumber || "43256663343256663322"}</p></div>
                        <div className="p-1">ስልክ ቁጥር <br /> Phone.No <p className="font-bold underline">{buyer.Phone}</p></div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mt-4 border-collapse border border-slate-300 text-[9px]">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="border border-slate-300 p-1 text-center">ተ/ቁ <br /> / No.</th>
                            <th className="border border-slate-300 p-1 text-center">የሸቀጡ / የአገልግሎት አይነት <br /> Product / service Description</th>
                            <th className="border border-slate-300 p-1 text-center">ምንጭ <br /> Nature of Supply</th>
                            <th className="border border-slate-300 p-1 text-center">መለኪያ <br /> UoM</th>
                            <th className="border border-slate-300 p-1 text-center">ብዛት <br /> Quantity</th>
                            <th className="border border-slate-300 p-1 text-center">የአንዱ ዋጋ <br /> / Unit Price</th>
                            <th className="border border-slate-300 p-1 text-center">ታክስ ኮድ <br /> / Tax Code</th>
                            <th className="border border-slate-300 p-1 text-center">ኤክሳይስ ታክስ <br /> / Excise Tax</th>
                            <th className="border border-slate-300 p-1 text-center">ጠቅላላ ዋጋ <br /> Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="border border-slate-300 p-1 text-center">{item.LineNumber}</td>
                                <td className="border border-slate-300 p-1">{item.ProductDescription}</td>
                                <td className="border border-slate-300 p-1 text-center">{item.NatureOfSupply || "goods"}</td>
                                <td className="border border-slate-300 p-1 text-center">{item.Unit || "PCS"}</td>
                                <td className="border border-slate-300 p-1 text-center">{item.Quantity}</td>
                                <td className="border border-slate-300 p-1 text-right">{item.UnitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="border border-slate-300 p-1 text-center">{item.TaxCode || "VAT15"}</td>
                                <td className="border border-slate-300 p-1 text-right">{item.ExciseTaxAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</td>
                                <td className="border border-slate-300 p-1 text-right font-bold">{item.TotalLineAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                        {/* Summary rows */}
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right font-bold">ድምር (ETB) / Total (ETB)</td>
                            <td className="border border-slate-300 p-1 text-right font-bold" colSpan={2}>{val.TotalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right">የቅናሽ መጠን / Discount Amount</td>
                            <td className="border border-slate-300 p-1 text-right" colSpan={2}>0.00</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right">ታክስ የሚከፈልበት ድምር / Taxable Total</td>
                            <td className="border border-slate-300 p-1 text-right" colSpan={2}>{(val.TotalValue - val.TaxValue)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right">ኤክሳይስ ታክስ / Excise Tax</td>
                            <td className="border border-slate-300 p-1 text-right" colSpan={2}>0.00</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right">ተ.እ.ታ የሚከፈልበት ድምር / Total VAT Taxable Amount</td>
                            <td className="border border-slate-300 p-1 text-right" colSpan={2}>{(val.TotalValue - val.TaxValue)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right">VAT15 ታክስ / VAT15 Tax rate (15%)</td>
                            <td className="border border-slate-300 p-1 text-right font-bold" colSpan={2}>{val.TaxValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border border-slate-300 p-1 text-right font-bold">ጠቅላላ ዋጋ ከታክስ ጋር / Total including Tax</td>
                            <td className="border border-slate-300 p-1 text-right font-bold" colSpan={2}>{val.TotalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Total in words */}
                <div className="mt-4 border-b border-slate-300 pb-1 text-[10px]">
                    <span className="font-bold italic">ጠቅላላ ዋጋ ከታክስ ጋር (በፊደል) Total including Tax (in words)</span>
                    <p className="font-bold underline text-center mt-1 uppercase">{totalInWords}</p>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 mt-4 text-[10px]">
                    <div className="flex">
                        <div className="mr-8">
                            የክፍያ ሁኔታ <br /> Mode of Payment <p className="font-bold font-mono">CASH</p>
                        </div>
                        <div>
                            አይነት <br /> Type/Method
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div>
                            የተቀባይ ስምና ፊርማ <br /> Receiver Name & Signature
                        </div>
                        <div className="text-right font-bold">
                            {seller.LegalName}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PrintableInvoice.displayName = "PrintableInvoice";

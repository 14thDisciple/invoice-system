import React from 'react';
import { ReceiptData } from '../types';

interface Props {
  data: ReceiptData;
}

export function ReceiptTemplate({ data }: Props) {
  return (
    <div className="bg-white shadow-2xl rounded-sm border border-slate-200 flex flex-col p-12 relative overflow-hidden print-area w-[210mm] max-w-[210mm] min-h-[148mm] !shadow-none !border-none !rounded-none" id="document-preview">
      <div 
        className="absolute top-0 left-0 w-full h-3" 
        style={{ backgroundColor: data.company.accentColor || '#10b981' }}
      ></div>
      {/* Watermark */}
      <div className="absolute top-4 right-0 p-4">
        <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Valid Receipt</span>
      </div>

      <div className="flex justify-between items-start mb-12">
        <div className="flex flex-col gap-3">
          {data.company.logoUrl && (
            <img src={data.company.logoUrl} alt="Company Logo" className="h-28 w-auto max-w-[320px] object-contain object-left" />
          )}
          <h3 className="text-2xl font-serif font-bold tracking-tight" style={{ color: data.company.accentColor || '#0f172a' }}>RECEIPT</h3>
          <p className="text-slate-500 text-sm">{data.company.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-800">#{data.receiptNumber}</p>
          <p className="text-xs text-slate-400 mt-1">Date: {new Date(data.date).toLocaleDateString('en-GB')}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-8 mb-10 items-end">
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Received From</h4>
          <p className="text-base font-bold text-slate-800">{data.client.name}</p>
          <p className="text-sm text-slate-500 mt-1">{data.client.address}</p>
        </div>
        <div className="text-right border border-slate-200 p-4 rounded-lg bg-slate-50">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Received</h4>
          <p className="text-2xl font-mono font-bold text-slate-900">GH₵{data.amountReceived.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-12">
        <thead className="text-left" style={{ borderBottomColor: data.company.accentColor || '#0f172a', borderBottomWidth: '2px' }}>
          <tr>
            <th className="py-2 text-slate-900 font-bold">Payment Details</th>
            <th className="py-2 text-slate-900 font-bold text-right">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-4">
              <span className="font-medium text-slate-800 block text-sm">For Invoice {data.forInvoiceNo}</span>
              <span className="text-slate-500 text-xs mt-1 block">Method: {data.paymentMethod}</span>
            </td>
            <td className="py-4 text-right font-mono text-slate-800">{data.paymentReference}</td>
          </tr>
        </tbody>
      </table>

      {data.notes && (
        <div className="mb-12">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
          <p className="text-sm text-slate-600 whitespace-pre-line italic">"{data.notes}"</p>
        </div>
      )}
      
      <div className="mt-auto flex justify-end">
        <div className="text-center w-64 flex flex-col items-center justify-end mt-8">
          {data.company.signatureUrl && (
            <img src={data.company.signatureUrl} className="h-28 w-full object-contain object-bottom mb-1" alt="signature" />
          )}
          <div className="w-full border-b border-slate-400 mb-2"></div>
          <p className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">{data.company.name} Authorized</p>
        </div>
      </div>
    </div>
  );
}

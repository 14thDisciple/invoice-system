import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InvoiceData } from '../types';

interface Props {
  data: InvoiceData;
}

export function InvoiceTemplate({ data }: Props) {
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount;

  const isModern = data.company.templateStyle === 'modern';

  return (
    <div className={`bg-white shadow-2xl border border-slate-200 flex p-12 relative overflow-hidden print-area w-[210mm] max-w-[210mm] min-h-[297mm] !shadow-none !border-none !rounded-none ${isModern ? 'flex-row' : 'flex-col'}`} id="document-preview">
      {isModern ? (
        <div 
          className="absolute top-0 left-0 h-full w-4" 
          style={{ backgroundColor: data.company.accentColor || '#3b82f6' }}
        ></div>
      ) : (
        <div 
          className="absolute top-0 left-0 w-full h-3" 
          style={{ backgroundColor: data.company.accentColor || '#3b82f6' }}
        ></div>
      )}

      {/* Watermark */}
      <div className="absolute top-4 right-0 p-4">
        <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Valid Document</span>
      </div>

      <div className={`flex flex-col w-full h-full ${isModern ? 'pl-4' : ''}`}>
        <div className={`flex justify-between items-start mb-12 ${isModern ? 'flex-row-reverse border-b pb-8' : ''}`}>
          <div className={`flex flex-col gap-3 ${isModern ? 'text-right items-end' : ''}`}>
            {data.company.logoUrl && (
              <img src={data.company.logoUrl} alt="Company Logo" className={`h-28 w-auto max-w-[320px] object-contain ${isModern ? 'object-right' : 'object-left'}`} />
            )}
            <h3 className="text-2xl font-serif font-bold tracking-tight" style={{ color: data.company.accentColor || '#0f172a' }}>INVOICE</h3>
            <p className="text-slate-500 text-sm">{data.company.name}</p>
          </div>
          <div className={isModern ? 'text-left' : 'text-right'}>
            <p className="text-sm font-bold text-slate-800">#{data.invoiceNumber}</p>
            <p className="text-xs text-slate-400 mt-1">Date: {new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: data.company.accentColor || '#94a3b8' }}>Bill To</p>
            <p className="text-sm font-bold text-slate-800">{data.client.name}</p>
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line mt-1">{data.client.address}<br/>{data.client.email}</p>
            <p className="text-xs text-slate-400 mt-2">GSTIN: {data.client.taxId}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: data.company.accentColor || '#94a3b8' }}>Pay To</p>
            <p className="text-sm font-bold text-slate-800">{data.company.name}</p>
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line mt-1">{data.company.address}<br/>{data.company.email}</p>
            <p className="text-xs text-slate-400 mt-2">GSTIN: {data.company.taxId}</p>
          </div>
        </div>

        <table className="w-full mb-12 text-sm">
          <thead className="text-left" style={{ borderBottomColor: data.company.accentColor || '#0f172a', borderBottomWidth: '2px' }}>
            <tr>
              <th className="py-2 font-bold text-slate-900">Description</th>
              <th className="py-2 font-bold text-slate-900 text-center w-20">Qty</th>
              <th className="py-2 font-bold text-slate-900 text-right w-32">Rate</th>
              <th className="py-2 font-bold text-slate-900 text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="py-4 text-slate-800">{item.description}</td>
                <td className="py-4 text-center font-mono text-slate-600">{item.quantity}</td>
                <td className="py-4 text-right text-slate-600">GH₵{item.rate.toFixed(2)}</td>
                <td className="py-4 text-right font-medium text-slate-900">GH₵{(item.quantity * item.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.notes && (
          <div className="mb-8 p-4 bg-slate-50 border border-slate-100 rounded text-sm text-slate-600 italic">
            <span className="font-semibold block not-italic text-slate-700 mb-1 text-[10px] uppercase">Notes</span>
            {data.notes}
          </div>
        )}

        <div className="mt-auto border-t border-slate-200 pt-6 flex justify-between items-end">
          <div className="flex justify-between w-full h-[128px]">
            <div className="flex flex-col justify-end max-w-xs text-[10px] text-slate-400 italic">
              <p className="mb-4 leading-relaxed text-slate-500">Thank you for your business. This document is electronically generated and does not require a physical signature for validity.</p>
              
              <div className="flex items-end gap-6 mt-4">
                {data.company.includeQrCode && (
                  <div className="flex flex-col items-center gap-1 border border-slate-200 p-1.5 rounded bg-white">
                    <QRCodeSVG value={`INV:${data.invoiceNumber}|AMT:${total.toFixed(2)}`} size={64} />
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Scan to Verify</span>
                  </div>
                )}
                
                {data.company.signatureUrl && (
                  <div className="flex flex-col items-start w-64">
                    <img src={data.company.signatureUrl} alt="Signature" className="h-28 w-full object-contain object-left-bottom mb-1" />
                    <div className="w-full border-b border-slate-400 mb-2"></div>
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Authorized Signatory</p>
                  </div>
                )}
              </div>
            </div>
            <div className="w-56 space-y-2 flex flex-col justify-end h-full pt-4">
              <div className="flex justify-between text-sm mt-auto">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax ({data.taxRate}%)</span>
                <span className="font-medium text-slate-800">GH₵{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-900 pt-2 text-slate-900">
                <span>Total</span>
                <span className="text-blue-600">GH₵{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

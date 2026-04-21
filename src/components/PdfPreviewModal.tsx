import React, { useState } from 'react';
import { Eye, Settings, FilePlus, Save, Mail, Download, Search, Plus, Trash2, History, Archive, ChevronRight, FileText, Truck, Receipt, UserPlus, File, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pdfBase64: string | undefined;
}

export function PdfPreviewModal({ isOpen, onClose, pdfBase64 }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <File size={18} className="text-blue-600" /> PDF Preview
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 bg-slate-200 p-4">
          {pdfBase64 ? (
            <iframe 
              src={`data:application/pdf;base64,${pdfBase64}`} 
              className="w-full h-full rounded shadow-sm"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Failed to load PDF preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

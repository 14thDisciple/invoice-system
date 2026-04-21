import React, { useState, useEffect, useRef } from 'react';
import { Download, Mail, FileText, Truck, Receipt, Settings, Plus, Trash2, History, Save, FilePlus, ChevronRight, Archive, Eye, LogOut, UserPlus, Search, RefreshCw, TriangleAlert, Menu, LayoutDashboard, Sheet, X, PenTool } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';
import { DocumentType, DocumentHistoryEntry, InvoiceData, EWayBillData, ReceiptData } from './types';
import { DEFAULT_INVOICE, DEFAULT_EWAY_BILL, DEFAULT_RECEIPT } from './defaults';
import { InvoiceTemplate } from './components/InvoiceTemplate';
import { EWayBillTemplate } from './components/EWayBillTemplate';
import { ReceiptTemplate } from './components/ReceiptTemplate';
import { EmailModal } from './components/EmailModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { Login } from './components/Login';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  const [session, setSession] = useState<{ token: string, role: string, username: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentType | 'dashboard' | 'settings' | 'history' | 'admin'>('dashboard');
  const [invoiceData, setInvoiceData] = useState(DEFAULT_INVOICE);
  const [ewayBillData, setEwayBillData] = useState(DEFAULT_EWAY_BILL);
  const [receiptData, setReceiptData] = useState(DEFAULT_RECEIPT);
  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  
  const [companyConfig, setCompanyConfig] = useState<{
    logoUrl?: string;
    signatureUrl?: string;
    accentColor?: string;
    templateStyle?: 'modern' | 'classic';
    includeQrCode?: boolean;
  }>({
    logoUrl: '',
    signatureUrl: '',
    templateStyle: 'classic',
    includeQrCode: false
  });

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [currentPdfBase64, setCurrentPdfBase64] = useState<string | undefined>();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'invoice' | 'ewaybill' | 'receipt'>('all');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const sigPad = useRef<SignatureCanvas>(null);
  const [showSigPad, setShowSigPad] = useState(false);
  
  // Admin User Creation
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');

  useEffect(() => {
    if (session?.token) {
      fetchHistory();
      
      const savedInvoice = localStorage.getItem('autosave_invoice');
      const savedReceipt = localStorage.getItem('autosave_receipt');
      const savedEway = localStorage.getItem('autosave_eway');
      const savedConfig = localStorage.getItem('autosave_config');

      if (savedInvoice) setInvoiceData(JSON.parse(savedInvoice));
      if (savedReceipt) setReceiptData(JSON.parse(savedReceipt));
      if (savedEway) setEwayBillData(JSON.parse(savedEway));
      if (savedConfig) setCompanyConfig(JSON.parse(savedConfig));
    }
  }, [session]);

  // Auto-save logic
  useEffect(() => {
    if (session?.token) {
      const timer = setTimeout(() => {
        localStorage.setItem('autosave_invoice', JSON.stringify(invoiceData));
        localStorage.setItem('autosave_receipt', JSON.stringify(receiptData));
        localStorage.setItem('autosave_eway', JSON.stringify(ewayBillData));
        localStorage.setItem('autosave_config', JSON.stringify(companyConfig));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [invoiceData, receiptData, ewayBillData, companyConfig, session]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${session?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  }

  const handleLogout = () => {
    setSession(null);
    setShowLogoutConfirm(false);
  };

  const handleGenerateEWayBill = () => {
    const min = 1000000000;
    const max = 9999999999;
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    setEwayBillData(prev => ({ ...prev, ewayBillNo: num.toString() }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setIsEmailModalOpen(true);
  };

  const handleSaveDocument = async () => {
    let newEntry: DocumentHistoryEntry | null = null;
    
    if (activeTab === 'invoice') {
      if (!invoiceData.client.name) return toast.error("Client name is required");
      const totalAmount = invoiceData.items.reduce((acc, i) => acc + (i.quantity * i.rate), 0) * (1 + invoiceData.taxRate / 100);
      newEntry = {
        id: Date.now().toString(),
        docType: 'invoice',
        date: new Date().toISOString(),
        clientName: invoiceData.client.name,
        documentNumber: invoiceData.invoiceNumber,
        totalAmount,
        data: invoiceData
      };
    } else if (activeTab === 'ewaybill') {
      if (!ewayBillData.recipient.name) return toast.error("Recipient name is required");
      newEntry = {
        id: Date.now().toString(),
        docType: 'ewaybill',
        date: new Date().toISOString(),
        clientName: ewayBillData.recipient.name,
        documentNumber: ewayBillData.ewayBillNo,
        data: ewayBillData
      };
    } else if (activeTab === 'receipt') {
      if (!receiptData.client.name) return toast.error("Client name is required");
      newEntry = {
        id: Date.now().toString(),
        docType: 'receipt',
        date: new Date().toISOString(),
        clientName: receiptData.client.name,
        documentNumber: receiptData.receiptNumber,
        totalAmount: receiptData.amountReceived,
        data: receiptData
      };
    }

    if (newEntry && session?.token) {
      setHistory(prev => [newEntry as DocumentHistoryEntry, ...prev]);
      toast.success('Document saved locally');

      try {
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}` 
          },
          body: JSON.stringify(newEntry)
        });
      } catch (err) {
        console.error('Failed to sync to database', err);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHistoryIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedHistoryIds.length} document(s)?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token}`
        },
        body: JSON.stringify({ ids: selectedHistoryIds })
      });
      
      if (res.ok) {
        toast.success(`Deleted ${selectedHistoryIds.length} documents`);
        setSelectedHistoryIds([]);
        fetchHistory();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      toast.error('Failed to delete documents');
      console.error(err);
    }
  };

  const handleNewDocument = () => {
    if (activeTab === 'invoice') {
      setInvoiceData({
        ...DEFAULT_INVOICE, 
        invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
        items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0 }],
        client: { ...DEFAULT_INVOICE.client, name: '', address: '' }
      });
      toast.success('Started new invoice');
    } else if (activeTab === 'ewaybill') {
      setEwayBillData({
        ...DEFAULT_EWAY_BILL, 
        ewayBillNo: `EWB-${Math.floor(Math.random() * 10000)}`,
        recipient: { ...DEFAULT_EWAY_BILL.recipient, name: '' },
        shipTo: ''
      });
      toast.success('Started new e-Way Bill');
    } else if (activeTab === 'receipt') {
      setReceiptData({
        ...DEFAULT_RECEIPT, 
        receiptNumber: `REC-${Math.floor(Math.random() * 10000)}`,
        client: { ...DEFAULT_RECEIPT.client, name: '' },
        amountReceived: 0
      });
      toast.success('Started new receipt');
    }
  };

  const loadFromHistory = (entry: DocumentHistoryEntry) => {
    if (entry.docType === 'invoice') {
      setInvoiceData(entry.data as InvoiceData);
      setActiveTab('invoice');
    } else if (entry.docType === 'ewaybill') {
      setEwayBillData(entry.data as EWayBillData);
      setActiveTab('ewaybill');
    } else if (entry.docType === 'receipt') {
      setReceiptData(entry.data as ReceiptData);
      setActiveTab('receipt');
    }
    toast.success(`Loaded ${entry.documentNumber}`);
  };

  const getPdfBase64 = async () => {
    return await generatePdf('base64');
  };

  const handleDownloadPdf = async () => {
    await generatePdf('download');
  };

  const generatePdf = async (action: 'download' | 'base64') => {
    const element = document.getElementById('document-preview');
    if (!element) return undefined;
    
    // Temporarily remove transform scaling for high-quality capture
    const parentContainer = element.parentElement;
    const originalTransform = parentContainer ? parentContainer.style.transform : '';
    if (parentContainer) parentContainer.style.transform = 'none';

    let toastId;
    if (action === 'download') {
      toastId = toast.loading('Generating high-quality PDF...');
    }

    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      if (action === 'download') {
        const fileName = `${activeTab}-${Date.now()}.pdf`;
        pdf.save(fileName);
        toast.success('PDF downloaded!', { id: toastId });
        return;
      }

      const base64String = pdf.output('datauristring');
      return base64String.split('base64,')[1];
    } catch(err) {
      if (action === 'download') {
        toast.error('Failed to generate PDF', { id: toastId });
      }
      console.error(err);
    } finally {
      if (parentContainer) parentContainer.style.transform = originalTransform;
    }
  };

  const handlePreviewPdf = async () => {
    const base64 = await getPdfBase64();
    if (base64) {
      setCurrentPdfBase64(base64);
      setIsPdfModalOpen(true);
    } else {
      toast.error('Failed to generate PDF');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      
      toast.success('User created successfully');
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exportHistoryCsv = () => {
    if (history.length === 0) return toast.error('No history to export');
      
    const headers = ['Date', 'Type', 'Number', 'Client', 'Amount'];
    const rows = history.map(h => [
      new Date(h.date).toLocaleDateString(),
      h.docType,
      h.documentNumber,
      `"${h.clientName || ''}"`,
      h.totalAmount || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `document-history-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!session) {
    return <Login onLogin={(token, role, username) => setSession({ token, role, username })} />;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyConfig(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const currentCompanyData = { ...DEFAULT_INVOICE.company, ...companyConfig };
  
  const currentInvoiceData = { ...invoiceData, company: currentCompanyData };
  const currentEWayBillData = { ...ewayBillData, supplier: { ...ewayBillData.supplier, ...companyConfig } };
  const currentReceiptData = { ...receiptData, company: currentCompanyData };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative text-slate-900">
      <Toaster position="top-right" />
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - No print */}
      <aside className={`absolute z-40 lg:relative lg:flex flex-col w-64 bg-slate-900 text-white flex-shrink-0 min-h-screen no-print transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-bold tracking-tight text-lg">COASTAL HUB</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">Documents</div>
          <button 
            onClick={() => { setActiveTab('invoice'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'invoice' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <FileText size={18} /> Invoices
          </button>
          <button 
            onClick={() => { setActiveTab('ewaybill'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ewaybill' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Truck size={18} /> e-Way Bills
          </button>
          <button 
            onClick={() => { setActiveTab('receipt'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'receipt' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Receipt size={18} /> Receipts
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">System</div>
          <button 
            onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <History size={18} /> History
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1 ${activeTab === 'settings' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={18} /> Settings
          </button>
          {session.role === 'admin' && (
            <button 
              onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-1 ${activeTab === 'admin' ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <UserPlus size={18} /> Admin
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                {session?.username?.substring(0, 2)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white truncate max-w-[100px]">{session?.username}</p>
                <p className="text-[10px] text-slate-400 capitalize">{session?.role}</p>
              </div>
            </div>
            <button onClick={handleLogoutClick} className="text-slate-400 hover:text-white transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar - No print */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 no-print shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
              Document Deployment: <span className="text-blue-600 capitalize">{activeTab === 'dashboard' ? 'Overview' : activeTab.replace('ewaybill', 'e-Way Bill')}</span>
            </h1>
          </div>
          {activeTab !== 'settings' && activeTab !== 'history' && activeTab !== 'admin' && activeTab !== 'dashboard' && (
            <div className="flex z-50 gap-2 sm:gap-3 ml-auto">
              <button 
                onClick={handleNewDocument}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-2"
                title="Start a new document"
              >
                <FilePlus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
              <button 
                onClick={handleSaveDocument}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-slate-800 rounded hover:bg-slate-900 flex items-center gap-2"
                title="Save document state to history"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
              <button 
                onClick={handlePreviewPdf}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview PDF</span>
              </button>
              <button 
                onClick={handleEmail}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </button>
              <button 
                onClick={handleDownloadPdf}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          )}
        </header>

        {/* Workspace area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8 no-print">
          
          {/* History Panel */}
          {activeTab === 'history' && (
            <div className="w-full lg:col-span-12 space-y-6 max-w-5xl mx-auto">
              <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-800">Document History</h2>
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{history.length} Records</span>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search documents..." 
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-full sm:w-auto flex items-center gap-2">
                      {selectedHistoryIds.length > 0 && (
                        <button 
                          onClick={handleDeleteSelected}
                          className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-red-100"
                        >
                          <Trash2 size={16} /> Delete Selected ({selectedHistoryIds.length})
                        </button>
                      )}
                      <select 
                        value={historyFilter} 
                        onChange={(e: any) => setHistoryFilter(e.target.value)}
                        className="w-full sm:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">All Documents</option>
                        <option value="invoice">Invoices</option>
                        <option value="ewaybill">E-Way Bills</option>
                        <option value="receipt">Receipts</option>
                      </select>
                  </div>
                </div>
                
                {history.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                      <Archive size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No history yet</h3>
                    <p className="text-slate-500 text-sm">Save documents to access them later from this panel.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4 w-12 text-center">
                            <input 
                              type="checkbox" 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedHistoryIds(history.map(h => h.id));
                                } else {
                                  setSelectedHistoryIds([]);
                                }
                              }}
                              className="rounded border-slate-300"
                            />
                          </th>
                          <th className="px-6 py-4">Document</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Date generated</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history
                          .filter(entry => 
                            (historyFilter === 'all' || entry.docType === historyFilter) &&
                            (entry.documentNumber.toLowerCase().includes(historySearch.toLowerCase()) || 
                            entry.clientName?.toLowerCase().includes(historySearch.toLowerCase()))
                          )
                          .map((entry) => (
                          <tr key={entry.id} className={`transition-colors ${selectedHistoryIds.includes(entry.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedHistoryIds.includes(entry.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedHistoryIds(prev => [...prev, entry.id]);
                                  } else {
                                    setSelectedHistoryIds(prev => prev.filter(id => id !== entry.id));
                                  }
                                }}
                                className="rounded border-slate-300"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{entry.documentNumber}</span>
                                <span className="text-xs text-blue-600 uppercase font-bold tracking-wider mt-0.5">{entry.docType.replace('ewaybill', 'E-Way Bill')}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 font-medium">{entry.clientName || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-500">{new Date(entry.date).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              {entry.totalAmount ? (
                                <span className="font-mono font-medium text-slate-900">GH₵{entry.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => loadFromHistory(entry)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-blue-600 rounded text-xs font-bold transition-all shadow-sm"
                              >
                                Load <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Settings Panel */}
          {activeTab === 'settings' && (
            <div className="w-full lg:col-span-12 space-y-6 max-w-2xl mx-auto">
              <section className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-6 border-b border-slate-200 pb-2">Company Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Company Logo</label>
                    <div className="flex items-center gap-4">
                      {companyConfig.logoUrl && (
                        <img src={companyConfig.logoUrl} alt="Logo Preview" className="h-16 object-contain border border-slate-200 rounded p-1" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'logoUrl')}
                        className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Electronic Signature</label>
                    <div className="flex flex-col gap-4">
                      {companyConfig.signatureUrl && (
                        <div className="relative inline-block w-max">
                          <img src={companyConfig.signatureUrl} alt="Signature Preview" className="h-20 object-contain border border-slate-200 rounded p-1 bg-slate-50" />
                          <button onClick={() => setCompanyConfig(prev => ({...prev, signatureUrl: undefined}))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-red-200 hover:bg-red-200"><X size={12} /></button>
                        </div>
                      )}
                      
                      <div className="flex gap-4 items-center">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload(e, 'signatureUrl')}
                          className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <span className="text-slate-400 text-sm font-medium">OR</span>
                        <button 
                          onClick={() => setShowSigPad(!showSigPad)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                        >
                          <PenTool size={16} /> Draw Signature
                        </button>
                      </div>

                      {showSigPad && (
                        <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden w-[400px]">
                          <div className="p-2 border-b border-slate-200 bg-white flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signature Pad</span>
                            <div className="flex gap-2">
                              <button onClick={() => sigPad.current?.clear()} className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1">Clear</button>
                              <button onClick={() => {
                                if (!sigPad.current?.isEmpty()) {
                                  setCompanyConfig(prev => ({...prev, signatureUrl: sigPad.current?.getTrimmedCanvas().toDataURL('image/png')}));
                                  setShowSigPad(false);
                                }
                              }} className="text-xs bg-blue-600 text-white hover:bg-blue-700 rounded px-3 py-1 font-bold">Save Drawing</button>
                            </div>
                          </div>
                          <div className="bg-white">
                            <SignatureCanvas 
                              ref={sigPad}
                              canvasProps={{width: 400, height: 150, className: 'cursor-crosshair'}}
                              penColor="black"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Theme / Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={companyConfig.accentColor || '#2563eb'} onChange={e => setCompanyConfig({...companyConfig, accentColor: e.target.value})} className="h-10 w-16 p-1 bg-white border border-slate-200 rounded cursor-pointer" />
                      <span className="text-sm font-mono text-slate-500">{companyConfig.accentColor || '#2563eb'}</span>
                      <button onClick={() => setCompanyConfig({...companyConfig, accentColor: '#2563eb'})} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium">Reset Default</button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">Customize the border and header colors of generated documents.</p>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Layout Options</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-slate-600 block mb-1">Template Style</label>
                        <select 
                          value={companyConfig.templateStyle || 'classic'} 
                          onChange={(e: any) => setCompanyConfig({...companyConfig, templateStyle: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="classic">Classic (Top Border)</option>
                          <option value="modern">Modern (Sidebar Accent)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input 
                          type="checkbox" 
                          id="qr-toggle"
                          checked={companyConfig.includeQrCode || false} 
                          onChange={(e: any) => setCompanyConfig({...companyConfig, includeQrCode: e.target.checked})}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="qr-toggle" className="text-sm text-slate-700 cursor-pointer select-none">Include Auth QR Code</label>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Admin Panel */}
          {activeTab === 'admin' && session?.role === 'admin' && (
            <div className="w-full lg:col-span-12 space-y-6 max-w-2xl mx-auto">
              <section className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-6 border-b border-slate-200 pb-2">Role-Based Access Control (RBAC)</h2>
                
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Username</label>
                      <input 
                        type="text" 
                        value={newUsername} 
                        onChange={e => setNewUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Password</label>
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">User Role</label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="user">User - Can create and send documents</option>
                      <option value="admin">Admin - Can manage system and users</option>
                    </select>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold mt-4">
                    Create User Account
                  </button>
                </form>
              </section>
            </div>
          )}

          {/* Dashboard Panel */}
          {activeTab === 'dashboard' && (
            <div className="w-full lg:col-span-12 space-y-6 max-w-5xl mx-auto overflow-y-auto pb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Total Invoiced</h3>
                  <p className="text-3xl font-mono font-bold text-slate-800">
                    GH₵{history.filter(h => h.docType === 'invoice').reduce((sum, doc) => sum + (doc.totalAmount || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Total Received</h3>
                  <p className="text-3xl font-mono font-bold text-green-600">
                    GH₵{history.filter(h => h.docType === 'receipt').reduce((sum, doc) => sum + (doc.totalAmount || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Documents Issued</h3>
                  <p className="text-3xl font-mono font-bold text-blue-600">{history.length}</p>
                </div>
              </div>
              
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-6 border-b border-slate-200 pb-2">Recent Activity</h2>
                {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No document history found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Type</th>
                          <th className="p-3 font-medium">Doc Ref</th>
                          <th className="p-3 font-medium">Client</th>
                          <th className="p-3 font-medium text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.slice(0, 5).map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 text-sm text-slate-600">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${
                                entry.docType === 'invoice' ? 'bg-blue-100 text-blue-700' : 
                                entry.docType === 'ewaybill' ? 'bg-purple-100 text-purple-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                {entry.docType}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-sm font-medium text-slate-800">{entry.documentNumber}</td>
                            <td className="p-3 text-sm text-slate-600 max-w-[150px] truncate">{entry.clientName || '-'}</td>
                            <td className="p-3 text-sm font-mono font-medium text-slate-800 text-right">
                              {entry.totalAmount ? `GH₵${entry.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Form Editor Panel */}
          {activeTab !== 'settings' && activeTab !== 'history' && activeTab !== 'admin' && activeTab !== 'dashboard' && (
            <div className="w-full lg:col-span-4 space-y-6 overflow-y-auto pr-2 pb-10">
              <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Document Details</h2>
              
              {activeTab === 'invoice' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">INVOICE NUMBER <span className="text-red-500">*</span></label>
                      <input required type="text" value={invoiceData.invoiceNumber} onChange={e => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">DATE <span className="text-red-500">*</span></label>
                      <input required type="date" value={invoiceData.date} onChange={e => setInvoiceData({...invoiceData, date: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">DUE DATE</label>
                      <input type="date" value={invoiceData.dueDate} onChange={e => setInvoiceData({...invoiceData, dueDate: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 block mb-3">CLIENT DETAILS</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">CLIENT NAME <span className="text-red-500">*</span></label>
                        <input required type="text" value={invoiceData.client.name} onChange={e => setInvoiceData({...invoiceData, client: {...invoiceData.client, name: e.target.value}})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">CLIENT ADDRESS</label>
                        <textarea value={invoiceData.client.address} onChange={e => setInvoiceData({...invoiceData, client: {...invoiceData.client, address: e.target.value}})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-20"></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[10px] font-bold text-slate-400">LINE ITEMS</h4>
                      <button
                        onClick={() => setInvoiceData({...invoiceData, items: [...invoiceData.items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0 }]})}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} /> ADD ITEM
                      </button>
                    </div>
                    <div className="space-y-3">
                      {invoiceData.items.map((item, index) => (
                        <div key={item.id || index} className="grid grid-cols-[1fr_60px_80px_auto] gap-2 items-start bg-slate-50 p-2 rounded border border-slate-200">
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={e => {
                              const newItems = [...invoiceData.items];
                              newItems[index].description = e.target.value;
                              setInvoiceData({...invoiceData, items: newItems});
                            }}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...invoiceData.items];
                              newItems[index].quantity = parseInt(e.target.value) || 0;
                              setInvoiceData({...invoiceData, items: newItems});
                            }}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white text-center"
                          />
                          <input
                            type="number"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={e => {
                              const newItems = [...invoiceData.items];
                              newItems[index].rate = parseFloat(e.target.value) || 0;
                              setInvoiceData({...invoiceData, items: newItems});
                            }}
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white text-right"
                          />
                          <button
                            onClick={() => {
                              const newItems = invoiceData.items.filter((_, i) => i !== index);
                              setInvoiceData({...invoiceData, items: newItems});
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-0.5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">TAX RATE (%)</label>
                        <input type="number" value={invoiceData.taxRate} onChange={e => setInvoiceData({...invoiceData, taxRate: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">NOTES</label>
                      <textarea value={invoiceData.notes} onChange={e => setInvoiceData({...invoiceData, notes: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none h-16"></textarea>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ewaybill' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">E-WAY BILL NO <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input required type="text" value={ewayBillData.ewayBillNo} onChange={e => setEwayBillData({...ewayBillData, ewayBillNo: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                        <button onClick={handleGenerateEWayBill} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors" title="Generate Number"><RefreshCw size={14}/></button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">DATE <span className="text-red-500">*</span></label>
                      <input required type="date" value={ewayBillData.date} onChange={e => setEwayBillData({...ewayBillData, date: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 block mb-3">TRANSPORT DETAILS</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">VEHICLE NUMBER</label>
                        <input type="text" value={ewayBillData.vehicleNumber} onChange={e => setEwayBillData({...ewayBillData, vehicleNumber: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono uppercase" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">TRANSPORTER NAME</label>
                        <input type="text" value={ewayBillData.transporterName} onChange={e => setEwayBillData({...ewayBillData, transporterName: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'receipt' && (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">RECEIPT NUMBER <span className="text-red-500">*</span></label>
                      <input required type="text" value={receiptData.receiptNumber} onChange={e => setReceiptData({...receiptData, receiptNumber: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">AMOUNT RECEIVED <span className="text-red-500">*</span></label>
                      <input required type="number" value={receiptData.amountReceived} onChange={e => setReceiptData({...receiptData, amountReceived: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">CLIENT NAME <span className="text-red-500">*</span></label>
                      <input required type="text" value={receiptData.client.name} onChange={e => setReceiptData({...receiptData, client: {...receiptData.client, name: e.target.value}})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 block mb-3">PAYMENT DETAILS</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">PAYMENT METHOD</label>
                        <select value={receiptData.paymentMethod} onChange={e => setReceiptData({...receiptData, paymentMethod: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white">
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Mobile Money">Mobile Money</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">REFERENCE #</label>
                        <input type="text" value={receiptData.paymentReference} onChange={e => setReceiptData({...receiptData, paymentReference: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </section>
            </div>
          )}

          {/* Live Preview Panel */}
          {activeTab !== 'settings' && activeTab !== 'history' && activeTab !== 'admin' && activeTab !== 'dashboard' && (
            <div className="w-full lg:col-span-8 flex justify-center overflow-y-auto no-print">
              <div className="transform scale-[0.6] sm:scale-75 lg:scale-100 origin-top">
                {activeTab === 'invoice' && <InvoiceTemplate data={currentInvoiceData} />}
                {activeTab === 'ewaybill' && <EWayBillTemplate data={currentEWayBillData} />}
                {activeTab === 'receipt' && <ReceiptTemplate data={currentReceiptData} />}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* The invisible Print layer */}
      <div className="hidden print-only">
        {activeTab === 'invoice' && <InvoiceTemplate data={currentInvoiceData} />}
        {activeTab === 'ewaybill' && <EWayBillTemplate data={currentEWayBillData} />}
        {activeTab === 'receipt' && <ReceiptTemplate data={currentReceiptData} />}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
              <TriangleAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Confirm Logout</h3>
            <p className="text-sm text-slate-500">Are you sure you want to end your secure session? You will be returned to the login screen.</p>
            <div className="flex gap-3 w-full mt-6">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors">Log Out</button>
            </div>
          </div>
        </div>
      )}

      <EmailModal 

        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
        documentType={activeTab} 
        defaultEmail={
          activeTab === 'invoice' ? invoiceData.client.email :
          activeTab === 'ewaybill' ? ewayBillData.recipient.email || '' : 
          receiptData.client.email || ''
        }
        getPdfBase64={getPdfBase64} 
      />
      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfBase64={currentPdfBase64}
      />
    </div>
  );
}

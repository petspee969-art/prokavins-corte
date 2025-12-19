
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Scissors, 
  Users, 
  Plus, 
  Search, 
  CheckCircle2, 
  Shirt,
  Tags,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  PackageCheck,
  ClipboardList,
  Archive,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  FileText,
  Filter,
  MapPin,
  Clock,
  Loader2,
  Scroll,
  Printer,
  Layers,
  PlusCircle,
  Download,
  Phone
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { StatCard } from './components/StatCard';
import { OrderModal } from './components/OrderModal';
import { ProductModal } from './components/ProductModal';
import { CutConfirmationModal } from './components/CutConfirmationModal';
import { DistributeModal } from './components/DistributeModal';
import { SeamstressModal } from './components/SeamstressModal';
import { FabricModal } from './components/FabricModal';
import { generateProductionInsights } from './services/geminiService';
import { ProductionOrder, Seamstress, OrderStatus, ProductReference, SizeDistribution, ProductionOrderItem, OrderSplit, Fabric } from './types';

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro na requisição');
  }
  return response.json();
};

const getStageIcon = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.PLANNED: return ClipboardList;
    case OrderStatus.CUTTING: return Scissors;
    case OrderStatus.SEWING: return Shirt;
    case OrderStatus.FINISHED: return CheckCircle2;
    default: return PackageCheck;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'production' | 'seamstresses' | 'products' | 'reports' | 'fabrics'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [productionStage, setProductionStage] = useState<OrderStatus>(OrderStatus.PLANNED);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [seamstresses, setSeamstresses] = useState<Seamstress[]>([]);
  const [references, setReferences] = useState<ProductReference[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSeamstressModalOpen, setIsSeamstressModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [cuttingOrder, setCuttingOrder] = useState<ProductionOrder | null>(null);
  const [distributingOrder, setDistributingOrder] = useState<ProductionOrder | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductReference | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ProductionOrder | null>(null);
  const [seamstressToEdit, setSeamstressToEdit] = useState<Seamstress | null>(null);
  const [fabricToEdit, setFabricToEdit] = useState<Fabric | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', fabric: '', seamstress: '' });
  const [fabricFilters, setFabricFilters] = useState({ name: '', color: '', minStock: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, seamstressesData, ordersData, fabricsData] = await Promise.all([
        apiFetch('products'), apiFetch('seamstresses'), apiFetch('orders'), apiFetch('fabrics')
      ]);
      if (Array.isArray(productsData)) setReferences(productsData);
      if (Array.isArray(seamstressesData)) setSeamstresses(seamstressesData);
      if (Array.isArray(ordersData)) setOrders(ordersData);
      if (Array.isArray(fabricsData)) setFabrics(fabricsData);
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setIsLoading(false); }
  };

  const nextOrderId = useMemo(() => {
    const ids = orders.map(o => parseInt(o.id)).filter(n => !isNaN(n));
    return ids.length === 0 ? '1' : (Math.max(...ids) + 1).toString();
  }, [orders]);

  const handleCreateOrder = async (newOrderData: Omit<ProductionOrder, 'updatedAt'>) => {
    try {
      const existingIndex = orders.findIndex(o => o.id === newOrderData.id);
      const timestamp = new Date().toISOString();
      if (existingIndex > -1) {
        await apiFetch(`orders/${newOrderData.id}`, { method: 'PATCH', body: JSON.stringify({ ...newOrderData, updatedAt: timestamp }) });
        setOrders(prev => prev.map(o => o.id === newOrderData.id ? { ...newOrderData, updatedAt: timestamp } as ProductionOrder : o));
      } else {
        await apiFetch('orders', { method: 'POST', body: JSON.stringify({ ...newOrderData, updatedAt: timestamp }) });
        setOrders(prev => [{ ...newOrderData, updatedAt: timestamp } as ProductionOrder, ...prev]);
      }
    } catch (error) { alert("Erro ao salvar pedido."); }
  };

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta ordem?")) {
      try {
        await apiFetch(`orders/${id}`, { method: 'DELETE' });
        setOrders(orders.filter(o => o.id !== id));
      } catch (error) { console.error("Error deleting order:", error); }
    }
  };

  const handleSaveSeamstress = async (seamstress: Omit<Seamstress, 'id'> | Seamstress) => {
    try {
      if ('id' in seamstress) {
        await apiFetch(`seamstresses/${seamstress.id}`, { method: 'PUT', body: JSON.stringify(seamstress) });
        setSeamstresses(prev => prev.map(s => s.id === seamstress.id ? seamstress as Seamstress : s));
      } else {
        const saved = await apiFetch('seamstresses', { method: 'POST', body: JSON.stringify(seamstress) });
        setSeamstresses(prev => [...prev, saved]);
      }
    } catch (error) { console.error("Error saving seamstress:", error); }
  };

  const initiateMoveToCutting = async (order: ProductionOrder) => {
    const updatedAt = new Date().toISOString();
    try {
      const missingStock: string[] = [];
      for (const item of (Array.isArray(order.items) ? order.items : [])) {
        const fabricRec = fabrics.find(f => f.name.toLowerCase() === order.fabric.toLowerCase() && f.color.toLowerCase() === item.color.toLowerCase());
        const used = Number(item.rollsUsed) || 0;
        if (!fabricRec || fabricRec.stockRolls < used) {
          missingStock.push(`${item.color}: Disponível ${fabricRec?.stockRolls || 0}, Necessário ${used}`);
        }
      }
      if (missingStock.length > 0) {
        alert(`Estoque insuficiente de tecido (${order.fabric}) para iniciar o corte:\n\n${missingStock.join('\n')}\n\nPor favor, regularize o estoque antes de prosseguir.`);
        return;
      }
      const updatedFabricList = [...fabrics];
      for (const item of (Array.isArray(order.items) ? order.items : [])) {
        const fabricRecIdx = updatedFabricList.findIndex(f => f.name.toLowerCase() === order.fabric.toLowerCase() && f.color.toLowerCase() === item.color.toLowerCase());
        if (fabricRecIdx > -1) {
          const fabricRec = updatedFabricList[fabricRecIdx];
          const used = Number(item.rollsUsed) || 0;
          const newStock = Math.max(0, fabricRec.stockRolls - used);
          await apiFetch(`fabrics/${fabricRec.id}`, { method: 'PATCH', body: JSON.stringify({ stockRolls: newStock, updatedAt }) });
          updatedFabricList[fabricRecIdx] = { ...fabricRec, stockRolls: newStock, updatedAt };
        }
      }
      const updatedOrder = await apiFetch(`orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: OrderStatus.CUTTING, updatedAt }) });
      setFabrics(updatedFabricList);
      setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
      setProductionStage(OrderStatus.CUTTING);
    } catch (error) { alert("Erro ao atualizar estoque de tecido. Tente novamente."); }
  };

  const handlePrintPlannedOrders = () => {
    const plannedOrders = orders.filter(o => o.status === OrderStatus.PLANNED);
    if (plannedOrders.length === 0) return alert("Não há pedidos planejados para imprimir.");
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    let content = `
      <html>
        <head>
          <title>Relatório Planejado - Kavin's</title>
          <style>
            body { font-family: 'Inter', sans-serif; font-size: 8pt; color: #000; margin: 10px; line-height: 1.2; }
            h1 { text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px; font-size: 12pt; margin-bottom: 10px; }
            .order-block { border: 1px solid #000; padding: 6px; margin-bottom: 8px; page-break-inside: avoid; }
            .order-header { font-weight: bold; font-size: 10pt; border-bottom: 1px solid #ccc; margin-bottom: 5px; display: flex; justify-content: space-between; }
            .order-info { font-size: 9pt; margin-bottom: 4px; }
            .items-list { margin-top: 4px; }
            .item-line { margin-bottom: 2px; display: flex; align-items: center; }
            .spacer { flex: 1; }
            .total-info { font-size: 7pt; text-align: right; margin-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Controle de Produção Planejada - Kavin's</h1>
    `;
    plannedOrders.forEach(o => {
      const fabricObj = fabrics.find(f => f.name.toLowerCase() === o.fabric.toLowerCase());
      const fabricNotes = fabricObj?.notes ? `(${fabricObj.notes})` : '';
      content += `
        <div class="order-block">
          <div class="order-header">
            <span>Ref: ${o.referenceCode} - ${o.description}</span>
            <span>#${o.id}</span>
          </div>
          <div class="order-info">
            <strong>Tecido:</strong> ${o.fabric} ${fabricNotes}
          </div>
          <div class="items-list">
      `;
      o.items.forEach(item => {
        content += `<div class="item-line">Cor: <strong>${item.color}</strong> &nbsp;&nbsp;&nbsp; Rolos: <strong>${item.rollsUsed}</strong> - <div class="spacer"></div></div>`;
      });
      content += `
          </div>
          <div class="total-info">
            Peças Estimadas: ${o.items.reduce((acc, i) => acc + i.estimatedPieces, 0)}
          </div>
        </div>
      `;
    });
    content += `</body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const dashboardMetrics = useMemo(() => {
    const planned = orders.filter(o => o.status === OrderStatus.PLANNED).length;
    const cutting = orders.filter(o => o.status === OrderStatus.CUTTING).length;
    const activeSeam = new Set(orders.flatMap(o => (o.splits || []).filter(s => s.status === OrderStatus.SEWING).map(s => s.seamstressId))).size;
    const now = new Date();
    const producedMonth = orders.reduce((acc, o) => acc + (o.splits || []).reduce((sAcc, s) => {
      if (s.status === OrderStatus.FINISHED && s.finishedAt && new Date(s.finishedAt).getMonth() === now.getMonth()) {
        return sAcc + s.items.reduce((iAcc, i) => iAcc + (i.actualPieces || 0), 0);
      }
      return sAcc;
    }, 0), 0);
    return { plannedOrdersCount: planned, activeSeamstressesCount: activeSeam, monthPiecesProduced: producedMonth, cuttingOrders: cutting };
  }, [orders]);

  const reportFilteredOrders = useMemo(() => orders.filter(o => {
    const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
    const startMatch = reportFilters.startDate ? orderDate >= reportFilters.startDate : true;
    const endMatch = reportFilters.endDate ? orderDate <= reportFilters.endDate : true;
    const fabricMatch = reportFilters.fabric ? o.fabric.toLowerCase() === reportFilters.fabric.toLowerCase() : true;
    const seamstressMatch = reportFilters.seamstress ? (o.splits || []).some(s => s.seamstressName.toLowerCase() === reportFilters.seamstress.toLowerCase()) : true;
    return startMatch && endMatch && fabricMatch && seamstressMatch;
  }), [orders, reportFilters]);

  const reportMetrics = useMemo(() => {
    const totalCut = reportFilteredOrders.reduce((acc, o) => acc + (o.items || []).reduce((iAcc, i) => iAcc + (i.actualPieces || 0), 0), 0);
    const totalSewn = reportFilteredOrders.reduce((acc, o) => acc + (o.splits || []).reduce((sAcc, s) => s.status === OrderStatus.FINISHED ? sAcc + s.items.reduce((iAcc, i) => iAcc + (i.actualPieces || 0), 0) : sAcc, 0), 0);
    const totalRolls = reportFilteredOrders.reduce((acc, o) => acc + (o.items || []).reduce((iAcc, i) => iAcc + (Number(i.rollsUsed) || 0), 0), 0);
    return { totalCut, totalSewn, totalRolls, count: reportFilteredOrders.length };
  }, [reportFilteredOrders]);

  const seamstressData = useMemo(() => {
    return seamstresses.map(s => {
      const allSplits = orders.flatMap(o => (o.splits || []).filter(split => split.seamstressId === s.id).map(split => ({...split, refCode: o.referenceCode})));
      const inProgress = allSplits.filter(sp => sp.status === OrderStatus.SEWING);
      const finished = allSplits.filter(sp => sp.status === OrderStatus.FINISHED);
      const recent = [...allSplits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
      return { ...s, inProgressCount: inProgress.length, finishedCount: finished.length, recentWorks: recent };
    });
  }, [seamstresses, orders]);

  const uniqueFabricNames = useMemo(() => Array.from(new Set(fabrics.map(f => f.name))).sort(), [fabrics]);
  const uniqueSeamstressNames = useMemo(() => Array.from(new Set(seamstresses.map(s => s.name))).sort(), [seamstresses]);

  if (isLoading) return (<div className="flex h-screen items-center justify-center bg-slate-50"><div className="text-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" /><h2 className="text-xl font-bold text-slate-700">Conectando...</h2></div></div>);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <aside className="w-64 bg-indigo-950 text-white flex-shrink-0 flex flex-col shadow-xl z-20">
        <div className="p-8"><h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Kavin's</h1><p className="text-xs text-indigo-300 mt-1 uppercase tracking-widest">Confecção & Gestão</p></div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}><LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span></button>
          <button onClick={() => setActiveTab('production')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'production' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}><Scissors size={20} /> <span className="font-medium">Produção</span></button>
          <button onClick={() => setActiveTab('fabrics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'fabrics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}><Layers size={20} /> <span className="font-medium">Estoque de Tecidos</span></button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}><FileText size={20} /> <span className="font-medium">Relatórios</span></button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}><Tags size={20} /> <span className="font-medium">Cadastros</span></button>
          <button onClick={() => setActiveTab('seamstresses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'seamstresses' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}><Users size={20} /> <span className="font-medium">Costureiras</span></button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">{activeTab === 'dashboard' && 'Visão Geral'}{activeTab === 'production' && 'Produção'}{activeTab === 'reports' && 'Relatórios'}{activeTab === 'products' && 'Catálogo'}{activeTab === 'seamstresses' && 'Costureiras'}{activeTab === 'fabrics' && 'Estoque de Tecidos'}</h2>
          <div className="flex items-center gap-4">
            {activeTab === 'production' && (<><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>{productionStage === OrderStatus.PLANNED && (<button onClick={handlePrintPlannedOrders} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-medium flex items-center gap-2 border border-slate-300"><Printer size={18} /> Imprimir PDF</button>)}<button onClick={() => { setOrderToEdit(null); setIsOrderModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg"><Plus size={18} /> Nova Ordem</button></>)}
             {activeTab === 'seamstresses' && (<button onClick={() => { setSeamstressToEdit(null); setIsSeamstressModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg"><Plus size={18} /> Nova Costureira</button>)}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (<div className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><StatCard title="Planejados" value={dashboardMetrics.plannedOrdersCount} icon={ClipboardList} color="bg-blue-500" /><StatCard title="Ativas" value={dashboardMetrics.activeSeamstressesCount} icon={Users} color="bg-pink-500" /><StatCard title="Produzido (Mês)" value={dashboardMetrics.monthPiecesProduced} icon={CalendarDays} color="bg-indigo-500" /><StatCard title="Em Corte" value={dashboardMetrics.cuttingOrders} icon={Scissors} color="bg-purple-500" /></div></div>)}

          {activeTab === 'reports' && (<div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold">Total Cortado</p><p className="text-2xl font-bold text-indigo-600">{reportMetrics.totalCut}</p></div><div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold">Total Costurado</p><p className="text-2xl font-bold text-emerald-600">{reportMetrics.totalSewn}</p></div><div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold">Total de Rolos</p><p className="text-2xl font-bold text-amber-600">{reportMetrics.totalRolls.toFixed(1)}</p></div><div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 uppercase font-bold">Registros</p><p className="text-2xl font-bold text-slate-700">{reportMetrics.count}</p></div></div><div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="flex flex-wrap gap-4 mb-6"><input type="date" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm" value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})}/><input type="date" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm" value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})}/><select className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm" value={reportFilters.fabric} onChange={e => setReportFilters({...reportFilters, fabric: e.target.value})}><option value="">Tecido</option>{uniqueFabricNames.map(f => <option key={f} value={f}>{f}</option>)}</select><select className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm" value={reportFilters.seamstress} onChange={e => setReportFilters({...reportFilters, seamstress: e.target.value})}><option value="">Costureira</option>{uniqueSeamstressNames.map(s => <option key={s} value={s}>{s}</option>)}</select><button onClick={() => setReportFilters({startDate: '', endDate: '', fabric: '', seamstress: ''})} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button></div><div className="overflow-x-auto"><table className="w-full text-left text-xs uppercase font-bold text-slate-500 border-collapse"><thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-3">ID</th><th className="p-3">Data Pedido</th><th className="p-3">Ref / Descrição</th><th className="p-3">Status</th><th className="p-3">Qtd Corte</th><th className="p-3">Data Entrega</th><th className="p-3">Observações</th><th className="p-3">Histórico Costura</th></tr></thead><tbody className="divide-y divide-slate-100 font-normal text-slate-700 normal-case">{reportFilteredOrders.map(o => (<tr key={o.id} className="hover:bg-slate-50"><td className="p-3 font-mono font-bold">#{o.id}</td><td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td><td className="p-3"><strong>{o.referenceCode}</strong><br/>{o.description}</td><td className="p-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] uppercase font-bold">{o.status}</span></td><td className="p-3 font-bold">{o.items.reduce((acc, i) => acc + (i.actualPieces || 0), 0)}</td><td className="p-3">{o.finishedAt ? new Date(o.finishedAt).toLocaleDateString() : '-'}</td><td className="p-3 text-[10px]">{o.notes || '-'}</td><td className="p-3 text-[10px]">{(o.splits || []).map(s => `${s.seamstressName} (${s.status === OrderStatus.FINISHED ? 'FEITO' : 'FAZENDO'})`).join(', ') || '-'}</td></tr>))}</tbody></table></div></div></div>)}

          {activeTab === 'seamstresses' && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{seamstressData.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col relative group">
              <button onClick={() => { setSeamstressToEdit(s); setIsSeamstressModalOpen(true); }} className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 size={18} /></button>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">{s.name.charAt(0)}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">{s.name}</h3>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="font-medium text-indigo-600">{s.specialty}</p>
                    <p className="flex items-center gap-1"><Phone size={10}/> {s.phone}</p>
                    <p className="flex items-center gap-1"><MapPin size={10}/> {s.city || 'Cidade não inf.'}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 text-center"><p className="text-[10px] text-amber-700 font-bold uppercase">Em Andamento</p><p className="text-xl font-bold text-amber-800">{s.inProgressCount}</p></div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 text-center"><p className="text-[10px] text-emerald-700 font-bold uppercase">Finalizados</p><p className="text-xl font-bold text-emerald-800">{s.finishedCount}</p></div>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-50"><p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Trabalhos Recentes</p><div className="space-y-2">{s.recentWorks.map((w, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs bg-slate-50 p-2 rounded border border-slate-100"><div className="flex-1"><strong>{w.refCode}</strong><br/><span className="text-slate-500">{w.items.map(i => i.color).join(', ')}</span></div><div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${w.status === OrderStatus.FINISHED ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{w.status === OrderStatus.FINISHED ? 'Feito' : 'Fazendo'}</div></div>
              ))}</div></div>
            </div>
          ))}</div>)}

          {activeTab === 'production' && (<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]"><div className="flex p-2 bg-slate-100/50 border-b border-slate-200">{(Object.values(OrderStatus) as OrderStatus[]).map((status) => { const Icon = getStageIcon(status); const isActive = productionStage === status; const count = orders.filter(o => o.status === status).length; return (<button key={status} onClick={() => setProductionStage(status)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all relative ${isActive ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}><Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'}/>{status}{count > 0 && <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}</button>); })}</div><div className="overflow-x-auto flex-1"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="p-4 w-10"></th><th className="p-4">Pedido / Data</th><th className="p-4">Ref / Descrição</th><th className="p-4">Tecido</th><th className="p-4 text-center">Peças</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm text-slate-700">{reportFilteredOrders.filter(o => o.status === productionStage).map(order => { const isExpanded = expandedOrders.includes(order.id); return (<React.Fragment key={order.id}><tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => setExpandedOrders(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}><td className="p-4 text-center"><button className="text-slate-400">{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></td><td className="p-4"><strong>#{order.id}</strong><br/><span className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span></td><td className="p-4"><strong>{order.referenceCode}</strong><br/>{order.description}</td><td className="p-4">{order.fabric}</td><td className="p-4 text-center"><strong>{order.items.reduce((acc, i) => acc + (productionStage === OrderStatus.PLANNED ? i.estimatedPieces : i.actualPieces), 0)}</strong></td><td className="p-4 text-right" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-2">{order.status === OrderStatus.PLANNED && (<><button onClick={() => { setOrderToEdit(order); setIsOrderModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={16} /></button><button onClick={() => initiateMoveToCutting(order)} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">Iniciar</button><button onClick={() => handleDeleteOrder(order.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button></>)}</div></td></tr></React.Fragment>); })}</tbody></table></div></div>)}
        </div>
      </main>

      <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} onSave={handleCreateOrder} references={references} orderToEdit={orderToEdit} suggestedId={nextOrderId}/>
      <SeamstressModal isOpen={isSeamstressModalOpen} onClose={() => setIsSeamstressModalOpen(false)} onSave={handleSaveSeamstress} seamstressToEdit={seamstressToEdit}/>
      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={fetchData} productToEdit={editingProduct} fabrics={fabrics}/>
      <FabricModal isOpen={isFabricModalOpen} onClose={() => setIsFabricModalOpen(false)} onSave={fetchData} fabricToEdit={fabricToEdit}/>
    </div>
  );
}

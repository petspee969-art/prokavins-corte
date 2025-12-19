
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
  ChevronDown,
  ChevronUp,
  Edit2,
  PackageCheck,
  ClipboardList,
  CalendarDays,
  FileText,
  MapPin,
  Loader2,
  Printer,
  Layers,
  Phone,
  Menu,
  X,
  Lock,
  User
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

import { StatCard } from './components/StatCard';
import { OrderModal } from './components/OrderModal';
import { ProductModal } from './components/ProductModal';
import { CutConfirmationModal } from './components/CutConfirmationModal';
import { DistributeModal } from './components/DistributeModal';
import { SeamstressModal } from './components/SeamstressModal';
import { FabricModal } from './components/FabricModal';
import { ProductionOrder, Seamstress, OrderStatus, ProductReference, ProductionOrderItem, OrderSplit, Fabric } from './types';

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
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'production' | 'seamstresses' | 'products' | 'reports' | 'fabrics'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [productionStage, setProductionStage] = useState<OrderStatus>(OrderStatus.PLANNED);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [seamstresses, setSeamstresses] = useState<Seamstress[]>([]);
  const [references, setReferences] = useState<ProductReference[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSeamstressModalOpen, setIsSeamstressModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [fabricEntryMode, setFabricEntryMode] = useState(false);
  
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  
  const [cuttingOrder, setCuttingOrder] = useState<ProductionOrder | null>(null);
  const [distributingOrder, setDistributingOrder] = useState<ProductionOrder | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductReference | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ProductionOrder | null>(null);
  const [seamstressToEdit, setSeamstressToEdit] = useState<Seamstress | null>(null);
  const [fabricToEdit, setFabricToEdit] = useState<Fabric | null>(null);
  
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    fabric: '',
    seamstress: '',
    reference: ''
  });

  const [fabricFilters, setFabricFilters] = useState({
    name: '',
    color: '',
    minStock: ''
  });

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, seamstressesData, ordersData, fabricsData] = await Promise.all([
        apiFetch('products').catch(() => []),
        apiFetch('seamstresses').catch(() => []),
        apiFetch('orders').catch(() => []),
        apiFetch('fabrics').catch(() => [])
      ]);

      setReferences(Array.isArray(productsData) ? productsData : []);
      setSeamstresses(Array.isArray(seamstressesData) ? seamstressesData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setFabrics(Array.isArray(fabricsData) ? fabricsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'kavins' && loginForm.password === 'kavins2026') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const nextOrderId = useMemo(() => {
    const ids = orders.map(o => parseInt(o.id)).filter(n => !isNaN(n));
    if (ids.length === 0) return '1';
    return (Math.max(...ids) + 1).toString();
  }, [orders]);

  const dashboardMetrics = useMemo(() => {
    const plannedCount = orders.filter(o => o.status === OrderStatus.PLANNED).length;
    const cuttingCount = orders.filter(o => o.status === OrderStatus.CUTTING).length;
    const sewingCount = orders.filter(o => o.status === OrderStatus.SEWING).length;
    
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dateIso = d.toISOString().split('T')[0];
      const count = orders.reduce((acc, o) => acc + (o.splits || []).reduce((sAcc, s) => (s.finishedAt && s.finishedAt.startsWith(dateIso)) ? sAcc + s.items.reduce((iAcc, i) => iAcc + (i.actualPieces || 0), 0) : sAcc, 0), 0);
      return { name: dateStr, pecas: count };
    });

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthStr = d.toLocaleDateString('pt-BR', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = orders.reduce((acc, o) => acc + (o.splits || []).reduce((sAcc, s) => {
        if (s.finishedAt) {
          const fDate = new Date(s.finishedAt);
          if (fDate.getMonth() === month && fDate.getFullYear() === year) return sAcc + s.items.reduce((iAcc, i) => iAcc + (i.actualPieces || 0), 0);
        }
        return sAcc;
      }, 0), 0);
      return { name: monthStr, pecas: count };
    });

    return { plannedOrdersCount: plannedCount, cuttingOrders: cuttingCount, sewingOrdersCount: sewingCount, weeklyData, monthlyData };
  }, [orders]);

  const handleCreateOrder = async (newOrderData: Omit<ProductionOrder, 'updatedAt'>) => {
    try {
        const timestamp = new Date().toISOString();
        const payload = { 
          ...newOrderData, 
          updatedAt: timestamp,
          activeCuttingItems: Array.isArray(newOrderData.activeCuttingItems) ? newOrderData.activeCuttingItems : [],
          splits: Array.isArray(newOrderData.splits) ? newOrderData.splits : []
        };

        const existing = orders.find(o => o.id === newOrderData.id);
        if (existing) {
            await apiFetch(`orders/${newOrderData.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            setOrders(prev => prev.map(o => o.id === newOrderData.id ? payload as ProductionOrder : o));
        } else {
            await apiFetch('orders', { method: 'POST', body: JSON.stringify(payload) });
            setOrders(prev => [payload as ProductionOrder, ...prev]);
        }
    } catch (error) {
        alert("Erro ao salvar pedido: " + (error as Error).message);
    }
  };

  const handleSaveProduct = async (product: Omit<ProductReference, 'id'> | ProductReference) => {
    try {
      if ('id' in product) {
        await apiFetch(`products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) });
      } else {
        const id = Date.now().toString();
        await apiFetch('products', { method: 'POST', body: JSON.stringify({ ...product, id }) });
      }
      fetchData();
    } catch (error) {
      alert("Erro ao salvar produto: " + (error as Error).message);
    }
  };

  const handleSaveSeamstress = async (seamstress: Omit<Seamstress, 'id'> | Seamstress) => {
      try {
          if ('id' in seamstress) {
              await apiFetch(`seamstresses/${seamstress.id}`, { method: 'PUT', body: JSON.stringify(seamstress) });
              setSeamstresses(prev => prev.map(s => s.id === seamstress.id ? seamstress as Seamstress : s));
          } else {
              const id = Date.now().toString();
              const saved = await apiFetch('seamstresses', { method: 'POST', body: JSON.stringify({...seamstress, id}) });
              setSeamstresses(prev => [...prev, saved]);
          }
      } catch (error) { console.error("Error saving seamstress:", error); }
  };

  const handleSaveFabric = async (f: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt'> | Fabric) => {
    try {
      if ('id' in f) {
        await apiFetch(`fabrics/${f.id}`, { method: 'PATCH', body: JSON.stringify(f) });
      } else {
        const id = Date.now().toString();
        await apiFetch('fabrics', { method: 'POST', body: JSON.stringify({ ...f, id }) });
      }
      fetchData();
      setIsFabricModalOpen(false);
    } catch (error) {
      alert("Erro ao salvar tecido.");
    }
  };

  const handleDeleteOrder = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta ordem?")) {
          try {
              await apiFetch(`orders/${id}`, { method: 'DELETE' });
              setOrders(orders.filter(o => o.id !== id));
          } catch (error) { console.error("Error deleting order:", error); }
      }
  };

  const initiateMoveToCutting = (order: ProductionOrder) => setCuttingOrder(order);

  const handleConfirmCut = async (updatedItems: ProductionOrderItem[], activeItems: ProductionOrderItem[]) => {
    if (!cuttingOrder) return;
    try {
      const timestamp = new Date().toISOString();
      const updatedOrder = { ...cuttingOrder, items: updatedItems, activeCuttingItems: activeItems, status: OrderStatus.CUTTING, updatedAt: timestamp };
      await apiFetch(`orders/${cuttingOrder.id}`, { method: 'PATCH', body: JSON.stringify(updatedOrder) });
      setOrders(prev => prev.map(o => o.id === cuttingOrder.id ? updatedOrder : o));
      setProductionStage(OrderStatus.CUTTING);
      setCuttingOrder(null);
    } catch (error) { alert("Erro ao confirmar corte."); }
  };

  const initiateDistribution = (order: ProductionOrder) => setDistributingOrder(order);

  const handleDistribute = async (originalOrderId: string, distributionMap: {color: string, sizes: any}[], seamstressId: string) => {
    const order = orders.find(o => o.id === originalOrderId);
    if (!order) return;
    try {
      const seamstress = seamstresses.find(s => s.id === seamstressId);
      const timestamp = new Date().toISOString();
      const newSplit: OrderSplit = {
        id: Date.now().toString(),
        seamstressId,
        seamstressName: seamstress?.name || 'Unknown',
        status: OrderStatus.SEWING,
        items: distributionMap.map(d => ({
            color: d.color,
            colorHex: order.items.find(i => i.color === d.color)?.colorHex,
            rollsUsed: 0,
            piecesPerSizeEst: 0,
            estimatedPieces: 0,
            actualPieces: Object.values(d.sizes).reduce((acc: number, curr: any) => acc + (curr || 0), 0) as number,
            sizes: d.sizes
        })),
        createdAt: timestamp
      };
      const newActiveItems = order.activeCuttingItems.map(item => {
          const sent = distributionMap.find(d => d.color === item.color);
          if (!sent) return item;
          const updatedSizes = { ...item.sizes };
          Object.keys(sent.sizes).forEach(size => { updatedSizes[size] = Math.max(0, (updatedSizes[size] || 0) - (sent.sizes[size] || 0)); });
          return { ...item, sizes: updatedSizes, actualPieces: Object.values(updatedSizes).reduce((acc: number, curr: any) => acc + (curr || 0), 0) as number };
      });
      const updatedOrder: ProductionOrder = { ...order, activeCuttingItems: newActiveItems, splits: [...(order.splits || []), newSplit], status: OrderStatus.SEWING, updatedAt: timestamp };
      await apiFetch(`orders/${order.id}`, { method: 'PATCH', body: JSON.stringify(updatedOrder) });
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      setProductionStage(OrderStatus.SEWING);
    } catch (error) { alert("Erro ao distribuir pedido."); }
  };

  const handleFinishSplit = async (orderId: string, splitId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      if (!window.confirm("Confirmar finalização deste pacote?")) return;
      try {
          const timestamp = new Date().toISOString();
          const updatedSplits = (order.splits || []).map(s => (s.id === splitId) ? { ...s, status: OrderStatus.FINISHED, finishedAt: timestamp } : s);
          const allFinished = updatedSplits.every(s => s.status === OrderStatus.FINISHED) && (order.activeCuttingItems || []).every(i => i.actualPieces === 0);
          const updatedOrder: ProductionOrder = { ...order, splits: updatedSplits, status: allFinished ? OrderStatus.FINISHED : order.status, finishedAt: allFinished ? timestamp : order.finishedAt, updatedAt: timestamp };
          await apiFetch(`orders/${order.id}`, { method: 'PATCH', body: JSON.stringify(updatedOrder) });
          setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      } catch (error) { alert("Erro ao finalizar pacote."); }
  };

  const uniqueFabricNames = useMemo(() => Array.from(new Set(fabrics.map(f => f.name))).sort(), [fabrics]);
  const uniqueSeamstressNames = useMemo(() => Array.from(new Set(seamstresses.map(s => s.name))).sort(), [seamstresses]);

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-indigo-950 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-indigo-900 mb-2">Kavin's</h1>
            <p className="text-slate-500 font-medium">Gestão de Produção</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Usuário</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                <input 
                  autoFocus
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  placeholder="Seu usuário"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95">
              ENTRAR NO SISTEMA
            </button>
          </form>
          <p className="text-center mt-8 text-[10px] text-slate-400 uppercase font-bold">Kavin's Textil © 2024</p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 text-center">
      <div className="animate-pulse">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700 uppercase tracking-widest">Carregando...</h2>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col shadow-xl transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between">
          <div><h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Kavin's</h1><p className="text-[10px] text-indigo-300 mt-1 uppercase tracking-widest font-bold">Produção</p></div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-indigo-300 hover:text-white"><X size={24} /></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/10'}`}><LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span></button>
          <button onClick={() => {setActiveTab('production'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'production' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/10'}`}><Scissors size={20} /> <span className="font-medium">Produção</span></button>
          <button onClick={() => {setActiveTab('fabrics'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'fabrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/10'}`}><Layers size={20} /> <span className="font-medium">Estoque de Tecidos</span></button>
          <button onClick={() => {setActiveTab('reports'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/10'}`}><FileText size={20} /> <span className="font-medium">Relatórios</span></button>
          <button onClick={() => {setActiveTab('products'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/10'}`}><Tags size={20} /> <span className="font-medium">Cadastros</span></button>
          <button onClick={() => {setActiveTab('seamstresses'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'seamstresses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/10'}`}><Users size={20} /> <span className="font-medium">Costureiras</span></button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-300 hover:bg-white/5 transition-all text-sm font-bold">
            <X size={18} /> SAIR
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b border-slate-200 px-4 lg:px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><Menu size={20} /></button>
            <h2 className="text-lg lg:text-2xl font-bold text-slate-800 uppercase tracking-tight">{activeTab === 'dashboard' && 'Visão Geral'}{activeTab === 'production' && 'Produção'}{activeTab === 'reports' && 'Relatórios'}{activeTab === 'products' && 'Produtos'}{activeTab === 'seamstresses' && 'Costureiras'}{activeTab === 'fabrics' && 'Estoque'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'production' && (<><button onClick={() => { setOrderToEdit(null); setIsOrderModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg active:scale-95 text-sm"><Plus size={18} /> <span className="hidden sm:inline">Nova Ordem</span></button></>)}
            {activeTab === 'products' && (<button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg active:scale-95 text-sm"><Plus size={18} /> <span className="hidden sm:inline">Novo Produto</span></button>)}
            {activeTab === 'seamstresses' && (<button onClick={() => { setSeamstressToEdit(null); setIsSeamstressModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg active:scale-95 text-sm"><Plus size={18} /> <span className="hidden sm:inline">Nova Costureira</span></button>)}
            {activeTab === 'fabrics' && (<button onClick={() => { setFabricToEdit(null); setFabricEntryMode(false); setIsFabricModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg active:scale-95 text-sm"><Plus size={18} /> <span className="hidden sm:inline">Novo Cadastro</span></button>)}
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Planejados" value={dashboardMetrics.plannedOrdersCount} icon={ClipboardList} color="bg-blue-500" />
                <StatCard title="Em Corte" value={dashboardMetrics.cuttingOrders} icon={Scissors} color="bg-purple-500" />
                <StatCard title="Costurando" value={dashboardMetrics.sewingOrdersCount} icon={Shirt} color="bg-pink-500" />
                <StatCard title="Total de Ordens" value={orders.length} icon={Layers} color="bg-indigo-500" />
              </div>
            </div>
          )}

          {activeTab === 'fabrics' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Filtrar Tecido</label>
                  <input type="text" placeholder="Nome do tecido..." className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" value={fabricFilters.name} onChange={e => setFabricFilters({...fabricFilters, name: e.target.value})}/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {fabrics.filter(f => f.name.toLowerCase().includes(fabricFilters.name.toLowerCase())).map(fabric => (
                  <div key={fabric.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        title="Adicionar entrada de tecido"
                        onClick={() => { setFabricToEdit(fabric); setFabricEntryMode(true); setIsFabricModalOpen(true); }} 
                        className="text-blue-600 hover:bg-blue-50 p-1.5 bg-white rounded-lg shadow-sm border border-slate-200"
                      >
                        <Plus size={16}/>
                      </button>
                      <button 
                        title="Editar cadastro"
                        onClick={() => { setFabricToEdit(fabric); setFabricEntryMode(false); setIsFabricModalOpen(true); }} 
                        className="text-slate-400 hover:text-indigo-600 p-1.5 bg-white rounded-lg shadow-sm border border-slate-200"
                      >
                        <Edit2 size={16}/>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full border border-slate-100 shadow-inner" style={{backgroundColor: fabric.colorHex}}></div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{fabric.name}</h3>
                        <p className="text-[10px] text-slate-500">{fabric.color}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Estoque Disponível</p>
                      <p className={`text-2xl font-bold ${fabric.stockRolls < 3 ? 'text-red-500' : 'text-indigo-600'}`}>{fabric.stockRolls} <span className="text-xs font-normal text-slate-400 uppercase tracking-tighter">rolos</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'production' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px] animate-in fade-in duration-500">
              <div className="flex p-1 bg-slate-100 border-b border-slate-200 overflow-x-auto no-scrollbar">
                {(Object.values(OrderStatus) as OrderStatus[]).map((status) => { 
                  const Icon = getStageIcon(status); 
                  const isActive = productionStage === status; 
                  const count = orders.filter(o => o.status === status).length; 
                  return (
                    <button key={status} onClick={() => setProductionStage(status)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-xs font-bold transition-all relative whitespace-nowrap ${isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'}/>
                      {status}
                      {count > 0 && <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
                    </button>
                  ); 
                })}
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead><tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-semibold"><th className="p-4 w-10"></th><th className="p-4">Pedido</th><th className="p-4">Ref / Descrição</th><th className="p-4">Tecido</th><th className="p-4 text-center">Peças</th><th className="p-4 text-right">Ações</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">{orders.filter(o => o.status === productionStage).map(order => { 
                      const isExpanded = expandedOrders.includes(order.id); 
                      return (
                        <React.Fragment key={order.id}>
                          <tr className={`hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => setExpandedOrders(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}><td className="p-4 text-center"><button className="text-slate-400">{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></td><td className="p-4"><strong>#{order.id}</strong><br/><span className="text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span></td><td className="p-4"><strong>{order.referenceCode}</strong><br/><span className="text-[10px] text-slate-400">{order.description}</span></td><td className="p-4 text-xs">{order.fabric}</td><td className="p-4 text-center"><strong>{order.items.reduce((acc, i) => acc + (productionStage === OrderStatus.PLANNED ? i.estimatedPieces : (i.actualPieces || 0)), 0)}</strong></td><td className="p-4 text-right" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-2">{order.status === OrderStatus.PLANNED && (<><button onClick={() => { setOrderToEdit(order); setIsOrderModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={16} /></button><button onClick={() => initiateMoveToCutting(order)} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-md hover:bg-indigo-700">Iniciar</button><button onClick={() => handleDeleteOrder(order.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button></>)}{order.status === OrderStatus.CUTTING && (<button onClick={() => initiateDistribution(order)} className="bg-amber-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-md hover:bg-amber-600">Distribuir</button>)}</div></td></tr>
                        </React.Fragment>
                      ); 
                    })}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} onSave={handleCreateOrder} references={references} orderToEdit={orderToEdit} suggestedId={nextOrderId}/>
      <SeamstressModal isOpen={isSeamstressModalOpen} onClose={() => setIsSeamstressModalOpen(false)} onSave={handleSaveSeamstress} seamstressToEdit={seamstressToEdit}/>
      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={handleSaveProduct} productToEdit={editingProduct} fabrics={fabrics}/>
      <FabricModal 
          isOpen={isFabricModalOpen} 
          onClose={() => setIsFabricModalOpen(false)} 
          entryMode={fabricEntryMode}
          onSave={handleSaveFabric} 
          fabricToEdit={fabricToEdit}
      />
      <CutConfirmationModal isOpen={!!cuttingOrder} onClose={() => setCuttingOrder(null)} order={cuttingOrder} onConfirm={handleConfirmCut} />
      <DistributeModal isOpen={!!distributingOrder} onClose={() => setDistributingOrder(null)} order={distributingOrder} seamstresses={seamstresses} onDistribute={handleDistribute} />
      
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-300"></div>}
    </div>
  );
}


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
  PlusCircle
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

  const [fabricFilters, setFabricFilters] = useState({
    name: '',
    color: '',
    minStock: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, seamstressesData, ordersData, fabricsData] = await Promise.all([
        apiFetch('products'),
        apiFetch('seamstresses'),
        apiFetch('orders'),
        apiFetch('fabrics')
      ]);

      if (Array.isArray(productsData)) setReferences(productsData);
      if (Array.isArray(seamstressesData)) setSeamstresses(seamstressesData);
      if (Array.isArray(ordersData)) setOrders(ordersData);
      if (Array.isArray(fabricsData)) setFabrics(fabricsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextOrderId = useMemo(() => {
    const ids = orders.map(o => parseInt(o.id)).filter(n => !isNaN(n));
    if (ids.length === 0) return '1';
    return (Math.max(...ids) + 1).toString();
  }, [orders]);

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalOrders = orders.length;
    const plannedOrdersCount = orders.filter(o => o.status === OrderStatus.PLANNED).length;
    const cuttingOrders = orders.filter(o => o.status === OrderStatus.CUTTING).length;
    const sewingPackets = orders.reduce((acc, o) => acc + (Array.isArray(o.splits) ? o.splits.filter(s => s.status === OrderStatus.SEWING).length : 0), 0);
    
    const activeSeamstressesCount = new Set(
        orders.flatMap(o => (Array.isArray(o.splits) ? o.splits : []).filter(s => s.status === OrderStatus.SEWING).map(s => s.seamstressId))
    ).size;

    let totalPiecesProduced = 0;
    let monthPiecesProduced = 0;

    orders.forEach(order => {
        (Array.isArray(order.splits) ? order.splits : []).forEach(split => {
            if (split.status === OrderStatus.FINISHED) {
                const pieces = Array.isArray(split.items) ? split.items.reduce((acc, i) => acc + (i.actualPieces || 0), 0) : 0;
                totalPiecesProduced += pieces;

                if (split.finishedAt) {
                    const finishedDate = new Date(split.finishedAt);
                    if (finishedDate.getMonth() === currentMonth && finishedDate.getFullYear() === currentYear) {
                        monthPiecesProduced += pieces;
                    }
                }
            }
        });
    });

    const seamstressStats = seamstresses.map(s => {
        let produced = 0;
        let activePackets = 0;

        orders.forEach(o => {
            (Array.isArray(o.splits) ? o.splits : []).forEach(split => {
                if (split.seamstressId === s.id) {
                    if (split.status === OrderStatus.FINISHED) {
                        produced += Array.isArray(split.items) ? split.items.reduce((acc, i) => acc + (i.actualPieces || 0), 0) : 0;
                    } else if (split.status === OrderStatus.SEWING) {
                        activePackets++;
                    }
                }
            });
        });

        return {
            ...s,
            produced,
            activePackets,
            isIdle: s.active && activePackets === 0
        };
    }).sort((a, b) => b.produced - a.produced);

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayKey = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        let value = 0;
        orders.forEach(o => {
            (Array.isArray(o.splits) ? o.splits : []).forEach(s => {
                if (s.status === OrderStatus.FINISHED && s.finishedAt) {
                    const fDate = new Date(s.finishedAt);
                    if (fDate.toDateString() === d.toDateString()) {
                        value += Array.isArray(s.items) ? s.items.reduce((acc, item) => acc + (item.actualPieces || 0), 0) : 0;
                    }
                }
            });
        });
        weeklyData.push({ name: dayKey, peças: value });
    }

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' });
        const mIdx = d.getMonth();
        const yIdx = d.getFullYear();

        let value = 0;
        orders.forEach(o => {
            (Array.isArray(o.splits) ? o.splits : []).forEach(s => {
                if (s.status === OrderStatus.FINISHED && s.finishedAt) {
                    const fDate = new Date(s.finishedAt);
                    if (fDate.getMonth() === mIdx && fDate.getFullYear() === yIdx) {
                        value += Array.isArray(s.items) ? s.items.reduce((acc, item) => acc + (item.actualPieces || 0), 0) : 0;
                    }
                }
            });
        });
        monthlyData.push({ name: monthKey, peças: value });
    }

    return {
        totalOrders,
        cuttingOrders,
        sewingPackets,
        plannedOrdersCount,
        activeSeamstressesCount,
        totalPiecesProduced,
        monthPiecesProduced,
        seamstressStats,
        weeklyData,
        monthlyData,
        idleSeamstresses: seamstressStats.filter(s => s.isIdle),
        activeSeamstressesList: seamstressStats.filter(s => !s.isIdle && s.activePackets > 0)
    };
  }, [orders, seamstresses]);

  const stageCounts = useMemo(() => {
      return {
          [OrderStatus.PLANNED]: orders.filter(o => o.status === OrderStatus.PLANNED).length,
          [OrderStatus.CUTTING]: orders.filter(o => o.status === OrderStatus.CUTTING).length,
          [OrderStatus.SEWING]: orders.filter(o => o.status === OrderStatus.SEWING).length,
          [OrderStatus.FINISHED]: orders.filter(o => o.status === OrderStatus.FINISHED).length,
      }
  }, [orders]);

  const handleCreateOrder = async (newOrderData: Omit<ProductionOrder, 'updatedAt'>) => {
    try {
        const existingIndex = orders.findIndex(o => o.id === newOrderData.id);
        const timestamp = new Date().toISOString();

        if (existingIndex > -1) {
            await apiFetch(`orders/${newOrderData.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ ...newOrderData, updatedAt: timestamp })
            });
            setOrders(prev => prev.map(o => o.id === newOrderData.id ? { ...newOrderData, updatedAt: timestamp } as ProductionOrder : o));
        } else {
            await apiFetch('orders', {
                method: 'POST',
                body: JSON.stringify({ ...newOrderData, updatedAt: timestamp })
            });
            setOrders(prev => [{ ...newOrderData, updatedAt: timestamp } as ProductionOrder, ...prev]);
        }
    } catch (error) {
        console.error("Error saving order:", error);
        alert("Erro ao salvar pedido.");
    }
  };

  const handleDeleteOrder = async (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta ordem?")) {
          try {
              await apiFetch(`orders/${id}`, { method: 'DELETE' });
              setOrders(orders.filter(o => o.id !== id));
          } catch (error) {
              console.error("Error deleting order:", error);
          }
      }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
        try {
            await apiFetch(`products/${id}`, { method: 'DELETE' });
            setReferences(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    }
  };

  const handleSaveProduct = async (product: Omit<ProductReference, 'id'> | ProductReference) => {
    try {
        if ('id' in product) {
            await apiFetch(`products/${product.id}`, {
                method: 'PUT',
                body: JSON.stringify(product)
            });
            setReferences(prev => prev.map(r => r.id === product.id ? product as ProductReference : r));
        } else {
            const savedProduct = await apiFetch('products', {
                method: 'POST',
                body: JSON.stringify(product)
            });
            setReferences(prev => [...prev, savedProduct]);
        }
    } catch (error: any) {
        console.error("Error saving product:", error);
        alert(`Erro ao salvar produto: ${error.message}`);
    }
  };

  const handleSaveSeamstress = async (seamstress: Omit<Seamstress, 'id'> | Seamstress) => {
      try {
          if ('id' in seamstress) {
              await apiFetch(`seamstresses/${seamstress.id}`, {
                  method: 'PUT',
                  body: JSON.stringify(seamstress)
              });
              setSeamstresses(prev => prev.map(s => s.id === seamstress.id ? seamstress as Seamstress : s));
          } else {
              const saved = await apiFetch('seamstresses', {
                  method: 'POST',
                  body: JSON.stringify(seamstress)
              });
              setSeamstresses(prev => [...prev, saved]);
          }
      } catch (error) {
          console.error("Error saving seamstress:", error);
      }
  };

  const handleSaveFabric = async (fabric: Omit<Fabric, 'id' | 'createdAt' | 'updatedAt'> | Fabric) => {
    try {
        const timestamp = new Date().toISOString();
        if ('id' in fabric) {
            const updated = await apiFetch(`fabrics/${fabric.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ ...fabric, updatedAt: timestamp })
            });
            setFabrics(prev => prev.map(f => f.id === fabric.id ? updated : f));
        } else {
            const saved = await apiFetch('fabrics', {
                method: 'POST',
                body: JSON.stringify({ ...fabric, createdAt: timestamp, updatedAt: timestamp })
            });
            setFabrics(prev => [...prev, saved]);
        }
    } catch (error: any) {
        console.error("Error saving fabric:", error);
        alert("Erro ao salvar tecido no banco de dados.");
    }
  };

  const handleQuickStockAdd = async (fabric: Fabric) => {
      const input = window.prompt(`Adicionar estoque para ${fabric.name} - ${fabric.color}.\n\nQuantos rolos entraram?`, '0');
      if (input === null) return;
      
      const amountToAdd = parseFloat(input.replace(',', '.'));
      if (isNaN(amountToAdd) || amountToAdd <= 0) return;

      const newStock = parseFloat((fabric.stockRolls + amountToAdd).toFixed(2));
      const updatedAt = new Date().toISOString();

      try {
          await apiFetch(`fabrics/${fabric.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ stockRolls: newStock, updatedAt })
          });
          setFabrics(prev => prev.map(f => f.id === fabric.id ? { ...f, stockRolls: newStock, updatedAt } : f));
      } catch (error) {
          console.error("Error adding stock:", error);
      }
  };

  const initiateMoveToCutting = async (order: ProductionOrder) => {
    const updatedAt = new Date().toISOString();
    try {
        const updatedFabricList = [...fabrics];
        
        for (const item of (Array.isArray(order.items) ? order.items : [])) {
             const fabricRecIdx = updatedFabricList.findIndex(f => f.name.toLowerCase() === order.fabric.toLowerCase() && f.color.toLowerCase() === item.color.toLowerCase());
             if (fabricRecIdx > -1) {
                 const fabricRec = updatedFabricList[fabricRecIdx];
                 const used = Number(item.rollsUsed) || 0;
                 const newStock = Math.max(0, fabricRec.stockRolls - used);
                 
                 await apiFetch(`fabrics/${fabricRec.id}`, {
                     method: 'PATCH',
                     body: JSON.stringify({ stockRolls: newStock, updatedAt })
                 });
                 
                 updatedFabricList[fabricRecIdx] = { ...fabricRec, stockRolls: newStock, updatedAt };
             }
        }
        
        const updatedOrder = await apiFetch(`orders/${order.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: OrderStatus.CUTTING, updatedAt })
        });

        setFabrics(updatedFabricList);
        setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
        setProductionStage(OrderStatus.CUTTING);
    } catch (error) {
        console.error("Error moving to cutting:", error);
        alert("Erro ao atualizar estoque de tecido. Verifique se o tecido e cor estão cadastrados corretamente.");
    }
  };
  
  const initiateConfirmCut = (order: ProductionOrder) => {
    setCuttingOrder(order);
  }

  const confirmCut = async (updatedTotalItems: ProductionOrderItem[], activeItems: ProductionOrderItem[]) => {
    if (!cuttingOrder) return;
    const updatedAt = new Date().toISOString();
    
    try {
        const updated = await apiFetch(`orders/${cuttingOrder.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                items: updatedTotalItems,
                activeCuttingItems: activeItems,
                updatedAt
            })
        });

        setOrders(orders.map(o => o.id === cuttingOrder.id ? updated : o));
        setCuttingOrder(null);
    } catch (error) {
        console.error("Error confirming cut:", error);
    }
  };

  const initiateDistribute = (order: ProductionOrder) => {
    setDistributingOrder(order);
  };

  const handleDistribute = async (originalOrderId: string, distributionMap: {color: string, sizes: SizeDistribution}[], seamstressId: string) => {
    const originalOrder = orders.find(o => o.id === originalOrderId);
    if (!originalOrder) return;
    const seamstress = seamstresses.find(s => s.id === seamstressId);
    if (!seamstress) return;

    const splitItems: ProductionOrderItem[] = [];
    const updatedActiveItems = Array.isArray(originalOrder.activeCuttingItems) ? [...originalOrder.activeCuttingItems] : [];

    distributionMap.forEach(dist => {
        const totalToSend = Object.values(dist.sizes).reduce((acc: number, curr) => acc + (Number(curr) || 0), 0);
        const originalItemRef = (Array.isArray(originalOrder.items) ? originalOrder.items : []).find(i => i.color === dist.color);

        splitItems.push({
            color: dist.color,
            colorHex: originalItemRef?.colorHex,
            rollsUsed: 0,
            piecesPerSizeEst: 0,
            estimatedPieces: totalToSend,
            actualPieces: totalToSend,
            sizes: dist.sizes
        });

        const itemIndex = updatedActiveItems.findIndex(i => i.color === dist.color);
        if (itemIndex > -1) {
            const activeItem = updatedActiveItems[itemIndex];
            const remainingSizes = { ...activeItem.sizes };
            let remainingTotal = 0;

            Object.keys(remainingSizes).forEach(key => {
                const current = remainingSizes[key] || 0;
                const sent = dist.sizes[key] || 0;
                remainingSizes[key] = Math.max(0, current - sent);
                remainingTotal += remainingSizes[key]!;
            });

            updatedActiveItems[itemIndex] = {
                ...activeItem,
                sizes: remainingSizes,
                actualPieces: remainingTotal
            };
        }
    });
    
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `split-${Date.now()}`;

    const newSplit: OrderSplit = {
        id: newId,
        seamstressId: seamstress.id,
        seamstressName: seamstress.name,
        status: OrderStatus.SEWING,
        items: splitItems,
        createdAt: new Date().toISOString()
    };

    const newSplits = [...(Array.isArray(originalOrder.splits) ? originalOrder.splits : []), newSplit];
    const updatedAt = new Date().toISOString();

    try {
        const updated = await apiFetch(`orders/${originalOrderId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                activeCuttingItems: updatedActiveItems,
                splits: newSplits,
                status: OrderStatus.SEWING,
                updatedAt
            })
        });

        setOrders(prev => prev.map(o => o.id === originalOrderId ? updated : o));
        if (originalOrder.status === OrderStatus.CUTTING) {
            setProductionStage(OrderStatus.SEWING);
        }
    } catch (error) {
        console.error("Error distributing:", error);
    }
  };

  const handleMarkSplitFinished = async (orderId: string, splitIndex: number) => {
      const order = orders.find(o => o.id === orderId);
      if(!order || !Array.isArray(order.splits)) return;

      const updatedSplits = [...order.splits];
      if (!updatedSplits[splitIndex]) return;

      updatedSplits[splitIndex] = {
          ...updatedSplits[splitIndex],
          status: OrderStatus.FINISHED,
          finishedAt: new Date().toISOString()
      };

      const cuttingEmpty = (Array.isArray(order.activeCuttingItems) ? order.activeCuttingItems : []).every(i => i.actualPieces === 0);
      const allSplitsFinished = updatedSplits.every(s => s.status === OrderStatus.FINISHED);
      
      const isNowFinished = (cuttingEmpty && allSplitsFinished);
      const newStatus = isNowFinished ? OrderStatus.FINISHED : OrderStatus.SEWING;
      const updatedAt = new Date().toISOString();

      try {
          const updated = await apiFetch(`orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                splits: updatedSplits,
                status: newStatus,
                updatedAt,
                finishedAt: isNowFinished ? updatedAt : order.finishedAt
            })
          });
          setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      } catch (error) {
          console.error("Error finishing split:", error);
      }
  }

  const handleGenerateAiReport = async () => {
    setLoadingAi(true);
    const report = await generateProductionInsights(orders, seamstresses);
    setAiInsights(report);
    setLoadingAi(false);
  };

  const filteredFabrics = useMemo(() => {
    return fabrics.filter(f => {
        const matchesName = f.name.toLowerCase().includes(fabricFilters.name.toLowerCase());
        const matchesColor = f.color.toLowerCase().includes(fabricFilters.color.toLowerCase());
        return matchesName && matchesColor;
    });
  }, [fabrics, fabricFilters]);

  const filteredOrders = orders.filter(o => 
    (o.referenceCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)) &&
    o.status === productionStage
  );

  const getStageIcon = (stage: OrderStatus) => {
      switch(stage) {
          case OrderStatus.PLANNED: return ClipboardList;
          case OrderStatus.CUTTING: return Scissors;
          case OrderStatus.SEWING: return Shirt;
          case OrderStatus.FINISHED: return CheckCircle2;
          default: return ClipboardList;
      }
  }

  if (isLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-50">
              <div className="text-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-700">Conectando ao banco de dados...</h2>
              </div>
          </div>
      )
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <aside className="w-64 bg-indigo-950 text-white flex-shrink-0 flex flex-col shadow-xl z-20">
        <div className="p-8">
          <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Kavin's</h1>
          <p className="text-xs text-indigo-300 mt-1 uppercase tracking-widest">Confecção & Gestão</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}>
            <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('production')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'production' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}>
            <Scissors size={20} /> <span className="font-medium">Produção</span>
          </button>
          <button onClick={() => setActiveTab('fabrics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'fabrics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}>
            <Layers size={20} /> <span className="font-medium">Estoque de Tecidos</span>
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}>
            <FileText size={20} /> <span className="font-medium">Relatórios</span>
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}>
            <Tags size={20} /> <span className="font-medium">Cadastros</span>
          </button>
          <button onClick={() => setActiveTab('seamstresses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'seamstresses' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-white/10'}`}>
            <Users size={20} /> <span className="font-medium">Costureiras</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
            {activeTab === 'dashboard' && 'Visão Geral'}
            {activeTab === 'production' && 'Gerenciamento de Produção'}
            {activeTab === 'reports' && 'Relatórios e Análises'}
            {activeTab === 'products' && 'Catálogo de Produtos'}
            {activeTab === 'seamstresses' && 'Equipe de Costura'}
            {activeTab === 'fabrics' && 'Controle de Estoque de Tecidos'}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === 'production' && (
              <>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar ordem..." className="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none w-64 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => { setOrderToEdit(null); setIsOrderModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"><Plus size={18} /> Nova Ordem</button>
              </>
            )}
            {activeTab === 'products' && (
              <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"><Plus size={18} /> Novo Produto</button>
            )}
             {activeTab === 'fabrics' && (
              <button onClick={() => { setFabricToEdit(null); setIsFabricModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"><Plus size={18} /> Entrada de Tecido</button>
            )}
             {activeTab === 'seamstresses' && (
              <button onClick={() => { setSeamstressToEdit(null); setIsSeamstressModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"><Plus size={18} /> Nova Costureira</button>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Pedidos Planejados" value={dashboardMetrics.plannedOrdersCount} icon={ClipboardList} color="bg-blue-500" trend="Aguardando Corte" />
                <StatCard title="Costureiras Ativas" value={dashboardMetrics.activeSeamstressesCount} icon={Users} color="bg-pink-500" trend="Costurando agora" />
                <StatCard title="Produzido (Mês)" value={dashboardMetrics.monthPiecesProduced} icon={CalendarDays} color="bg-indigo-500" trend="Peças finalizadas" />
                <StatCard title="Em Corte (Ativo)" value={dashboardMetrics.cuttingOrders} icon={Scissors} color="bg-purple-500" trend="Aguardando distribuição" />
              </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-600"/> Produção Semanal (7 Dias)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboardMetrics.weeklyData}>
                                <defs><linearGradient id="colorPieces" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}}/>
                                <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0'}} />
                                <Area type="monotone" dataKey="peças" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPieces)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays size={20} className="text-emerald-600"/> Produção Mensal</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardMetrics.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10}/>
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0'}} />
                                <Bar dataKey="peças" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'fabrics' && (
             <div className="space-y-6">
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Buscar Tecido</label>
                        <input type="text" placeholder="Ex: Viscose..." className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none" value={fabricFilters.name} onChange={e => setFabricFilters({...fabricFilters, name: e.target.value})}/>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredFabrics.map(fabric => (
                        <div key={fabric.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative group transition-all hover:shadow-md hover:border-indigo-200">
                             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setFabricToEdit(fabric); setIsFabricModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1 bg-white rounded shadow-sm"><Edit2 size={16} /></button>
                                <button onClick={() => handleQuickStockAdd(fabric)} className="text-emerald-500 hover:text-emerald-700 p-1 bg-white rounded shadow-sm hover:bg-emerald-50"><PlusCircle size={16} /></button>
                             </div>
                             <div className="flex items-center gap-3 mb-4">
                                 <div className="w-12 h-12 rounded-full border-2 border-slate-100 shadow-inner" style={{backgroundColor: fabric.colorHex}}></div>
                                 <div><h3 className="font-bold text-slate-800 text-lg">{fabric.name}</h3><p className="text-xs text-slate-500 font-medium">{fabric.color}</p></div>
                             </div>
                             <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100"><p className="text-center"><span className="block text-xs text-slate-400 uppercase tracking-wider">Estoque Atual</span><span className={`text-2xl font-bold ${fabric.stockRolls < 10 ? 'text-red-500' : 'text-indigo-600'}`}>{fabric.stockRolls} <span className="text-sm text-slate-400 font-normal">rolos</span></span></p></div>
                             <div className="text-xs text-slate-400 border-t border-slate-50 pt-3"><p className="mb-1"><Clock size={10} className="inline mr-1"/> Atualizado: {new Date(fabric.updatedAt).toLocaleDateString()}</p></div>
                        </div>
                    ))}
                 </div>
             </div>
          )}

          {activeTab === 'production' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
              <div className="flex p-2 bg-slate-100/50 border-b border-slate-200">
                {(Object.values(OrderStatus) as OrderStatus[]).map((status) => {
                    const Icon = getStageIcon(status);
                    const isActive = productionStage === status;
                    const count = stageCounts[status];
                    return (
                        <button key={status} onClick={() => setProductionStage(status)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all relative ${isActive ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}>
                            <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'}/>
                            {status}
                            {count > 0 && <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
                        </button>
                    );
                })}
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="p-4 w-10"></th><th className="p-4">Pedido / Data</th><th className="p-4">Ref / Descrição</th><th className="p-4">Tecido</th><th className="p-4 text-center">Peças Totais</th><th className="p-4 text-right">Ações</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredOrders.length === 0 ? (<tr><td colSpan={6} className="p-12 text-center text-slate-400"><div className="flex flex-col items-center gap-3"><Archive size={48} className="text-slate-200" /><p>Nenhum pedido na etapa <span className="font-bold text-slate-500">{productionStage}</span>.</p></div></td></tr>) : (
                      filteredOrders.map(order => {
                        const isExpanded = expandedOrders.includes(order.id);
                        const itemsList = Array.isArray(order.items) ? order.items : [];
                        const totalPieces = itemsList.reduce((acc, i) => acc + (order.status === OrderStatus.PLANNED ? (i.estimatedPieces || 0) : (i.actualPieces || 0)), 0);
                        const cuttingList = Array.isArray(order.activeCuttingItems) ? order.activeCuttingItems : [];
                        const itemsInCutting = cuttingList.reduce((acc, i) => acc + (i.actualPieces || 0), 0);
                        return (
                          <React.Fragment key={order.id}>
                            <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => setExpandedOrders(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}>
                              <td className="p-4 text-center"><button className="text-slate-400 hover:text-indigo-600">{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></td>
                              <td className="p-4"><div className="font-mono font-bold text-indigo-700 text-lg">#{order.id}</div><div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</div></td>
                              <td className="p-4"><div className="font-bold text-indigo-900">{order.referenceCode}</div><div className="text-slate-500">{order.description}</div><div className="flex mt-1 gap-1">{itemsList.map(i => (<div key={i.color} className="w-3 h-3 rounded-full border border-slate-200" style={{backgroundColor: i.colorHex || '#999'}} title={i.color}></div>))}</div></td>
                              <td className="p-4 font-medium">{order.fabric}</td>
                              <td className="p-4 text-center"><span className="font-bold text-slate-700 text-lg">{totalPieces}</span></td>
                              <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-2 items-center">
                                    {order.status === OrderStatus.PLANNED && (
                                      <>
                                        <button onClick={() => { setOrderToEdit(order); setIsOrderModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Editar Pedido"><Edit2 size={16} /></button>
                                        <button onClick={() => initiateMoveToCutting(order)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1"><Scissors size={14}/> Iniciar</button>
                                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                                        <button onClick={() => handleDeleteOrder(order.id)} className="text-slate-400 hover:text-red-500 p-1.5" title="Excluir Pedido"><Trash2 size={16} /></button>
                                      </>
                                    )}
                                    {order.status === OrderStatus.CUTTING && itemsInCutting === 0 && cuttingList.length === 0 && (
                                      <button onClick={() => initiateConfirmCut(order)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md"><ClipboardList size={14} /> Confirmar</button>
                                    )}
                                    {((order.status === OrderStatus.CUTTING && itemsInCutting > 0) || order.status === OrderStatus.SEWING) && itemsInCutting > 0 && (
                                      <button onClick={() => initiateDistribute(order)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md"><ArrowRightLeft size={14} /> Distribuir</button>
                                    )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                                <tr className="bg-slate-50 border-b border-slate-200"><td colSpan={6} className="p-6">
                                        <div className="flex flex-col gap-6">
                                            {(order.status === OrderStatus.CUTTING || order.status === OrderStatus.SEWING) && (
                                                <div className={`border rounded-xl p-4 shadow-sm bg-white border-purple-100`}>
                                                    <div className="flex justify-between items-center mb-3"><h4 className="font-bold text-slate-700 flex items-center gap-2"><Scissors size={18} className="text-purple-600"/> Estoque em Corte</h4></div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {cuttingList.length > 0 ? cuttingList.map((item, idx) => (
                                                            <div key={idx} className={`p-3 rounded-lg border flex flex-col ${item.actualPieces > 0 ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-50'}`}>
                                                                <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full border border-slate-100" style={{backgroundColor: item.colorHex}}></div><span className="font-bold text-sm text-slate-700">{item.color}</span></div>
                                                                <div className="flex justify-between items-end mt-auto"><div className="flex flex-wrap gap-1 max-w-[70%]">{Object.entries(item.sizes || {}).map(([s, q]) => (q as number) > 0 && <span key={s} className="text-[10px] bg-slate-50 border border-slate-100 px-1 rounded text-slate-500">{s}:{q as number}</span>)}</div><span className="font-bold text-lg text-slate-800">{item.actualPieces}</span></div>
                                                            </div>
                                                        )) : <p className="text-sm text-slate-400 italic col-span-4">Nenhum item no corte.</p>}
                                                    </div>
                                                </div>
                                            )}
                                            {Array.isArray(order.splits) && order.splits.length > 0 && (
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3"><Users size={18} className="text-amber-600"/> Distribuições</h4>
                                                    <div className="space-y-3">
                                                        {order.splits.map((split, idx) => (
                                                            <div key={idx} className="flex flex-col md:flex-row gap-4 border border-slate-100 rounded-lg p-3 hover:bg-slate-50">
                                                                <div className="flex-shrink-0 w-48 border-r border-slate-100 pr-4 flex flex-col justify-center">
                                                                    <div className="font-medium text-slate-800">{split.seamstressName}</div>
                                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded w-fit ${split.status === OrderStatus.FINISHED ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{split.status}</div>
                                                                </div>
                                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                     {Array.isArray(split.items) && split.items.map((item, i) => (<div key={i} className="bg-white border border-slate-100 rounded p-2 text-sm"><span className="font-medium text-slate-600">{item.color}</span><div className="font-bold text-right text-slate-800">{item.actualPieces} pçs</div></div>))}
                                                                </div>
                                                                <div className="flex-shrink-0 flex items-center pl-2 border-l border-slate-100">{split.status !== OrderStatus.FINISHED && (<button onClick={() => handleMarkSplitFinished(order.id, idx)} className="text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg text-xs font-bold border border-emerald-200"><PackageCheck size={16} /> Baixa</button>)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td></tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="p-4">Código</th><th className="p-4">Descrição</th><th className="p-4">Tecido</th><th className="p-4">Cores</th><th className="p-4 text-right">Ações</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {references.map(ref => (
                      <tr key={ref.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-indigo-900">{ref.code}</td>
                        <td className="p-4">{ref.description}</td>
                        <td className="p-4">{ref.defaultFabric}</td>
                        <td className="p-4"><div className="flex gap-2 flex-wrap">{Array.isArray(ref.defaultColors) && ref.defaultColors.map(c => (<div key={c.name} className="flex items-center gap-1 text-xs bg-white border border-slate-200 pl-1 pr-2 py-1 rounded-full shadow-sm"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }}></div><span>{c.name}</span></div>))}</div></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => {setEditingProduct(ref); setIsProductModalOpen(true);}} className="text-indigo-400 hover:text-indigo-600 p-2"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteProduct(ref.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          {activeTab === 'seamstresses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {seamstresses.map(seamstress => (
                  <div key={seamstress.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group">
                    <button onClick={() => { setSeamstressToEdit(seamstress); setIsSeamstressModalOpen(true); }} className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 size={18} /></button>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">{seamstress.name.charAt(0)}</div>
                        <div><h3 className="font-bold text-slate-800">{seamstress.name}</h3><p className="text-xs text-slate-500">{seamstress.specialty}</p></div>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${seamstress.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} onSave={handleCreateOrder} references={references} orderToEdit={orderToEdit} suggestedId={nextOrderId}/>
      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={handleSaveProduct} productToEdit={editingProduct} fabrics={fabrics}/>
      <SeamstressModal isOpen={isSeamstressModalOpen} onClose={() => setIsSeamstressModalOpen(false)} onSave={handleSaveSeamstress} seamstressToEdit={seamstressToEdit}/>
      <FabricModal isOpen={isFabricModalOpen} onClose={() => setIsFabricModalOpen(false)} onSave={handleSaveFabric} fabricToEdit={fabricToEdit}/>
      <CutConfirmationModal isOpen={!!cuttingOrder} onClose={() => setCuttingOrder(null)} order={cuttingOrder} onConfirm={confirmCut}/>
      <DistributeModal isOpen={!!distributingOrder} onClose={() => setDistributingOrder(null)} order={distributingOrder} seamstresses={seamstresses} onDistribute={handleDistribute}/>
    </div>
  );
}

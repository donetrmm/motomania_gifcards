'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  Plus, 
  QrCode, 
  Settings, 
  LogOut, 
  Search,
  Filter,
  Download,
  Upload,
  Zap,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Gift,
  Wallet,
  AlertTriangle,
  Menu,
  X,
  Shield
} from 'lucide-react'
import { GiftCard, GiftCardStatus } from '@/types/giftcard'
import { SupabaseGiftCardService } from '@/lib/supabase-giftcard-service'
import GiftCardList from './GiftCardList'
import CreateGiftCardModal from './CreateGiftCardModal'
import DeleteGiftCardModal from './DeleteGiftCardModal'
import QRScanner from './QRScanner'
import GiftCardDetail from './GiftCardDetail'
import ExpiringCards from './ExpiringCards'
import ImportCards from './ImportCards'
import ChangePasswordModal from './ChangePasswordModal'
import MotomaniaLogo from './MotomaniaLogo'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { ToastContainer, useToast } from './ui/Toast'
import WelcomeModal from './ui/WelcomeModal'



interface DashboardProps {
  onLogout: () => void
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('cards')
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GiftCardStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'giftcard' | 'ewallet'>('all')

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<GiftCard | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)
  const [createType, setCreateType] = useState<'giftcard' | 'ewallet'>('giftcard')
  const [service] = useState(() => SupabaseGiftCardService.getInstance())
  const [expiringCount, setExpiringCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const toast = useToast()

  useEffect(() => {
    loadGiftCards()
    
    // Cargar datos del usuario actual
    const userData = localStorage.getItem('motomania_user')
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    
    // Verificar si mostrar modal de bienvenida
    const hideWelcome = localStorage.getItem('motomania_hide_welcome')
    if (!hideWelcome) {
      // Mostrar después de un pequeño delay para mejor UX
      setTimeout(() => {
        setShowWelcome(true)
      }, 1000)
    }
  }, [])

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + F para enfocar búsqueda (evita conflicto con Ctrl+K de navegador)
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
      
      // Alt + N para nueva tarjeta  
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault()
        setCreateType('giftcard')
        setShowCreateModal(true)
      }
      
      // Alt + E para exportar
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'e') {
        e.preventDefault()
        exportData()
      }
      
      // Alt + M para nuevo monedero
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'm') {
        e.preventDefault()
        setCreateType('ewallet')
        setShowCreateModal(true)
      }
      
      // Escape solo para cerrar filtros avanzados cuando están abiertos
      if (e.key === 'Escape' && showAdvancedFilters) {
        e.preventDefault()
        setShowAdvancedFilters(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAdvancedFilters])

  useEffect(() => {
    // Actualizar contador de tarjetas próximas a expirar
    const updateExpiringCount = async () => {
      try {
        const expiringCards = await service.getExpiringGiftCardsAsync(7)
        setExpiringCount(expiringCards.length)
      } catch (error) {
        console.error('Error loading expiring cards count:', error)
        setExpiringCount(0)
      }
    }
    
    updateExpiringCount()
    const interval = setInterval(updateExpiringCount, 60000) // Actualizar cada minuto
    
    return () => clearInterval(interval)
  }, [service, giftCards])

  const loadGiftCards = async () => {
    try {
      const cards = await service.getAllGiftCards()
      setGiftCards(cards)
    } catch (error) {
      console.error('Error loading gift cards:', error)
      toast.error('Error', 'No se pudieron cargar las tarjetas')
    }
  }

  const handleCreateCard = () => {
    loadGiftCards()
    setShowCreateModal(false)
  }

  const handleUpdateCard = () => {
    loadGiftCards()
    setSelectedCard(null)
  }

  const handleDeleteCard = (card: GiftCard) => {
    setCardToDelete(card)
    setShowDeleteModal(true)
  }

  const handleCardDeleted = () => {
    loadGiftCards()
    setShowDeleteModal(false)
    setCardToDelete(null)
  }

  const filteredCards = giftCards.filter(card => {
    // Búsqueda por texto
    const matchesSearch = card.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.deobfuscateCode(card.code).toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por estado
    const cardStatus = service.getGiftCardStatus(card)
    const matchesStatus = statusFilter === 'all' || cardStatus === statusFilter
    
    // Filtro por tipo
    const matchesType = typeFilter === 'all' || card.type === typeFilter
    

    
    // Filtro por fecha
    let matchesDate = true
    if (dateFilter !== 'all') {
      const now = new Date()
      const cardDate = card.createdAt
      switch (dateFilter) {
        case 'today':
          matchesDate = cardDate.toDateString() === now.toDateString()
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = cardDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = cardDate >= monthAgo
          break
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate
  })

  const stats = {
    totalCards: giftCards.length,
    filteredCards: filteredCards.length,
    activeCards: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return status === GiftCardStatus.ACTIVE
    }).length,
    totalValue: giftCards.reduce((sum, card) => sum + card.currentAmount, 0),
    filteredValue: filteredCards.reduce((sum, card) => sum + card.currentAmount, 0),
    redeemedCards: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return status === GiftCardStatus.REDEEMED
    }).length,
    expiredCards: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return status === GiftCardStatus.EXPIRED
    }).length,
    inactiveCards: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return status === GiftCardStatus.INACTIVE
    }).length,
    giftCards: giftCards.filter(card => card.type === 'giftcard').length,
    ewallets: giftCards.filter(card => card.type === 'ewallet').length,
    // Valores específicos para tarjetas activas por tipo
    activeGiftCards: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return card.type === 'giftcard' && status === GiftCardStatus.ACTIVE
    }),
    activeEwallets: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return card.type === 'ewallet' && status === GiftCardStatus.ACTIVE
    }),
    totalValueGiftCards: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return card.type === 'giftcard' && status === GiftCardStatus.ACTIVE
    }).reduce((sum, card) => sum + card.currentAmount, 0),
    totalValueEwallets: giftCards.filter(card => {
      const status = service.getGiftCardStatus(card)
      return card.type === 'ewallet' && status === GiftCardStatus.ACTIVE
    }).reduce((sum, card) => sum + card.currentAmount, 0),
    averageValue: giftCards.length > 0 ? giftCards.reduce((sum, card) => sum + card.currentAmount, 0) / giftCards.length : 0,
    redemptionRate: giftCards.length > 0 ? (giftCards.filter(card => service.getGiftCardStatus(card) === GiftCardStatus.REDEEMED).length / giftCards.length) * 100 : 0,
    totalTransactions: giftCards.reduce((sum, card) => sum + card.transactions.length, 0),
    recentCards: giftCards.filter(card => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return card.createdAt >= weekAgo
    }).length
  }

  const exportData = async () => {
    setIsLoading(true)
    try {
      const result = await service.exportGiftCardsAsync()
      
      if (!result) {
        toast.error('Error de exportación', 'No se pudo generar el archivo de exportación')
        setIsLoading(false)
        return
      }
      
      const blob = new Blob([result], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `motomania-giftcards-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Exportación exitosa', 'Los datos se han exportado correctamente')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Error de exportación', 'No se pudo crear el archivo de exportación')
    } finally {
      setIsLoading(false)
    }
  }

  // Función para formatear moneda mexicana: COMA para miles, PUNTO para decimales
  const formatCurrency = (amount: number): string => {
    const hasDecimals = amount % 1 !== 0
    
    if (hasDecimals) {
      // Para números con decimales: ejemplo 1,234.56
      return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    } else {
      // Para números enteros: ejemplo 1,000 o 10,000
      return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
  }

  // Función para formatear números grandes manteniendo COMA para miles
  const formatLargeNumber = (amount: number): string => {
    if (amount >= 1000000) {
      const millions = amount / 1000000
      const hasDecimals = millions % 1 !== 0
      if (hasDecimals) {
        return `${millions.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}M`
      } else {
        return `${millions.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}M`
      }
    } else if (amount >= 1000) {
      const thousands = Math.floor(amount / 1000)
      return `${thousands.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}K`
    }
    return formatCurrency(amount)
  }

  const clearAllFilters = () => {
    setStatusFilter('all')
    setTypeFilter('all')
    setDateFilter('all')
    setSearchTerm('')
    toast.info('Filtros limpiados', 'Se han restablecido todos los filtros')
  }

  const getActiveFiltersCount = () => {
    return [statusFilter, typeFilter, dateFilter].filter(f => f !== 'all').length + 
           (searchTerm ? 1 : 0)
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-black">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-neutral-800 shadow-lg border-b border-neutral-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <MotomaniaLogo size="md" />
              <div className="hidden sm:block">
                <p className="text-sm text-gray-300 font-medium">Gestor de GiftCards y Monederos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={exportData}
                className="p-2 text-gray-300 hover:text-primary-400 transition-colors"
                                  title="Exportar datos (Ctrl+E)"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowChangePassword(true)}
                className="p-2 text-gray-300 hover:text-blue-400 transition-colors"
                title="Cambiar contraseña"
              >
                <Shield className="w-5 h-5" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Navigation - Desktop */}
      <motion.nav
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="hidden md:block bg-neutral-800 border-b border-neutral-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'cards', label: 'Tarjetas', icon: CreditCard },
              { id: 'expiring', label: 'Próximas a Expirar', icon: AlertTriangle },
              { id: 'scanner', label: 'Escáner QR', icon: QrCode },
              { id: 'stats', label: 'Estadísticas', icon: TrendingUp },
              { id: 'import', label: 'Importar', icon: Upload }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors relative ultra-crisp ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-neutral-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {id === 'expiring' && expiringCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {expiringCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Button */}
      <div className="md:hidden bg-neutral-800 border-b border-neutral-700/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-12">
            <h2 className="text-lg font-semibold text-gray-100 ultra-crisp">
              {[
                { id: 'cards', label: 'Tarjetas' },
                { id: 'expiring', label: 'Próximas a Expirar' },
                { id: 'scanner', label: 'Escáner QR' },
                { id: 'stats', label: 'Estadísticas' },
                { id: 'import', label: 'Importar' }
              ].find(tab => tab.id === activeTab)?.label}
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-primary-400 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="md:hidden fixed inset-y-0 right-0 z-50 w-64 bg-neutral-900 border-l border-neutral-700/50"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700/50">
              <h3 className="text-lg font-semibold text-gray-100 ultra-crisp">Menú</h3>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-300 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 py-4">
              {[
                { id: 'cards', label: 'Tarjetas', icon: CreditCard },
                { id: 'expiring', label: 'Próximas a Expirar', icon: AlertTriangle },
                { id: 'scanner', label: 'Escáner QR', icon: QrCode },
                { id: 'stats', label: 'Estadísticas', icon: TrendingUp },
                { id: 'import', label: 'Importar', icon: Upload }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left font-medium transition-colors relative ultra-crisp ${
                    activeTab === id
                      ? 'text-primary-400 bg-primary-900/20 border-r-2 border-primary-500'
                      : 'text-gray-300 hover:text-gray-100 hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                  {id === 'expiring' && expiringCount > 0 && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {expiringCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'cards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
              {[
                { 
                  label: 'Total Tarjetas', 
                  value: stats.totalCards, 
                  subtitle: `${stats.filteredCards} mostradas`,
                  icon: CreditCard, 
                  color: 'text-blue-400',
                  bgColor: 'bg-blue-900/20',
                  borderColor: 'border-blue-500/30'
                },
                { 
                  label: 'Activas', 
                  value: stats.activeCards, 
                  subtitle: `${((stats.activeCards / Math.max(stats.totalCards, 1)) * 100).toFixed(1)}%`,
                  icon: Users, 
                  color: 'text-green-400',
                  bgColor: 'bg-green-900/20',
                  borderColor: 'border-green-500/30'
                },
                { 
                  label: 'GiftCards', 
                  value: stats.giftCards, 
                  subtitle: `vs ${stats.ewallets} monederos`,
                  icon: Gift, 
                  color: 'text-orange-400',
                  bgColor: 'bg-orange-900/20',
                  borderColor: 'border-orange-500/30'
                },
                                 { 
                   label: 'Valor Total', 
                   value: `$${formatLargeNumber(stats.totalValue)}`, 
                   subtitle: `Promedio: $${formatLargeNumber(stats.averageValue)}`,
                   icon: DollarSign, 
                   color: 'text-primary-400',
                   bgColor: 'bg-primary-900/20',
                   borderColor: 'border-primary-500/30'
                 },
                { 
                  label: 'Canjeadas', 
                  value: stats.redeemedCards, 
                  subtitle: `${stats.redemptionRate.toFixed(1)}% tasa`,
                  icon: TrendingUp, 
                  color: 'text-red-400',
                  bgColor: 'bg-red-900/20',
                  borderColor: 'border-red-500/30'
                },
                { 
                  label: 'Esta Semana', 
                  value: stats.recentCards, 
                  subtitle: `${stats.totalTransactions} transacciones`,
                  icon: Zap, 
                  color: 'text-purple-400',
                  bgColor: 'bg-purple-900/20',
                  borderColor: 'border-purple-500/30'
                }
              ].map(({ label, value, subtitle, icon: Icon, color, bgColor, borderColor }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${bgColor} ${borderColor} border rounded-xl p-4 hover:scale-105 transition-all duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-2xl font-bold text-gray-100 mb-1">{value}</p>
                      <p className="text-xs text-gray-500">{subtitle}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-xl p-4 mb-6 border border-neutral-600/50"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-400">{stats.activeCards}</p>
                  <p className="text-xs text-gray-400">Activas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats.redeemedCards}</p>
                  <p className="text-xs text-gray-400">Canjeadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.expiredCards}</p>
                  <p className="text-xs text-gray-400">Expiradas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">{stats.inactiveCards}</p>
                  <p className="text-xs text-gray-400">Inactivas</p>
                </div>
              </div>
            </motion.div>

            {/* Advanced Filters */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-neutral-800 rounded-xl p-6 border border-neutral-700/50 mb-6"
            >
              {/* Search and Quick Filters */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full lg:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar tarjetas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10 pr-16 w-full"
                    />
                                         <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center space-x-1 text-xs text-gray-500">
                       <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-xs">ALT</kbd>
                       <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-xs">F</kbd>
                     </div>
                  </div>
                  
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                      showAdvancedFilters 
                        ? 'bg-primary-600 border-primary-500 text-white' 
                        : 'bg-neutral-700 border-neutral-600 text-gray-300 hover:bg-neutral-600'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filtros</span>
                    <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded-full">
                      {getActiveFiltersCount()}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      setCreateType('giftcard')
                      setShowCreateModal(true)
                    }}
                    className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva GiftCard</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setCreateType('ewallet')
                      setShowCreateModal(true)
                    }}
                    className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Monedero</span>
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-neutral-700 pt-4"
                  >
                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Status Filter */}
                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                         <select
                           value={statusFilter}
                           onChange={(e) => setStatusFilter(e.target.value as 'all' | GiftCardStatus)}
                           className="input-field w-full"
                         >
                           <option value="all">Todos los estados</option>
                           <option value={GiftCardStatus.ACTIVE}>Activas</option>
                           <option value={GiftCardStatus.REDEEMED}>Canjeadas</option>
                           <option value={GiftCardStatus.EXPIRED}>Expiradas</option>
                           <option value={GiftCardStatus.INACTIVE}>Inactivas</option>
                         </select>
                       </div>

                       {/* Type Filter */}
                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                         <select
                           value={typeFilter}
                           onChange={(e) => setTypeFilter(e.target.value as 'all' | 'giftcard' | 'ewallet')}
                           className="input-field w-full"
                         >
                           <option value="all">Todos los tipos</option>
                           <option value="giftcard">GiftCards</option>
                           <option value="ewallet">Monederos</option>
                         </select>
                       </div>

                       {/* Date Filter */}
                       <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Creación</label>
                         <select
                           value={dateFilter}
                           onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                           className="input-field w-full"
                         >
                           <option value="all">Todas las fechas</option>
                           <option value="today">Hoy</option>
                           <option value="week">Esta semana</option>
                           <option value="month">Este mes</option>
                         </select>
                       </div>
                     </div>

                    {/* Filter Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-neutral-700">
                      <button
                        onClick={clearAllFilters}
                        disabled={getActiveFiltersCount() === 0}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                        <span>Limpiar Filtros</span>
                      </button>
                      
                                             <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 sm:gap-4 text-sm text-gray-400">
                         <span>Mostrando {stats.filteredCards} de {stats.totalCards} tarjetas</span>
                         {stats.filteredValue > 0 && (
                                                    <span className="text-primary-400 font-medium">
                           Valor filtrado: ${formatLargeNumber(stats.filteredValue)}
                         </span>
                         )}
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Gift Cards List */}
            <GiftCardList
              giftCards={filteredCards}
              onCardSelect={setSelectedCard}
              onCardUpdate={loadGiftCards}
              onCardDelete={handleDeleteCard}
            />
          </motion.div>
        )}

        {activeTab === 'expiring' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100 mb-2">Tarjetas Próximas a Expirar</h2>
              <p className="text-gray-300">Gestiona las tarjetas que expiran en los próximos días</p>
            </div>
            <ExpiringCards onCardSelect={setSelectedCard} />
          </motion.div>
        )}

        {activeTab === 'import' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ImportCards onImportSuccess={loadGiftCards} />
          </motion.div>
        )}

        {activeTab === 'scanner' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <QRScanner 
              isOpen={true}
              onClose={() => setActiveTab('overview')}
              onCardFound={(giftCard) => setSelectedCard(giftCard)}
              onError={(error) => console.error('Error en scanner:', error)}
            />
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-100 mb-2">Estadísticas Detalladas</h2>
              <p className="text-gray-300">Análisis completo del sistema de tarjetas</p>
            </div>

            {/* Totales por Tipo - Panel Destacado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Total en GiftCards Activas */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border-2 border-orange-500/50 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-orange-500/30 rounded-xl">
                      <Gift className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-100">GiftCards Activas</h3>
                      <p className="text-sm text-orange-300">Tarjetas prepagadas en uso</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-gray-400">Total en Circulación</p>
                      <p className="text-4xl font-bold text-orange-400">
                        ${formatLargeNumber(stats.totalValueGiftCards)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Tarjetas</p>
                      <p className="text-2xl font-bold text-gray-100">
                        {stats.activeGiftCards.length}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-500/30">
                    <div>
                      <p className="text-xs text-gray-400">Promedio</p>
                      <p className="text-lg font-semibold text-orange-300">
                        ${formatLargeNumber(stats.activeGiftCards.length > 0 ? stats.totalValueGiftCards / stats.activeGiftCards.length : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">% del Total</p>
                      <p className="text-lg font-semibold text-orange-300">
                        {stats.totalValue > 0 ? ((stats.totalValueGiftCards / stats.totalValue) * 100).toFixed(1) : '0'}%
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Total en Monederos Activos */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-2 border-blue-500/50 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500/30 rounded-xl">
                      <Wallet className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-100">Monederos Activos</h3>
                      <p className="text-sm text-blue-300">Fondos recargables disponibles</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-gray-400">Total Almacenado</p>
                      <p className="text-4xl font-bold text-blue-400">
                        ${formatLargeNumber(stats.totalValueEwallets)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Monederos</p>
                      <p className="text-2xl font-bold text-gray-100">
                        {stats.activeEwallets.length}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-500/30">
                    <div>
                      <p className="text-xs text-gray-400">Promedio</p>
                      <p className="text-lg font-semibold text-blue-300">
                        ${formatLargeNumber(stats.activeEwallets.length > 0 ? stats.totalValueEwallets / stats.activeEwallets.length : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">% del Total</p>
                      <p className="text-lg font-semibold text-blue-300">
                        {stats.totalValue > 0 ? ((stats.totalValueEwallets / stats.totalValue) * 100).toFixed(1) : '0'}%
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {/* General Overview */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">Resumen General</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total de Tarjetas</span>
                    <span className="text-2xl font-bold text-blue-400">{stats.totalCards}</span>
                  </div>
                                     <div className="flex justify-between items-center">
                     <span className="text-gray-300">Valor Total</span>
                     <span className="text-xl font-bold text-green-400">${formatLargeNumber(stats.totalValue)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-300">Valor Promedio</span>
                                            <span className="text-lg font-semibold text-gray-100">
                         ${formatLargeNumber(stats.averageValue)}
                       </span>
                   </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Transacciones</span>
                    <span className="text-lg font-semibold text-purple-400">{stats.totalTransactions}</span>
                  </div>
                </div>
              </motion.div>

              {/* Status Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-xl p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">Por Estado</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Activas', value: stats.activeCards, color: 'bg-green-400', textColor: 'text-green-400' },
                    { label: 'Canjeadas', value: stats.redeemedCards, color: 'bg-red-400', textColor: 'text-red-400' },
                    { label: 'Expiradas', value: stats.expiredCards, color: 'bg-yellow-400', textColor: 'text-yellow-400' },
                    { label: 'Inactivas', value: stats.inactiveCards, color: 'bg-gray-400', textColor: 'text-gray-400' }
                  ].map(({ label, value, color, textColor }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 ${color} rounded-full`}></div>
                        <span className="text-gray-300">{label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${textColor}`}>{value}</span>
                        <span className="text-xs text-gray-500">
                          ({stats.totalCards > 0 ? ((value / stats.totalCards) * 100).toFixed(1) : '0'}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Type Distribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Gift className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100">Por Tipo</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <Gift className="w-5 h-5 text-orange-400" />
                      <div>
                        <span className="text-gray-300">GiftCards</span>
                        <p className="text-xs text-gray-500">Activas: {stats.activeGiftCards.length}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-orange-400">{stats.giftCards}</span>
                      <p className="text-xs text-gray-500">
                        {stats.totalCards > 0 ? ((stats.giftCards / stats.totalCards) * 100).toFixed(1) : '0'}%
                      </p>
                      <p className="text-xs text-orange-300">
                        ${formatLargeNumber(stats.totalValueGiftCards)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5 text-blue-400" />
                      <div>
                        <span className="text-gray-300">Monederos</span>
                        <p className="text-xs text-gray-500">Activos: {stats.activeEwallets.length}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-blue-400">{stats.ewallets}</span>
                      <p className="text-xs text-gray-500">
                        {stats.totalCards > 0 ? ((stats.ewallets / stats.totalCards) * 100).toFixed(1) : '0'}%
                      </p>
                      <p className="text-xs text-blue-300">
                        ${formatLargeNumber(stats.totalValueEwallets)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Redemption Rate Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-neutral-800 border border-neutral-700/50 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                  <span>Tasa de Canje</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-bold text-primary-400">
                      {stats.redemptionRate.toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-400">
                      {stats.redeemedCards} de {stats.totalCards} tarjetas
                    </span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-400 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(stats.redemptionRate, 100)}%` }}
                    ></div>
                  </div>
                                     <p className="text-sm text-gray-400">
                     {stats.redemptionRate > 50 ? 'Alta actividad de canje' : 
                      stats.redemptionRate > 25 ? 'Actividad moderada' : 
                      'Baja actividad de canje'}
                   </p>
                </div>
              </motion.div>

              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-neutral-800 border border-neutral-700/50 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span>Actividad Reciente</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Esta semana</span>
                    <span className="text-2xl font-bold text-yellow-400">{stats.recentCards}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Promedio diario</span>
                    <span className="text-lg font-semibold text-gray-100">
                      {(stats.recentCards / 7).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total transacciones</span>
                    <span className="text-lg font-semibold text-purple-400">{stats.totalTransactions}</span>
                  </div>
                                     <div className="pt-2 border-t border-neutral-700">
                     <p className="text-sm text-gray-400">
                       {stats.recentCards > 10 ? 'Semana muy activa' : 
                        stats.recentCards > 5 ? 'Semana activa' : 
                        'Semana tranquila'}
                     </p>
                   </div>
                </div>
              </motion.div>
            </div>

            {/* Additional Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-neutral-800 to-neutral-700 border border-neutral-600/50 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <span>Insights del Sistema</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-cyan-400">{stats.totalCards}</p>
                  <p className="text-sm text-gray-400">Tarjetas Totales</p>
                </div>
                                 <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                   <p className="text-2xl font-bold text-green-400">
                     ${formatLargeNumber(stats.totalValue)}
                   </p>
                   <p className="text-sm text-gray-400">Valor en Circulación</p>
                 </div>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-400">
                    {stats.totalTransactions}
                  </p>
                  <p className="text-sm text-gray-400">Transacciones</p>
                </div>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">
                    {stats.totalCards > 0 ? (stats.totalTransactions / stats.totalCards).toFixed(1) : '0'}
                  </p>
                  <p className="text-sm text-gray-400">Trans. por Tarjeta</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}


      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateGiftCardModal
          type={createType}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateCard}
        />
      )}

      {selectedCard && (
        <GiftCardDetail
          giftCard={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            toast.success('Contraseña cambiada', 'La contraseña se ha actualizado correctamente')
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteGiftCardModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          giftCard={cardToDelete}
          onDeleted={handleCardDeleted}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingSpinner 
          fullScreen={true} 
          text="Procesando..." 
          color="white"
        />
      )}

      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Toast Container */}
      <ToastContainer 
        toasts={toast.toasts} 
        onRemove={toast.removeToast} 
      />
    </div>
  )
} 
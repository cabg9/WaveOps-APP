// ═══════════════════════════════════════════════════════════════════
// GALERIA DE ICONOS - DEPARTAMENTOS Y MODULOS
// ═══════════════════════════════════════════════════════════════════

import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  Backpack,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Binoculars,
  Ship,
  Briefcase,
  Building2,
  Calendar,
  Car,
  ClipboardList,
  Clock,
  Code2,
  Compass,
  CreditCard,
  Crown,
  DollarSign,
  FileText,
  Fish,
  Flag,
  FolderOpen,
  Gauge,
  Gift,
  HardHat,
  HeartPulse,
  Home,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MapPin,
  Megaphone,
  Package,
  PackageOpen,
  Paintbrush,
  Palmtree,
  Plane,
  Puzzle,
  Receipt,
  Sailboat,
  Scissors,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Sun,
  Target,
  Tent,
  Truck,
  Umbrella,
  UserCog,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react';

export interface IconOption {
  value: string;
  label: string;
  icon: LucideIcon;
  category: string;
}

export const ICON_OPTIONS: IconOption[] = [
  // Generales / Admin
  { value: 'building', label: 'Edificio', icon: Building2, category: 'General' },
  { value: 'home', label: 'Inicio', icon: Home, category: 'General' },
  { value: 'settings', label: 'Configuracion', icon: Settings, category: 'General' },
  { value: 'briefcase', label: 'Maletin', icon: Briefcase, category: 'General' },
  { value: 'folder-open', label: 'Carpeta', icon: FolderOpen, category: 'General' },
  { value: 'star', label: 'Estrella', icon: Star, category: 'General' },
  { value: 'flag', label: 'Bandera', icon: Flag, category: 'General' },
  { value: 'bell', label: 'Campana', icon: Bell, category: 'General' },
  { value: 'gauge', label: 'Panel', icon: Gauge, category: 'General' },

  // Operaciones / Buceo
  { value: 'anchor', label: 'Ancla', icon: Anchor, category: 'Operaciones' },
  { value: 'fish', label: 'Pez', icon: Fish, category: 'Operaciones' },
  { value: 'sailboat', label: 'Velero', icon: Sailboat, category: 'Operaciones' },
  { value: 'ship', label: 'Barco', icon: Ship, category: 'Operaciones' },
  { value: 'life-buoy', label: 'Salvavidas', icon: LifeBuoy, category: 'Operaciones' },
  { value: 'compass', label: 'Brujula', icon: Compass, category: 'Operaciones' },
  { value: 'map', label: 'Mapa', icon: Map, category: 'Operaciones' },
  { value: 'map-pin', label: 'Ubicacion', icon: MapPin, category: 'Operaciones' },
  { value: 'binoculars', label: 'Binoculares', icon: Binoculars, category: 'Operaciones' },
  { value: 'target', label: 'Objetivo', icon: Target, category: 'Operaciones' },
  { value: 'palmtree', label: 'Palmera', icon: Palmtree, category: 'Operaciones' },
  { value: 'umbrella', label: 'Sombrilla', icon: Umbrella, category: 'Operaciones' },
  { value: 'tent', label: 'Carpa', icon: Tent, category: 'Operaciones' },

  // Logistica / Movilidad
  { value: 'car', label: 'Auto', icon: Car, category: 'Logistica' },
  { value: 'truck', label: 'Camion', icon: Truck, category: 'Logistica' },
  { value: 'plane', label: 'Avion', icon: Plane, category: 'Logistica' },
  { value: 'package', label: 'Paquete', icon: Package, category: 'Logistica' },
  { value: 'package-open', label: 'Caja abierta', icon: PackageOpen, category: 'Logistica' },
  { value: 'shopping-cart', label: 'Carrito', icon: ShoppingCart, category: 'Logistica' },
  { value: 'wrench', label: 'Herramienta', icon: Wrench, category: 'Logistica' },

  // Servicios / Cocina
  { value: 'utensils', label: 'Cubiertos', icon: Utensils, category: 'Servicios' },
  { value: 'coffee', label: 'Cafe', icon: Utensils, category: 'Servicios' },
  { value: 'sparkles', label: 'Limpieza', icon: Sparkles, category: 'Servicios' },
  { value: 'paintbrush', label: 'Mantenimiento', icon: Paintbrush, category: 'Servicios' },
  { value: 'scissors', label: 'Tijeras', icon: Scissors, category: 'Servicios' },
  { value: 'gift', label: 'Regalo', icon: Gift, category: 'Servicios' },

  // Finanzas / Ventas
  { value: 'dollar-sign', label: 'Dolar', icon: DollarSign, category: 'Finanzas' },
  { value: 'badge-dollar-sign', label: 'Dinero', icon: BadgeDollarSign, category: 'Finanzas' },
  { value: 'credit-card', label: 'Tarjeta', icon: CreditCard, category: 'Finanzas' },
  { value: 'receipt', label: 'Recibo', icon: Receipt, category: 'Finanzas' },
  { value: 'bar-chart-3', label: 'Grafico', icon: BarChart3, category: 'Finanzas' },
  { value: 'file-text', label: 'Documento', icon: FileText, category: 'Finanzas' },
  { value: 'store', label: 'Tienda', icon: Store, category: 'Finanzas' },

  // Marketing / RRHH
  { value: 'megaphone', label: 'Megafono', icon: Megaphone, category: 'Marketing' },
  { value: 'users', label: 'Usuarios', icon: Users, category: 'RRHH' },
  { value: 'user-cog', label: 'Usuario config', icon: UserCog, category: 'RRHH' },
  { value: 'crown', label: 'Corona', icon: Crown, category: 'RRHH' },
  { value: 'shield', label: 'Escudo', icon: Shield, category: 'RRHH' },
  { value: 'hard-hat', label: 'Casco', icon: HardHat, category: 'RRHH' },
  { value: 'heart-pulse', label: 'Salud', icon: HeartPulse, category: 'RRHH' },

  // Modulos del sistema
  { value: 'clipboard-list', label: 'Tareas', icon: ClipboardList, category: 'Modulos' },
  { value: 'clock', label: 'Horario', icon: Clock, category: 'Modulos' },
  { value: 'calendar', label: 'Calendario', icon: Calendar, category: 'Modulos' },
  { value: 'id-card', label: 'ID', icon: IdCard, category: 'Modulos' },
  { value: 'puzzle', label: 'Modulo', icon: Puzzle, category: 'Modulos' },
  { value: 'code-2', label: 'Develops', icon: Code2, category: 'Modulos' },
  { value: 'layout-dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Modulos' },
  { value: 'sun', label: 'Dias libres', icon: Sun, category: 'Modulos' },
];

export function getIconByValue(value: string): LucideIcon | undefined {
  return ICON_OPTIONS.find((i) => i.value === value)?.icon;
}

export function getIconLabel(value: string): string {
  return ICON_OPTIONS.find((i) => i.value === value)?.label || value;
}

export function getIconsByCategory(): Record<string, IconOption[]> {
  return ICON_OPTIONS.reduce((acc, icon) => {
    if (!acc[icon.category]) acc[icon.category] = [];
    acc[icon.category].push(icon);
    return acc;
  }, {} as Record<string, IconOption[]>);
}

export const ICON_MAP: Record<string, LucideIcon> = ICON_OPTIONS.reduce((acc, icon) => {
  acc[icon.value] = icon.icon;
  return acc;
}, {} as Record<string, LucideIcon>);


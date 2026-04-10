// ═══════════════════════════════════════════════════════════════════
// APP PRINCIPAL - GALAPAGOS TASKS
// ═══════════════════════════════════════════════════════════════════

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { TasksProvider } from '@/hooks/useTasks';
import { ShiftsProvider } from '@/hooks/useShifts';
import { Layout } from '@/components/Layout';
import { Toaster } from '@/components/ui/sonner';

// ═══════════════════════════════════════════════════════════════════
// PÁGINAS
// ═══════════════════════════════════════════════════════════════════

// Login
import LoginScreen from '@/components/LoginScreen';

// Dashboard
import Dashboard from '@/components/Dashboard';

// Modules
import TasksModule from '@/components/modules/TasksModule';
import HorariosModule from '@/components/modules/HorariosModule';

function ReportesModule() {
  return (
    <Layout title="Reportes">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-green/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Reportes</h2>
        <p className="text-[#86868B]">Módulo en desarrollo</p>
      </div>
    </Layout>
  );
}

function OrdenesPagoModule() {
  return (
    <Layout title="Órdenes de Pago">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-orange/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Órdenes de Pago</h2>
        <p className="text-[#86868B]">Módulo en desarrollo</p>
      </div>
    </Layout>
  );
}

function DiveOpsModule() {
  return (
    <Layout title="Dive Ops">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-cyan/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Dive Ops</h2>
        <p className="text-[#86868B]">Módulo en desarrollo</p>
      </div>
    </Layout>
  );
}

function RequisicionesModule() {
  return (
    <Layout title="Requisiciones">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-yellow/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Requisiciones</h2>
        <p className="text-[#86868B]">Módulo en desarrollo</p>
      </div>
    </Layout>
  );
}

function MovilidadModule() {
  return (
    <Layout title="Movilidad">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-red/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Movilidad</h2>
        <p className="text-[#86868B]">Módulo en desarrollo</p>
      </div>
    </Layout>
  );
}

function VesselsModule() {
  return (
    <Layout title="Vessels">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-purple/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Vessels</h2>
        <p className="text-[#86868B]">Módulo en desarrollo</p>
      </div>
    </Layout>
  );
}

function DevelopsModule() {
  const { user } = useAuth();
  
  // Solo nivel 1 puede acceder
  if (!user || user.level !== 1) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <Layout title="Develops">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-apple-gray/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-apple-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-2">Develops</h2>
        <p className="text-[#86868B]">Configuración avanzada del sistema</p>
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RUTA PROTEGIDA
// ═══════════════════════════════════════════════════════════════════

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-corporate border-t-transparent rounded-full animate-spin" />
          <p className="text-[#86868B]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginScreen />} />

      {/* Dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Modules */}
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/horarios"
        element={
          <ProtectedRoute>
            <HorariosModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <ReportesModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ordenes-pago"
        element={
          <ProtectedRoute>
            <OrdenesPagoModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dive-ops"
        element={
          <ProtectedRoute>
            <DiveOpsModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requisiciones"
        element={
          <ProtectedRoute>
            <RequisicionesModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movilidad"
        element={
          <ProtectedRoute>
            <MovilidadModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vessels"
        element={
          <ProtectedRoute>
            <VesselsModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/develops"
        element={
          <ProtectedRoute>
            <DevelopsModule />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TasksProvider>
          <ShiftsProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </ShiftsProvider>
        </TasksProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

// frontend/src/App.jsx
import React, { useContext, useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
// Importe suas páginas
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import AgendaPage from "./pages/AgendaPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import UsersPage from "./pages/UsersPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import EstoquePage from "./pages/EstoquePage";
import OrdemServicoPage from "./pages/OrdemServicoPage";
import CadastrosPage from "./pages/CadastrosPage";

// Importe os arquivos CSS necessários
import "./App.css";
import "./styles/style.css";
import "./styles/auth.css";

// Importar ícones do Lucide React
import {
  Home,
  Calendar,
  Users,
  Settings,
  UserPlus,
  DollarSign,
  BarChart2,
  LogOut,
  Menu,
  X,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Car,
  BoxIcon,
  FileText,
  Database,
} from "lucide-react"; // Adicionado ChevronLeft e ChevronRight

// Componente do Sidebar
const Sidebar = ({
  user,
  userRole,
  logout,
  isMobileSidebarOpen,
  isDesktopSidebarCollapsed,
  toggleSidebar,
}) => {
  const location = useLocation(); // Hook para pegar a localização atual

  return (
    <aside
      className={`sidebar ${isMobileSidebarOpen ? "open" : ""} ${
        isDesktopSidebarCollapsed ? "collapsed" : ""
      }`}
    >
      <div className="sidebar-header">
        <div className="logo-icon-placeholder">
          {/* Ícone SVG minimalista para a logo */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-car"
          >
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-1V9c0-.6-.4-1-1-1H9c-.6 0-1 .4-1 1v4H4c-.6 0-1 .4-1 1v3c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>
        {/* Título da App, escondido quando sidebar colapsado */}
        <h2 className="app-title">Syncro Auto</h2>
      </div>
      <nav className="sidebar-nav">
        {/* Adicionando a classe 'active' dinamicamente */}
        <Link
          to="/home"
          className={`sidebar-nav-item ${
            location.pathname === "/home" ? "active" : ""
          }`}
          onClick={toggleSidebar}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link
          to="/agenda"
          className={`sidebar-nav-item ${
            location.pathname === "/agenda" ? "active" : ""
          }`}
          onClick={toggleSidebar}
        >
          <Calendar size={20} />
          <span>Agenda</span>
        </Link>
        {userRole === "admin" && (
          <Link
            to="/usuarios"
            className={`sidebar-nav-item ${
              location.pathname === "/usuarios" ? "active" : ""
            }`}
            onClick={toggleSidebar}
          >
            <UserPlus size={20} />
            <span>Usuários</span>
          </Link>
        )}

        {(userRole === "admin" || userRole === "gerente") && (
          <Link
            to="/cadastros/clientes"
            className={`sidebar-nav-item ${
              location.pathname.startsWith("/cadastros") ? "active" : ""
            }`}
            onClick={toggleSidebar}
          >
            <Database size={20} /> {/* Ou outro ícone que preferir */}
            <span>Cadastros</span>
          </Link>
        )}

        <Link
          to="/ordens-servico"
          className={`sidebar-nav-item ${
            location.pathname === "/ordens-servico" ? "active" : ""
          }`}
          onClick={toggleSidebar}
        >
          <FileText size={20} />
          <span>Ordens de Serviço</span>
        </Link>

        <Link
          to="/estoque"
          className={`sidebar-nav-item ${
            location.pathname === "/estoque" ? "active" : ""
          }`}
          onClick={toggleSidebar}
        >
          <BoxIcon size={20} />
          <span>Estoque</span>
        </Link>

        <Link
          to="/financeiro"
          className={`sidebar-nav-item ${
            location.pathname === "/financeiro" ? "active" : ""
          }`}
          onClick={toggleSidebar}
        >
          <DollarSign size={20} />
          <span>Financeiro</span>
        </Link>
        {(userRole === "admin" || userRole === "gerente") && (
          <Link
            to="/configuracoes"
            className={`sidebar-nav-item ${
              location.pathname === "/configuracoes" ? "active" : ""
            }`}
            onClick={toggleSidebar}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </Link>
        )}
        <Link
          to="/relatorios"
          className={`sidebar-nav-item ${
            location.pathname === "/relatorios" ? "active" : ""
          }`}
          onClick={toggleSidebar}
        >
          <BarChart2 size={20} />
          <span>Relatórios</span>
        </Link>
      </nav>
      <div className="sidebar-footer">
        <div className="user-info-sidebar">
          <span className="user-name">{user.nome_usuario}</span>
          <span className="user-email">{user.email}</span>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

// Componente de Cabeçalho Principal
const AppHeader = ({ user }) => {
  return (
    <header className="app-main-header">
      <div className="header-greeting">
        <h1 className="header-title">
          Bem-vindo, {user?.nome_usuario || "Usuário"}!{" "}
        </h1>
      </div>
    </header>
  );
};

// Componente para o Layout da aplicação
const AppLayout = ({ children }) => {
  const { user, userRole, logout } = useContext(AuthContext);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 992); // Estado para detectar visualização mobile

  // Efeito para ajustar o estado do sidebar em redimensionamentos de tela
  useEffect(() => {
    const handleResize = () => {
      const currentIsMobileView = window.innerWidth <= 992;
      setIsMobileView(currentIsMobileView);

      // Se a tela for maior que 992px, garante que o sidebar mobile esteja fechado
      if (!currentIsMobileView) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Função para alternar a visibilidade/estado do sidebar
  const toggleSidebar = () => {
    if (window.innerWidth <= 992) {
      // Comportamento para mobile/tablet (overlay)
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      // Comportamento para desktop (colapsar/expandir)
      setIsDesktopSidebarCollapsed((prev) => !prev);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="app-container">
      {/* Botão de toggle para mobile - RENDERIZADO APENAS SE FOR MOBILE VIEW */}
      {isMobileView && !isMobileSidebarOpen && (
        <button
          className="sidebar-toggle open-sidebar-btn"
          onClick={toggleSidebar}
        >
          <Menu size={24} /> {/* Ele sempre mostra o ícone de Menu */}
        </button>
      )}

      <Sidebar
        user={user}
        userRole={userRole}
        logout={logout}
        isMobileSidebarOpen={isMobileSidebarOpen}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />

      {/* Adiciona uma overlay transparente que fecha o sidebar mobile ao clicar fora */}
      {isMobileSidebarOpen && isMobileView && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <div
        className={`main-content-wrapper ${
          isMobileSidebarOpen ? "mobile-shifted" : ""
        } ${isDesktopSidebarCollapsed ? "desktop-collapsed" : ""}`}
      >
        {/* Passa as props de toggleSidebar e isDesktopSidebarCollapsed para o AppHeader */}
        <AppHeader
          user={user}
          logout={logout}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
        <main className="main-content-pages">{children}</main>
      </div>
    </div>
  );
};

// Componente de Rota Protegida (mantém-se o mesmo)
const PrivateRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, userRole, loadingAuth } = useContext(AuthContext);

  if (loadingAuth) {
    return <div className="loading-screen">Carregando autenticação...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

function App() {
  const { loadingAuth, isAuthenticated } = useContext(AuthContext);

  if (loadingAuth) {
    return <div className="loading-screen">Inicializando aplicação...</div>;
  }

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Rotas Protegidas */}
      <Route
        path="/home"
        element={
          <PrivateRoute
            requiredRoles={[
              "admin",
              "gerente",
              "gestor",
              "atendente",
              "tecnico",
            ]}
          >
            <AppLayout>
              <HomePage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/agenda"
        element={
          <PrivateRoute
            requiredRoles={[
              "admin",
              "gerente",
              "atendente",
              "tecnico",
              "gestor",
            ]}
          >
            <AppLayout>
              <AgendaPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/cadastros/:tipo" // O :tipo é um parâmetro dinâmico
        element={
          <PrivateRoute requiredRoles={["admin", "gerente", "atendente"]}>
            <AppLayout>
              <CadastrosPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/cadastros"
        element={<Navigate to="/cadastros/clientes" replace />}
      />
      <Route
        path="/usuarios"
        element={
          <PrivateRoute requiredRoles={["admin", "gerente"]}>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/estoque"
        element={
          <PrivateRoute requiredRoles={["admin", "gerente"]}>
            <AppLayout>
              <EstoquePage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/financeiro"
        element={
          <PrivateRoute requiredRoles={["admin", "gerente"]}>
            <AppLayout>
              <FinanceiroPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      {/* ROTA CENTRALIZADA DE CONFIGURAÇÕES */}
      <Route
        path="/configuracoes" // URL para a página de configurações gerais
        element={
          <PrivateRoute requiredRoles={["admin", "gestor"]}>
            <AppLayout>
              <ConfiguracoesPage />
            </AppLayout>{" "}
            {/* Renderiza a página centralizada */}
          </PrivateRoute>
        }
      />
      <Route
        path="/relatorios" // URL para a página de configurações gerais
        element={
          <PrivateRoute requiredRoles={["admin", "gestor"]}>
            <AppLayout>
              <RelatoriosPage />
            </AppLayout>{" "}
            {/* Renderiza a página centralizada */}
          </PrivateRoute>
        }
      />
      <Route
        path="/ordens-servico"
        element={
          <PrivateRoute
            requiredRoles={["admin", "gerente", "atendente", "tecnico"]}
          >
            <AppLayout>
              <OrdemServicoPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      {/* Catch-all para rotas não encontradas */}
      <Route
        path="*"
        element={
          <div className="empty-state">
            <h2>404 - Página Não Encontrada</h2>
            <p>
              <Link to="/home" className="button-link">
                Voltar para a Home
              </Link>
            </p>
          </div>
        }
      />
    </Routes>
  );
}

export default App;

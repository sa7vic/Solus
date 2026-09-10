import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "./components/auth/LoginPage.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import { WorkbenchProvider } from "./context/WorkbenchContext.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import AgentsPage from "./pages/AgentsPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import KnowledgeBasePage from "./pages/KnowledgeBasePage.jsx";
import ModelsPage from "./pages/ModelsPage.jsx";
import ActivityPage from "./pages/ActivityPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import WorkbenchPage from "./pages/WorkbenchPage.jsx";
import MarketplacePage from "./pages/MarketplacePage.jsx";

function WithWorkbench({ children }) {
  return <WorkbenchProvider>{children}</WorkbenchProvider>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <WithWorkbench>
          <AppShell />
        </WithWorkbench>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "chat/:sessionId", element: <ChatPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "knowledge-base", element: <KnowledgeBasePage /> },
      { path: "models", element: <ModelsPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "profile", element: <Navigate to="/settings" replace /> },
      { path: "workbench", element: <WorkbenchPage /> },
    ]
  }
]);

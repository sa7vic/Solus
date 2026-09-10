import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  
  if (user && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }
  
  if (!user && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

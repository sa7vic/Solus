import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RunProvider } from "./context/RunContext.jsx";
import { router } from "./router.jsx";

export default function App() {
  return (
    <AuthProvider>
      <RunProvider>
        <RouterProvider router={router} />
      </RunProvider>
    </AuthProvider>
  );
}

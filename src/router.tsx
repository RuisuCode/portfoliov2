import { createBrowserRouter } from "react-router";
import Portfolio from "./App";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminHabilities from "./pages/AdminHabilities";
import AdminHome from "./pages/AdminHome";
import AdminProjects from "./pages/AdminProjects";
import LoginAdmin from "./pages/loginAdmin";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Portfolio />,
  },
  {
    path: "/admin/login",
    element: <LoginAdmin />,
  },
  {
    path: "/admin",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminHome /> },
          { path: "habilities", element: <AdminHabilities /> },
          { path: "projects", element: <AdminProjects /> },
        ],
      },
    ],
  },
]);

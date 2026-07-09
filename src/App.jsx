import { useState, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import AppRoutes from "./routes/AppRoutes";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import { ThemeProvider } from "./context/ThemeContext";

// Map URL pathnames to page keys used by AppRoutes
const pathToPage = {
  "/": "landing",
  "/login": "login",
  "/auth": "login",
  "/register": "register",
  "/dashboard": "dashboard",
  "/equipment": "equipment",
  "/maintenance": "maintenance",
  "/tasks": "tasks",
  "/orders": "orders",
  "/about": "about",
  "/contact": "contact",
  "/blog": "blog",
};

const pageToPath = Object.fromEntries(
  Object.entries(pathToPage).map(([path, page]) => [page, path])
);

function getInitialPage() {
  const path = window.location.pathname;
  return pathToPage[path] || "landing";
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [pageData, setPageData] = useState(null);

  const handleNavigate = (page, data = null) => {
    setCurrentPage(page);
    setPageData(data);
    // Update browser URL bar
    const path = pageToPath[page] || "/";
    window.history.pushState({ page }, "", path);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = (e) => {
      const page = e.state?.page || getInitialPage();
      setCurrentPage(page);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const noLayoutPages = ["login", "register"];
  const isAuthPage = noLayoutPages.includes(currentPage);

  return (
    <div
      className="flex flex-col min-h-screen bg-surface text-primary transition-colors duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {!isAuthPage && (
        <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      )}

      <main className="flex-1">
        {currentPage === "about" ? (
          <AboutPage />
        ) : currentPage === "contact" ? (
          <ContactPage />
        ) : (
          <AppRoutes 
            currentPage={currentPage} 
            onNavigate={handleNavigate} 
            pageData={pageData} 
          />
        )}
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
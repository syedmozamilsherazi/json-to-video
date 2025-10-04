import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, FileText, Sparkles, Crown } from "lucide-react";
import ApiKeyManager from "./ApiKeyManager";
import { useWhop } from "@/contexts/WhopContext";

const Navigation = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  const { hasAccess, login } = useWhop();
  
  return <nav className="border-b border-[#E0E0E0] bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {isHomePage && !hasAccess && (
              <button
                onClick={login}
                className="px-6 py-2 bg-[#000000] hover:bg-[#000000]/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Already subscribed? Login
              </button>
            )}
            {!isHomePage && (
              <>
                <div className="w-px h-6 bg-[#E0E0E0]"></div>
                <ApiKeyManager />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>;
};
export default Navigation;
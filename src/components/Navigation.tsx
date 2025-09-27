import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, FileText, Sparkles, Crown } from "lucide-react";
import ApiKeyManager from "./ApiKeyManager";
const Navigation = () => {
  const location = useLocation();
  return <nav className="border-b border-[#E5E7EB] bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-px h-6 bg-[#E5E7EB]"></div>
            <ApiKeyManager />
          </div>
        </div>
      </div>
    </nav>;
};
export default Navigation;
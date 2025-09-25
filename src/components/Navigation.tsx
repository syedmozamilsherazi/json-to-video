import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, FileText, Sparkles } from "lucide-react";
import ApiKeyManager from "./ApiKeyManager";
import ThemeToggle from "./ThemeToggle";
const Navigation = () => {
  const location = useLocation();
  return <nav className="border-b border-border/30 bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 dark:bg-card/90 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="group flex items-center gap-3 text-xl font-bold transition-all">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
                MediaStudio
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-px h-6 bg-border/50"></div>
            <ApiKeyManager />
          </div>
        </div>
      </div>
    </nav>;
};
export default Navigation;
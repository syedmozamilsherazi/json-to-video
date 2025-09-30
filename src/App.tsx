import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ApiKeyProvider } from "@/contexts/ApiKeyContext";
import { WhopProvider } from "@/contexts/WhopContext";
import Index from "./pages/Index";
import ExperiencePage from "./pages/ExperiencePage";
import OAuthCallback from "./pages/OAuthCallback";
import OAuthError from "./pages/OAuthError";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ApiKeyProvider>
        <WhopProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<ExperiencePage />} />
                <Route path="/home" element={<ExperiencePage />} />
                <Route path="/generate" element={<Index />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/oauth/error" element={<OAuthError />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WhopProvider>
      </ApiKeyProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useWhop } from "../contexts/WhopContext";
import { PaymentButton } from "../components/PaymentButton";
import Homepage from "./Homepage";
import Navigation from "@/components/Navigation";

export default function ExperiencePage() {
  const { hasAccess, isCheckingAccess, user, login } = useWhop();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasShownNoAccessToast = useRef(false);
  const prevAccess = useRef<boolean | null>(null);

  // Redirect to generator when access becomes true
  useEffect(() => {
    if (!isCheckingAccess && hasAccess) {
      if (prevAccess.current !== true) {
        toast({ title: "Access granted", description: "Welcome! Redirecting to the generator..." });
      }
      prevAccess.current = true;
      navigate("/generate", { replace: true });
    }
  }, [hasAccess, isCheckingAccess, navigate, toast]);

  // Show a toast when the user does not have access
  useEffect(() => {
    if (!isCheckingAccess && !hasAccess && !hasShownNoAccessToast.current) {
      toast({
        title: "No access",
        description: "You don't have access. Please subscribe to continue.",
        variant: "destructive",
      });
      hasShownNoAccessToast.current = true;
      prevAccess.current = false;
    }
  }, [hasAccess, isCheckingAccess, toast]);

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {hasAccess ? (
        <div className="container mx-auto px-4 py-8">
          {user && (
            <div className="bg-green-50 border border-green-200 p-3 mb-4 rounded-md">
              <p className="text-sm text-green-700">
                Welcome back, {user.username || user.email || 'user'}! ✅ Premium access active
              </p>
            </div>
          )}
          <Homepage />
        </div>
      ) : (
        <div className="flex justify-center items-center h-screen px-8">
          <UpsellScreen onLogin={login} />
        </div>
      )}
    </div>
  );
}

interface UpsellScreenProps {
  onLogin: () => void;
}

function UpsellScreen({ onLogin }: UpsellScreenProps) {
  return (
    <div className="p-8 rounded-2xl shadow-sm border border-[#E0E0E0] bg-card text-foreground space-y-6 max-w-md w-full text-center">
      <h2 className="text-2xl font-bold text-[#000000]">Unlock Premium</h2>
      <p className="text-sm text-[#6B6F76]">Get premium access to all features with cross-device sync</p>
      
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 text-lg">
          <span className="line-through text-[#6B6F76]">$19.99</span>
          <span className="font-semibold text-[#000000]">$9.99</span>
          <span className="text-sm text-[#000000]">/ mo</span>
        </div>
        
        <div className="text-xs text-[#6B6F76] space-y-1">
          <p>✅ Access on any device</p>
          <p>✅ Automatic cloud sync</p>
          <p>✅ Premium features</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <PaymentButton displayText="🛒 Subscribe Now" />
        
        <div className="text-xs text-[#6B6F76] flex items-center gap-2">
          <div className="flex-1 border-t border-gray-200"></div>
          <span>Already subscribed?</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={onLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Login with Whop
          </button>
        </div>
      </div>
      
      <div className="text-xs text-[#6B6F76] pt-2 border-t border-gray-100 space-y-1">
        <p><strong>How it works:</strong></p>
        <p>1. Subscribe → 2. Connect account → 3. Access unlocked!</p>
        <p>Works on all your devices automatically ✨</p>
      </div>
    </div>
  );
}

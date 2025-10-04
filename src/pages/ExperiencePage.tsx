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
            <div className="bg-[#F2F2F2] border border-[#E0E0E0] p-3 mb-4 rounded-md">
              <p className="text-sm text-[#000000]">
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
    <div className="w-full max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-[#000000] mb-6">
          Create Professional Videos
          <span className="block text-4xl text-[#6E6E6E] mt-2">From JSON in Minutes</span>
        </h1>
        <p className="text-xl text-[#6E6E6E] mb-8 max-w-3xl mx-auto">
          Transform your content into stunning videos with our AI-powered video generator. 
          Upload audio, add visuals, and generate professional videos automatically.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="p-6 bg-[#F2F2F2] rounded-xl border border-[#E0E0E0] text-center">
          <div className="w-12 h-12 bg-[#E0E0E0] rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#000000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#000000] mb-2">Smart Video Generation</h3>
          <p className="text-sm text-[#6E6E6E]">AI-powered video creation from your content and audio</p>
        </div>

        <div className="p-6 bg-[#F2F2F2] rounded-xl border border-[#E0E0E0] text-center">
          <div className="w-12 h-12 bg-[#E0E0E0] rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#000000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#000000] mb-2">Auto Subtitles</h3>
          <p className="text-sm text-[#6E6E6E]">Automatic subtitle generation with professional styling</p>
        </div>

        <div className="p-6 bg-[#F2F2F2] rounded-xl border border-[#E0E0E0] text-center">
          <div className="w-12 h-12 bg-[#E0E0E0] rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#000000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#000000] mb-2">Lightning Fast</h3>
          <p className="text-sm text-[#6E6E6E]">Generate videos in minutes, not hours</p>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-[#F2F2F2] rounded-2xl border border-[#E0E0E0] p-8 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#000000] mb-4">Simple, Transparent Pricing</h2>
          <p className="text-[#6E6E6E]">Get started with our premium plan</p>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl border border-[#E0E0E0] p-6 text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 text-3xl font-bold text-[#000000] mb-2">
                <span className="line-through text-[#6E6E6E] text-xl">$19.99</span>
                <span className="text-[#000000]">$9.99</span>
                <span className="text-lg text-[#6E6E6E]">/month</span>
              </div>
              <p className="text-sm text-[#6E6E6E]">50% off for early adopters</p>
            </div>
            
            <div className="space-y-3 mb-6 text-sm text-[#000000]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span>Unlimited video generation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span>Auto subtitle generation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span>HD video output</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span>Cloud storage & sync</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span>Priority support</span>
              </div>
            </div>
            
            <PaymentButton displayText="🛒 Subscribe Now - $9.99/month" />
          </div>
        </div>
      </div>

      {/* Login Section */}
      <div className="text-center">
        <div className="bg-card rounded-xl border border-[#E0E0E0] p-6 max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-[#000000] mb-2">Already subscribed?</h3>
          <p className="text-sm text-[#6E6E6E] mb-4">Login to access your account</p>
          
          <button
            onClick={onLogin}
            className="w-full bg-[#000000] hover:bg-[#000000]/90 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Login with Whop
          </button>
        </div>
      </div>
    </div>
  );
}

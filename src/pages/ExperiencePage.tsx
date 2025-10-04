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
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2F2F2] rounded-full border border-[#E0E0E0] text-sm text-[#6E6E6E] mb-8">
          <div className="w-2 h-2 bg-[#000000] rounded-full animate-pulse"></div>
          <span>AI-Powered Video Generation</span>
        </div>
        
        <h1 className="text-6xl font-bold text-[#000000] mb-6 leading-tight">
          Create Professional Videos
          <span className="block text-5xl text-[#6E6E6E] mt-3 font-normal">From Content in Minutes</span>
        </h1>
        
        <p className="text-xl text-[#6E6E6E] mb-12 max-w-4xl mx-auto leading-relaxed">
          Transform your content into stunning, professional videos with our AI-powered generator. 
          Upload audio, add visuals, and generate high-quality videos automatically with professional subtitles.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onLogin}
            className="px-8 py-4 bg-[#000000] hover:bg-[#000000]/90 text-white rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-lg"
          >
            Get Started Free
          </button>
          <div className="flex items-center gap-2 text-[#6E6E6E]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>No credit card required</span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#000000] mb-4">Why Choose Our Platform?</h2>
          <p className="text-lg text-[#6E6E6E] max-w-2xl mx-auto">
            Powerful features designed to make video creation effortless and professional
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="group p-8 bg-[#F2F2F2] rounded-2xl border border-[#E0E0E0] text-center hover:bg-[#E0E0E0] transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-[#E0E0E0] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#000000] transition-colors">
              <svg className="w-8 h-8 text-[#000000] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#000000] mb-3">Smart AI Generation</h3>
            <p className="text-[#6E6E6E] leading-relaxed">Advanced AI algorithms automatically create professional videos from your content and audio files</p>
          </div>

          <div className="group p-8 bg-[#F2F2F2] rounded-2xl border border-[#E0E0E0] text-center hover:bg-[#E0E0E0] transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-[#E0E0E0] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#000000] transition-colors">
              <svg className="w-8 h-8 text-[#000000] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#000000] mb-3">Auto Subtitles</h3>
            <p className="text-[#6E6E6E] leading-relaxed">Professional subtitle generation with custom styling, perfect timing, and multiple language support</p>
          </div>

          <div className="group p-8 bg-[#F2F2F2] rounded-2xl border border-[#E0E0E0] text-center hover:bg-[#E0E0E0] transition-all duration-300 hover:scale-105">
            <div className="w-16 h-16 bg-[#E0E0E0] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#000000] transition-colors">
              <svg className="w-8 h-8 text-[#000000] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#000000] mb-3">Lightning Fast</h3>
            <p className="text-[#6E6E6E] leading-relaxed">Generate professional videos in minutes, not hours. Our optimized infrastructure ensures quick processing</p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#000000] mb-4">How It Works</h2>
          <p className="text-lg text-[#6E6E6E] max-w-2xl mx-auto">
            Create professional videos in just 3 simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#000000] text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">1</div>
            <h3 className="text-xl font-bold text-[#000000] mb-3">Upload Your Content</h3>
            <p className="text-[#6E6E6E]">Upload your audio file and add video/image URLs or choose from our style library</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-[#000000] text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">2</div>
            <h3 className="text-xl font-bold text-[#000000] mb-3">AI Processing</h3>
            <p className="text-[#6E6E6E]">Our AI automatically syncs your content, generates subtitles, and creates the perfect video</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-[#000000] text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">3</div>
            <h3 className="text-xl font-bold text-[#000000] mb-3">Download & Share</h3>
            <p className="text-[#6E6E6E]">Get your professional video in HD quality, ready to share on any platform</p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#000000] mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-[#6E6E6E] max-w-2xl mx-auto">
            Get started with our premium plan. No hidden fees, cancel anytime.
          </p>
        </div>
        
        <div className="max-w-lg mx-auto">
          <div className="bg-[#F2F2F2] rounded-3xl border border-[#E0E0E0] p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#000000] text-white px-4 py-2 rounded-bl-2xl text-sm font-semibold">
              50% OFF
            </div>
            
            <div className="mb-8">
              <div className="flex items-center justify-center gap-4 text-4xl font-bold text-[#000000] mb-2">
                <span className="line-through text-[#6E6E6E] text-2xl">$19.99</span>
                <span className="text-[#000000]">$9.99</span>
                <span className="text-xl text-[#6E6E6E]">/month</span>
              </div>
              <p className="text-[#6E6E6E]">Limited time offer for early adopters</p>
            </div>
            
            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span className="text-[#000000] font-medium">Unlimited video generation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span className="text-[#000000] font-medium">Auto subtitle generation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span className="text-[#000000] font-medium">HD video output (1080p)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span className="text-[#000000] font-medium">Cloud storage & sync</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span className="text-[#000000] font-medium">Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#000000] rounded-full"></div>
                <span className="text-[#000000] font-medium">Style library access</span>
              </div>
            </div>
            
            <PaymentButton displayText="🛒 Subscribe Now - $9.99/month" />
          </div>
        </div>
      </div>

      {/* Login Section */}
      <div className="text-center">
        <div className="bg-[#F2F2F2] rounded-2xl border border-[#E0E0E0] p-8 max-w-md mx-auto">
          <h3 className="text-2xl font-bold text-[#000000] mb-2">Already subscribed?</h3>
          <p className="text-[#6E6E6E] mb-6">Login to access your account and start creating</p>
          
          <button
            onClick={onLogin}
            className="w-full bg-[#000000] hover:bg-[#000000]/90 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Login with Whop
          </button>
        </div>
      </div>
    </div>
  );
}

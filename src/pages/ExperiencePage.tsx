import { useEffect, useState } from "react";
import { PaymentButton } from "../components/PaymentButton";
import Homepage from "./Homepage";

export default function ExperiencePage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true);
      try {
        // Check if we're returning from Whop with auth info
        const urlParams = new URLSearchParams(window.location.search);
        const whopToken = urlParams.get('token') || urlParams.get('access_token');
        const whopError = urlParams.get('error');
        
        // Handle Whop redirect with token
        if (whopToken) {
          localStorage.setItem('whop_token', whopToken);
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Handle Whop redirect with error
        if (whopError) {
          console.error('Whop authentication error:', whopError);
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        const token = whopToken || localStorage.getItem("whop_token");
        
        if (!token) {
          setHasAccess(false);
          setLoading(false);
          return;
        }
        
        const res = await fetch("/api/check-access", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          console.error('Access check failed:', res.status, res.statusText);
          // If 401/403, clear invalid token
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('whop_token');
          }
          setHasAccess(false);
          return;
        }
        
        const data = await res.json();
        setHasAccess(data.hasAccess);
      } catch (err) {
        console.error('Access check error:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div>
      {hasAccess ? <Homepage /> : (
        <div className="flex justify-center items-center h-screen px-8">
          <UpsellScreen />
        </div>
      )}
    </div>
  );
}

function UpsellScreen() {
  return (
    <div className="p-8 rounded-2xl shadow-sm border border-[#E5E7EB] bg-white text-foreground space-y-6 max-w-sm w-full text-center">
      <h2 className="text-2xl font-bold text-[#000000]">Unlock Premium</h2>
      <p className="text-sm text-[#6B6F76]">Subscribe to access all features</p>
      <div className="flex items-center justify-center gap-3 text-lg">
        <span className="line-through text-[#6B6F76]">$19.99</span>
        <span className="font-semibold text-[#000000]">$9.99</span>
        <span className="text-sm text-[#000000]">/ mo</span>
      </div>
      <PaymentButton planId={import.meta.env.VITE_WHOP_MONTHLY_PLAN_ID!} displayText="Subscribe Now" />
    </div>
  );
}

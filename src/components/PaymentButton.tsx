import { useState, useCallback } from "react";
import { useIframeSdk } from "@/contexts/WhopContext";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

export function PaymentButton({ displayText, planId }: { displayText: string; planId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const iframeSdk = useIframeSdk();

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await iframeSdk.inAppPurchase({ planId });

      if (result.status === "error") {
        alert(result.error);
        setIsLoading(false);
        return;
      }

      // If redirect status, the SDK will handle the redirect
      // No need to reload as we're navigating away
      if (result.status === "redirect") {
        // Loading will continue until redirect happens
        return;
      }

      // For other statuses (like success with token)
      if (result.token) {
        localStorage.setItem("whop_token", result.token);
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setIsLoading(false);
    }
  }, [planId, iframeSdk]);

  return (
    <Button 
      onClick={handleClick} 
      disabled={isLoading}
      variant="neutralSelected"
      className="w-full h-12 text-base font-semibold rounded-xl text-[#6B6F76] hover:text-[#000000]"
      size="lg"
    >
      {isLoading ? (
<div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
<div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5" />
          <span>{displayText}</span>
        </div>
      )}
    </Button>
  );
}
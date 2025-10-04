import { useState, useCallback } from "react";
import { useIframeSdk, useWhop } from "@/contexts/WhopContext";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

interface PaymentButtonProps {
  displayText: string;
  planId?: string;
}

export function PaymentButton({ displayText, planId }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const iframeSdk = useIframeSdk();
  const { refreshAccess } = useWhop();
  
  // Use the plan ID from props or environment variable
  const actualPlanId = planId || 'plan_w7rTs220QFTAC';

  const handleClick = useCallback(async () => {
    if (!actualPlanId) {
      alert('Plan ID not configured. Please contact support.');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Starting checkout for plan:', actualPlanId);
      const timeout = setTimeout(() => {
        // Fallback in case redirect failed
        setIsLoading(false);
      }, 10000);

      const result = await iframeSdk.inAppPurchase({ planId: actualPlanId });

      if (result.status === "error") {
        alert(result.error);
        clearTimeout(timeout);
        setIsLoading(false);
        return;
      }

      // If redirect status, the SDK will handle the redirect to Whop checkout
      if (result.status === "redirect") {
        console.log('Redirecting to Whop checkout...');
        // Keep spinner until redirect; timeout will clear if something goes wrong
        return;
      }

      // After successful payment and redirect back, refresh access status
      await refreshAccess();
      clearTimeout(timeout);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Payment error:', error);
      setIsLoading(false);
      alert('Payment failed. Please try again.');
    }
  }, [actualPlanId, iframeSdk, refreshAccess]);

  return (
    <Button 
      onClick={handleClick} 
      disabled={isLoading}
      className="w-full h-12 text-base font-semibold bg-[#000000] hover:bg-[#000000]/90 text-white rounded-xl shadow-sm disabled:opacity-50"
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
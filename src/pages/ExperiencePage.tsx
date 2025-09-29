import { useWhop } from "../contexts/WhopContext";
import { PaymentButton } from "../components/PaymentButton";
import Homepage from "./Homepage";

export default function ExperiencePage() {
  const { hasAccess, isCheckingAccess, user, login } = useWhop();

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
    <div>
      {hasAccess ? (
        <div>
          {user && (
            <div className="bg-green-50 border border-green-200 p-3 mb-4">
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
    <div className="p-8 rounded-2xl shadow-sm border border-[#E5E7EB] bg-white text-foreground space-y-6 max-w-md w-full text-center">
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
        <button
          onClick={onLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Login with Whop
        </button>
        
        <p className="text-xs text-[#6B6F76]">
          Don't have a subscription yet?
        </p>
        
        <PaymentButton displayText="Subscribe Now" />
      </div>
      
      <p className="text-xs text-[#6B6F76] pt-2 border-t border-gray-100">
        Your subscription works across all your devices automatically
      </p>
    </div>
  );
}

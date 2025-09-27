import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Key, X } from 'lucide-react';
import { useApiKey } from '@/contexts/ApiKeyContext';

const ApiKeyManager = () => {
  const { apiKey, updateApiKey, clearApiKey, hasApiKey } = useApiKey();
  const [tempApiKey, setTempApiKey] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveApiKey = () => {
    updateApiKey(tempApiKey);
    setTempApiKey('');
    setIsDialogOpen(false);
  };

  const handleDialogOpen = (open: boolean) => {
    if (open) {
      setTempApiKey(apiKey);
    } else {
      setTempApiKey('');
    }
    setIsDialogOpen(open);
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg font-medium transition-colors border-[#E0E0E0] text-[#6E6E6E] bg-transparent hover:bg-[#F2F2F2]"
        >
          <Key className="h-4 w-4" />
          <span className="text-sm whitespace-nowrap">
            {hasApiKey ? "API Key" : "Enter API Key"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-[#E0E0E0] bg-white">
        <DialogHeader>
          <DialogTitle>JSON2Video API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your JSON2Video API key"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="font-mono bg-white border-[#E0E0E0] focus:border-[#000000] transition-colors"
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored only for this browser session and cleared when you close the browser.
            </p>
          </div>
          <div className="flex justify-between gap-2">
            {hasApiKey && (
              <Button
                variant="outline"
                onClick={handleClearApiKey}
                className="flex items-center gap-2 border-[#E0E0E0] text-[#6E6E6E] hover:bg-[#F2F2F2]"
              >
                <X className="h-4 w-4" />
                Clear Key
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-[#E0E0E0] text-[#6E6E6E] hover:bg-[#F2F2F2]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                className="bg-[#000000] hover:bg-[#000000]/90 text-white font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Key
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyManager;
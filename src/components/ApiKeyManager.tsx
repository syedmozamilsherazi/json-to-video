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
          className={`flex items-center gap-2 px-3 py-2 h-9 rounded-lg font-medium transition-all duration-200 ${
            hasApiKey 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50" 
              : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300 dark:bg-orange-950/50 dark:border-orange-800/50 dark:text-orange-300 dark:hover:bg-orange-900/50"
          }`}
        >
          <Key className="h-4 w-4" />
          <span className="text-sm whitespace-nowrap">
            {hasApiKey ? "API Key" : "Enter API Key"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-border/50 dark:border-slate-700/50 bg-card/95 dark:bg-card/95 backdrop-blur-sm">
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
              className="font-mono bg-background/50 dark:bg-slate-800/50 border-border/60 dark:border-slate-600/60 focus:border-primary dark:focus:border-purple-400 transition-colors"
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
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-800/50 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Key
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="hover:bg-secondary/80 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-700 hover:via-purple-600 hover:to-indigo-700 dark:from-purple-500 dark:via-purple-400 dark:to-indigo-500 dark:hover:from-purple-600 dark:hover:via-purple-500 dark:hover:to-indigo-600 text-white font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
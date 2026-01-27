import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Copy, RefreshCw, Eye, EyeOff, Key, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ApiKeyData {
  api_key: string;
  created_at: string;
  last_used_at: string | null;
  is_new?: boolean;
  regenerated?: boolean;
}

export function ApiKeySection() {
  const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchApiKey = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-key`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch API key');
      const data = await response.json();
      setApiKey(data);
    } catch (error) {
      console.error('Error fetching API key:', error);
      toast.error('Failed to load API key');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  const handleCopy = async () => {
    if (!apiKey?.api_key) return;
    await navigator.clipboard.writeText(apiKey.api_key);
    setCopied(true);
    toast.success('API key copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerating will invalidate your current API key. Continue?')) return;

    setIsRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-key`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to regenerate');
      const data = await response.json();
      setApiKey(data);
      setShowKey(true);
      toast.success('API key regenerated');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  const maskedKey = apiKey?.api_key 
    ? `${apiKey.api_key.slice(0, 8)}${'•'.repeat(24)}${apiKey.api_key.slice(-4)}`
    : '';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiDocsUrl = `${supabaseUrl}/functions/v1/api`;
  const mcpUrl = `${supabaseUrl}/functions/v1/mcp`;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Use your API key to access your fitness data from external apps, automations, or AI assistants.
      </div>

      {/* API Key Display */}
      <div className="border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Your API Key</span>
          {apiKey?.last_used_at && (
            <span className="text-2xs text-muted-foreground">
              Last used: {new Date(apiKey.last_used_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="h-10 bg-muted animate-pulse" />
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 text-sm font-mono overflow-hidden">
              {showKey ? apiKey?.api_key : maskedKey}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              title="Copy"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating || isLoading}
          className="w-full"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRegenerating && "animate-spin")} />
          {isRegenerating ? 'Regenerating...' : 'Regenerate Key'}
        </Button>
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Endpoints</div>
        
        <div className="space-y-2">
          <div className="border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">REST API</span>
              <a 
                href={apiDocsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <code className="text-2xs text-muted-foreground break-all">
              {apiDocsUrl}
            </code>
            <div className="mt-2 text-2xs text-muted-foreground">
              Header: <code className="bg-muted px-1">X-API-Key: your_key</code>
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">MCP Server</span>
              <a 
                href={mcpUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <code className="text-2xs text-muted-foreground break-all">
              {mcpUrl}
            </code>
            <div className="mt-2 text-2xs text-muted-foreground">
              For Claude Desktop &amp; AI assistants
            </div>
          </div>
        </div>
      </div>

      {/* Available Endpoints */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Available Data</div>
        <div className="grid grid-cols-2 gap-2 text-2xs">
          {[
            'GET /workouts',
            'GET /workouts/:id',
            'GET /exercises',
            'GET /meals',
            'GET /water',
            'GET /metrics/daily',
            'GET /metrics/morning',
            'GET /metrics/night',
            'GET /stats/summary',
          ].map((endpoint) => (
            <code key={endpoint} className="bg-muted px-2 py-1">
              {endpoint}
            </code>
          ))}
        </div>
      </div>

      {/* Claude Desktop Config */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">Claude Desktop Config</div>
        <pre className="bg-muted p-3 text-2xs overflow-x-auto">
{`{
  "mcpServers": {
    "fitness-tracker": {
      "command": "npx",
      "args": [
        "-y", 
        "mcp-remote", 
        "${mcpUrl}",
        "--header",
        "X-API-Key:${showKey && apiKey?.api_key ? apiKey.api_key : 'your_api_key'}"
      ]
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}

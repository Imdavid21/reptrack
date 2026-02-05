import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Copy, RefreshCw, Eye, EyeOff, Key, ExternalLink, Check, Bot } from 'lucide-react';
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
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

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
    setCopiedKey(true);
    toast.success('API key copied');
    setTimeout(() => setCopiedKey(false), 2000);
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
  const apiBaseUrl = `${supabaseUrl}/functions/v1/api`;
  const mcpBaseUrl = `${supabaseUrl}/functions/v1/mcp`;
  const mcpSseUrl = `${mcpBaseUrl}/sse`;

  // Always use actual key for copy operations, but display placeholder when hidden
  const actualKey = apiKey?.api_key || '';
  const displayKey = showKey ? actualKey : 'YOUR_API_KEY';
  const keyIsAvailable = !!apiKey?.api_key;

  // Commands for display (shows placeholder if key hidden)
  const mcpRemoteCommandDisplay = `npx -y mcp-remote ${mcpSseUrl} --header "X-API-Key:${displayKey}"`;

  // Commands for copying (always uses actual key)
  const mcpRemoteCommandCopy = `npx -y mcp-remote ${mcpSseUrl} --header "X-API-Key:${actualKey}"`;

  const claudeConfigDisplay = `{
  "mcpServers": {
    "fitness-tracker": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${mcpSseUrl}",
        "--header",
        "X-API-Key:${displayKey}"
      ]
    }
  }
}`;

  const claudeConfigCopy = `{
  "mcpServers": {
    "fitness-tracker": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${mcpSseUrl}",
        "--header",
        "X-API-Key:${actualKey}"
      ]
    }
  }
}`;

  const copyWithToast = async (type: 'command' | 'config') => {
    if (!keyIsAvailable) {
      toast.error('API key not available');
      return;
    }
    const value = type === 'command' ? mcpRemoteCommandCopy : claudeConfigCopy;
    await navigator.clipboard.writeText(value);
    if (type === 'command') {
      setCopiedCommand(true);
      toast.success('MCP command copied (with your API key)');
      setTimeout(() => setCopiedCommand(false), 2000);
    } else {
      setCopiedConfig(true);
      toast.success('Claude config copied (with your API key)');
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  };

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
              {copiedKey ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
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
                href={apiBaseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <code className="text-2xs text-muted-foreground break-all">
              {apiBaseUrl}
            </code>
            <div className="mt-2 text-2xs text-muted-foreground">
              Header: <code className="bg-muted px-1">X-API-Key: your_key</code>
            </div>
          </div>

          <div className="border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">MCP Server</span>
              <a 
                href={mcpBaseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <code className="text-2xs text-muted-foreground break-all">
              {mcpBaseUrl}
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
            'GET /metrics/vitals',
            'GET /metrics/recovery',
            'GET /calories/burned',
            'GET /habits',
            'GET /preferences',
            'GET /stats/summary',
          ].map((endpoint) => (
            <code key={endpoint} className="bg-muted px-2 py-1">
              {endpoint}
            </code>
          ))}
        </div>
      </div>

      {/* AI Agents & Claude (one-click) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <Bot className="h-3 w-3" />
          AI AGENTS &amp; CLAUDE
        </div>

        <div className="space-y-2 text-2xs">
          <div className="border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">MCP Remote Command</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyWithToast('command')}
                disabled={!keyIsAvailable}
                title="Copy command with your API key"
              >
                {copiedCommand ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <code className="block bg-muted p-2 break-all">
              {mcpRemoteCommandDisplay}
            </code>
            <div className="text-2xs text-muted-foreground mt-1">
              Paste this into a terminal to run the MCP server for Claude or other MCP-aware agents.
            </div>
          </div>

          <div className="border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Claude Desktop Config</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyWithToast('config')}
                disabled={!keyIsAvailable}
                title="Copy Claude config with your API key"
              >
                {copiedConfig ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted p-3 text-2xs overflow-x-auto">
{claudeConfigDisplay}
            </pre>
            <div className="text-2xs text-muted-foreground">
              Paste into your Claude Desktop configuration file. The SSE endpoint at <code className="bg-muted px-1">/sse</code> is required for MCP.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Copy, RefreshCw, Eye, EyeOff, ExternalLink, Check, Bot, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ApiKeyData {
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  // Plaintext key — present ONLY immediately after creation/regeneration.
  api_key?: string;
  is_new?: boolean;
  regenerated?: boolean;
}

export function ApiKeySection() {
  const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
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
      const data: ApiKeyData = await response.json();
      setApiKey(data);
      // First-time provisioning returns the plaintext once.
      if (data.api_key) {
        setRevealedKey(data.api_key);
        setShowKey(true);
      }
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
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
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
      const data: ApiKeyData = await response.json();
      setApiKey(data);
      setRevealedKey(data.api_key ?? null);
      setShowKey(true);
      toast.success('API key regenerated. Copy it now — it will not be shown again.');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  const prefix = apiKey?.key_prefix ?? '';
  const maskedKey = prefix ? `${prefix}${'•'.repeat(28)}` : '';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiBaseUrl = `${supabaseUrl}/functions/v1/api`;
  const mcpBaseUrl = `${supabaseUrl}/functions/v1/mcp`;
  const mcpSseUrl = `${mcpBaseUrl}/sse`;

  const keyIsAvailable = !!revealedKey;
  const displayKey = showKey && revealedKey ? revealedKey : 'YOUR_API_KEY';

  const mcpRemoteCommandDisplay = `npx -y mcp-remote ${mcpSseUrl} --header "X-API-Key:${displayKey}"`;
  const mcpRemoteCommandCopy = revealedKey
    ? `npx -y mcp-remote ${mcpSseUrl} --header "X-API-Key:${revealedKey}"`
    : '';

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

  const claudeConfigCopy = revealedKey ? `{
  "mcpServers": {
    "fitness-tracker": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${mcpSseUrl}",
        "--header",
        "X-API-Key:${revealedKey}"
      ]
    }
  }
}` : '';

  const copyWithToast = async (type: 'command' | 'config') => {
    if (!keyIsAvailable) {
      toast.error('Regenerate to reveal your API key first');
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
        For your security, the full key is only shown once at generation. We store a one-way hash; if you lose it, regenerate a new one.
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
              {showKey && revealedKey ? revealedKey : maskedKey}
            </code>
            {revealedKey && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide' : 'Show'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              disabled={!revealedKey}
              title={revealedKey ? 'Copy' : 'Regenerate to copy'}
            >
              {copiedKey ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {!revealedKey && !isLoading && apiKey && (
          <div className="flex items-start gap-2 text-2xs text-muted-foreground bg-muted/50 p-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>The full key is no longer visible. Regenerate to get a new one (this invalidates the old one).</span>
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
                title={keyIsAvailable ? 'Copy command with your API key' : 'Regenerate to reveal key'}
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
                title={keyIsAvailable ? 'Copy Claude config with your API key' : 'Regenerate to reveal key'}
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

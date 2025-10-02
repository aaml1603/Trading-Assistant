'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Check, Loader2, LogOut } from 'lucide-react';

interface NotionPage {
  id: string;
  title: string;
  lastEdited: string;
  url: string;
}

interface NotionConnectProps {
  onPageSelected: (content: string, title: string) => void;
  isAnalyzing: boolean;
}

export default function NotionConnect({ onPageSelected, isAnalyzing }: NotionConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [showPageList, setShowPageList] = useState(false);
  const [loadingPageId, setLoadingPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if connected via URL param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('notion_connected') === 'true') {
      setIsConnected(true);
      fetchPages();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (urlParams.get('notion_error')) {
      setError('Failed to connect to Notion. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check for workspace name cookie
    const workspaceNameCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('notion_workspace_name='))
      ?.split('=')[1];

    if (workspaceNameCookie) {
      setWorkspaceName(decodeURIComponent(workspaceNameCookie));
      setIsConnected(true);
      // Auto-fetch pages on mount if already connected
      fetchPages();
    }
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/notion/auth';
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/notion/disconnect', { method: 'POST' });
      setIsConnected(false);
      setWorkspaceName(null);
      setPages([]);
      setShowPageList(false);
      setError(null);
    } catch {
      setError('Failed to disconnect');
    }
  };

  const fetchPages = async () => {
    setLoadingPages(true);
    setError(null);
    try {
      const response = await fetch('/api/notion/pages');
      const data = await response.json();

      console.log('Notion API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pages');
      }

      if (data.debug) {
        console.log('Debug info:', data.debug);
      }

      setPages(data.pages || []);
      setShowPageList(true);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pages');
      setIsConnected(false);
    } finally {
      setLoadingPages(false);
    }
  };

  const handlePageSelect = async (pageId: string) => {
    setLoadingPageId(pageId);
    setError(null);

    try {
      const response = await fetch('/api/notion/page-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch page content');
      }

      onPageSelected(data.content, data.title);
      setShowPageList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setLoadingPageId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleConnect}
          disabled={isAnalyzing}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Connect Notion Account
        </Button>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {workspaceName ? `Connected: ${workspaceName}` : 'Notion Connected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPageList(!showPageList)}
            disabled={isAnalyzing || loadingPages}
          >
            {showPageList ? 'Hide Pages' : 'Browse Pages'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isAnalyzing}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showPageList && (
        <div className="rounded-lg border bg-background p-3 space-y-2 max-h-[300px] overflow-y-auto">
          {loadingPages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pages found in your Notion workspace
            </p>
          ) : (
            pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handlePageSelect(page.id)}
                disabled={loadingPageId !== null || isAnalyzing}
                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors disabled:opacity-50 border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(page.lastEdited).toLocaleDateString()}
                    </p>
                  </div>
                  {loadingPageId === page.id && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

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
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-9"
          onClick={handleConnect}
          disabled={isAnalyzing}
        >
          <BookOpen className="mr-2 h-3.5 w-3.5" />
          Connect Notion
        </Button>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Check className="h-3 w-3 text-green-600" />
          <span className="text-xs font-medium truncate max-w-[120px]">
            {workspaceName || 'Notion'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowPageList(!showPageList)}
            disabled={isAnalyzing || loadingPages}
          >
            {showPageList ? 'Hide' : 'Browse'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleDisconnect}
            disabled={isAnalyzing}
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {showPageList && (
        <div className="rounded-lg border bg-background p-2 space-y-1 max-h-[200px] overflow-y-auto">
          {loadingPages ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No pages found
            </p>
          ) : (
            pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handlePageSelect(page.id)}
                disabled={loadingPageId !== null || isAnalyzing}
                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 border"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{page.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(page.lastEdited).toLocaleDateString()}
                    </p>
                  </div>
                  {loadingPageId === page.id && (
                    <Loader2 className="h-3 w-3 animate-spin" />
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

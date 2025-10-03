'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';

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
  const { user, token, refreshUser } = useAuth();
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [showPageList, setShowPageList] = useState(false);
  const [loadingPageId, setLoadingPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!user?.notionConnected;
  const workspaceName = user?.notionWorkspaceName;

  useEffect(() => {
    // Check if connected via URL param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('notion_connected') === 'true') {
      refreshUser(); // Refresh user to get updated Notion status
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (urlParams.get('notion_error')) {
      setError('Failed to connect to Notion. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/notion/auth', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Notion connection');
      }

      // Redirect to Notion OAuth page
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Notion');
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/notion/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      await refreshUser(); // Refresh user to update Notion status
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
      const response = await fetch('/api/notion/pages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      console.log('Notion API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pages');
      }

      if (data.debug) {
        console.log('Debug info:', data.debug);
      }

      setPages(data.pages || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pages');
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch page content');
      }

      // Log content size for large documents
      if (data.contentLength > 20000) {
        console.log(`📄 Processing large Notion page: ${Math.round(data.contentLength / 1000)}KB - This may take a few minutes...`);
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
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleConnect}
          disabled={isAnalyzing}
        >
          <Image
            src="/logos/Notion_app_logo.png"
            alt="Notion"
            width={14}
            height={14}
            className="mr-1.5"
          />
          <span className="text-xs">Notion</span>
        </Button>
        {error && (
          <p className="text-xs text-red-600 absolute">{error}</p>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {/* Inline connected state */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded">
          <Image
            src="/logos/Notion_app_logo.png"
            alt="Notion"
            width={14}
            height={14}
          />
          <Check className="h-3 w-3 text-green-600" />
          <span className="text-xs font-medium">
            {workspaceName || 'Notion'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            if (!showPageList && pages.length === 0) {
              fetchPages();
            }
            setShowPageList(!showPageList);
          }}
          disabled={isAnalyzing || loadingPages}
        >
          <span className="text-xs">{showPageList ? 'Hide Pages' : 'Browse Pages'}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleDisconnect}
          disabled={isAnalyzing}
        >
          <LogOut className="h-3 w-3" />
        </Button>
      </div>

      {/* Page list - shows above when open */}
      {showPageList && (
        <div className="absolute left-0 right-0 bottom-full mb-1 rounded-lg border bg-background p-2 space-y-1 max-h-[200px] overflow-y-auto shadow-lg z-50">
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
        <p className="text-xs text-red-600 absolute">{error}</p>
      )}
    </div>
  );
}

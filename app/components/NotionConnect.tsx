'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, LogOut, Plus, AlertTriangle } from 'lucide-react';
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
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showInitialWarning, setShowInitialWarning] = useState(false);

  const isConnected = !!user?.notionConnected;
  const workspaceName = user?.notionWorkspaceName;

  useEffect(() => {
    // Check if connected via URL param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('notion_connected') === 'true') {
      refreshUser(); // Refresh user to get updated Notion status
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Show initial warning after connecting
      setTimeout(() => setShowInitialWarning(true), 500);
      return;
    }

    if (urlParams.get('notion_error')) {
      setError('Failed to connect to Notion. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser]);

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
      setHasMore(false);
      setNextCursor(null);
    } catch {
      setError('Failed to disconnect');
    }
  };

  const fetchPages = async (cursor?: string | null) => {
    setLoadingPages(true);
    setError(null);
    try {
      const url = cursor
        ? `/api/notion/pages?cursor=${encodeURIComponent(cursor)}`
        : '/api/notion/pages';

      const response = await fetch(url, {
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

      // If cursor exists, append to existing pages; otherwise, replace
      setPages(prev => cursor ? [...prev, ...(data.pages || [])] : (data.pages || []));
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
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
          title="Connect to Notion (regular pages work best)"
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
      {/* Initial warning after connection */}
      {showInitialWarning && (
        <div className="absolute left-0 right-0 bottom-full mb-1 rounded-lg border border-amber-200 bg-amber-50 p-2 shadow-lg z-50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">Notion Connected!</p>
              <p>Only regular pages work properly. Database tables and other page types may not display correctly.</p>
              <button
                onClick={() => setShowInitialWarning(false)}
                className="mt-1 text-amber-700 hover:text-amber-900 underline"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

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
          onClick={handleConnect}
          disabled={isAnalyzing}
          title="Add more pages from Notion (regular pages only)"
        >
          <Plus className="h-3 w-3 mr-1" />
          <span className="text-xs">Add Pages</span>
        </Button>
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
          title="Browse pages from Notion (regular pages work best)"
        >
          <span className="text-xs">{showPageList ? 'Hide' : 'Browse'}</span>
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
        <div className="absolute left-0 right-0 bottom-full mb-1 rounded-lg border bg-background p-2 space-y-1 shadow-lg z-50">
          {/* Warning about page types */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-2 flex-shrink-0">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Note:</p>
                <p>Only regular pages work properly. Database tables and other page types may not display correctly.</p>
              </div>
            </div>
          </div>
          
          {/* Scrollable content area */}
          <div className="max-h-[160px] overflow-y-auto space-y-1">
          
            {loadingPages && pages.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No pages found
              </p>
            ) : (
              <>
                {pages.map((page) => (
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
                ))}
                {hasMore && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 mt-2"
                    onClick={() => fetchPages(nextCursor)}
                    disabled={loadingPages || isAnalyzing}
                  >
                    {loadingPages ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : null}
                    <span className="text-xs">Load More Pages</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 absolute">{error}</p>
      )}
    </div>
  );
}

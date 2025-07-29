// Interface for user-added links (matching content script)
interface UserLink {
  url: string;
  favicon: {
    success: boolean;
    iconUrl?: string;
    format?: string;
    source?: string;
    error?: string;
  };
  addedAt: number;
}

// Message types for communication between content script and background
interface StorageMessage {
  type: 'SAVE_USER_LINKS' | 'LOAD_USER_LINKS';
  data?: UserLink[];
}

interface StorageResponse {
  success: boolean;
  data?: UserLink[];
  error?: string;
}

export default defineBackground(() => {
  console.log('Background script initialized', { id: browser.runtime.id });

  // Initialize WXT storage for user links
  const userLinksStorage = storage.defineItem<UserLink[]>('sync:sidebar-user-links', {
    fallback: [],
  });

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener(
    async (message: StorageMessage, sender, sendResponse): Promise<StorageResponse> => {
      console.log('[DEBUG_LOG] Background received message:', message);

      try {
        switch (message.type) {
          case 'SAVE_USER_LINKS':
            if (message.data) {
              await userLinksStorage.setValue(message.data);
              console.log('[DEBUG_LOG] Saved user links to WXT storage:', message.data);
              return { success: true };
            }
            return { success: false, error: 'No data provided' };

          case 'LOAD_USER_LINKS':
            const userLinks = await userLinksStorage.getValue();
            console.log('[DEBUG_LOG] Loaded user links from WXT storage:', userLinks);
            return { success: true, data: userLinks };

          default:
            return { success: false, error: 'Unknown message type' };
        }
      } catch (error) {
        console.error('[DEBUG_LOG] Background storage error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
  );

  console.log('[DEBUG_LOG] Background message listeners registered');
});

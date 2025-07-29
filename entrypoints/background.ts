import { onMessage } from 'webext-bridge/background';

// Protocol definitions for webext-bridge
interface ProtocolMap {
  'save-user-links': {
    data: string[];
    return: { success: boolean; error?: string };
  };
  'load-user-links': {
    data: void;
    return: { success: boolean; data?: string[]; error?: string };
  };
}

export default defineBackground(() => {
  console.log('Background script initialized', { id: browser.runtime.id });

  // Initialize WXT storage for user links
  const userLinksStorage = storage.defineItem<string[]>('sync:sidebar-user-links', {
    fallback: [],
  });

  // Handle save user links message
  onMessage<'save-user-links'>('save-user-links', async ({ data }) => {
    console.log('[DEBUG_LOG] Background received save-user-links message:', data);

    try {
      if (data && Array.isArray(data)) {
        await userLinksStorage.setValue(data);
        console.log('[DEBUG_LOG] Saved user links to WXT storage:', data);
        return { success: true };
      }
      return { success: false, error: 'No data provided or invalid data format' };
    } catch (error) {
      console.error('[DEBUG_LOG] Background storage error (save):', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Handle load user links message
  onMessage<'load-user-links'>('load-user-links', async () => {
    console.log('[DEBUG_LOG] Background received load-user-links message');

    try {
      const userLinks = await userLinksStorage.getValue();
      console.log('[DEBUG_LOG] Loaded user links from WXT storage:', userLinks);
      return { success: true, data: userLinks };
    } catch (error) {
      console.error('[DEBUG_LOG] Background storage error (load):', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  console.log('[DEBUG_LOG] Background webext-bridge message listeners registered');
});

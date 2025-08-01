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
  'save-sidebar-visibility': {
    data: boolean;
    return: { success: boolean; error?: string };
  };
  'load-sidebar-visibility': {
    data: void;
    return: { success: boolean; data?: boolean; error?: string };
  };
}

export default defineBackground(() => {
  console.log('Background script initialized', { id: browser.runtime.id });

  // Initialize WXT storage for user links
  const userLinksStorage = storage.defineItem<string[]>('sync:sidebar-user-links', {
    fallback: [],
  });

  // Initialize WXT storage for sidebar visibility (default: false = visible, "auto display")
  const sidebarVisibilityStorage = storage.defineItem<boolean>('sync:sidebar-visibility', {
    fallback: false,
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

  // Handle save sidebar visibility message
  onMessage<'save-sidebar-visibility'>('save-sidebar-visibility', async ({ data }) => {
    console.log('[DEBUG_LOG] Background received save-sidebar-visibility message:', data);

    try {
      if (typeof data === 'boolean') {
        await sidebarVisibilityStorage.setValue(data);
        console.log('[DEBUG_LOG] Saved sidebar visibility to WXT storage:', data);
        return { success: true };
      }
      return { success: false, error: 'Invalid data format - expected boolean' };
    } catch (error) {
      console.error('[DEBUG_LOG] Background storage error (save sidebar visibility):', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  // Handle load sidebar visibility message
  onMessage<'load-sidebar-visibility'>('load-sidebar-visibility', async () => {
    console.log('[DEBUG_LOG] Background received load-sidebar-visibility message');

    try {
      const sidebarVisibility = await sidebarVisibilityStorage.getValue();
      console.log('[DEBUG_LOG] Loaded sidebar visibility from WXT storage:', sidebarVisibility);
      return { success: true, data: sidebarVisibility };
    } catch (error) {
      console.error('[DEBUG_LOG] Background storage error (load sidebar visibility):', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  console.log('[DEBUG_LOG] Background webext-bridge message listeners registered');
});

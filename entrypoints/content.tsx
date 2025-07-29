import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';

// TypeScript interfaces for favicon functionality
interface FaviconResult {
  success: boolean;
  iconUrl?: string;
  format?: string;
  source?: string;
  error?: string;
}

/**
 * Get favicon using Google's favicon service
 * This is a reliable fallback method that works for most websites
 */
const getFaviconViaGoogle = (url: string): FaviconResult => {
  try {
    const domain = new URL(url).hostname;
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    return {
      success: true,
      iconUrl: googleFaviconUrl,
      source: 'Google Favicon Service',
      format: 'image/png'
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate Google favicon URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Sidebar component with favicon functionality
const Sidebar: React.FC = () => {
  const [exampleFavicons, setExampleFavicons] = useState<{ [key: string]: FaviconResult }>({});

  useEffect(() => {
    // Demonstrate fetching favicons from external websites
    const loadExampleFavicons = async () => {
      const exampleSites = [
        'https://github.com',
        'https://stackoverflow.com',
        'https://google.com'
      ];

      for (const site of exampleSites) {
        try {
          // Use Google's favicon service for reliable results
          const result = getFaviconViaGoogle(site);
          setExampleFavicons(prev => ({
            ...prev,
            [site]: result
          }));
          console.log(`[DEBUG_LOG] Favicon for ${site}:`, result);
        } catch (error) {
          console.error(`[DEBUG_LOG] Error loading favicon for ${site}:`, error);
        }
      }
    };

    loadExampleFavicons();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '60px',
        height: '100vh',
        backgroundColor: '#404040',
        borderRight: '1px solid #555555',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        zIndex: '999999',
        padding: '10px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden'
      }}
    >

      {/* Example External Favicons */}
      <div style={{marginBottom: '20px', paddingBottom: '15px', borderRadius: '5px'}}>
        {Object.entries(exampleFavicons).map(([url, result]) => (
          <div key={url} style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
            {result.success ? (
              <>
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={result.iconUrl}
                    alt={`Favicon for ${url}`}
                    style={{width: '25px', height: '25px'}}
                    onError={(e) => {
                      console.log('[DEBUG_LOG] External favicon failed to load:', result.iconUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </a>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Wait for DOM to be ready
    const initSidebar = () => {
      try {
        // Check if sidebar already exists to prevent duplicates
        if (document.getElementById('extension-sidebar-container')) {
          console.log('Sidebar already exists, skipping injection');
          return;
        }

        // Ensure body exists
        if (!document.body) {
          console.log('Document body not ready, retrying...');
          setTimeout(initSidebar, 100);
          return;
        }

        // Create a container for the sidebar
        const sidebarContainer = document.createElement('div');
        sidebarContainer.id = 'extension-sidebar-container';

        // Insert the container at the beginning of the body
        document.body.insertBefore(sidebarContainer, document.body.firstChild);

        // Store original margin to restore if needed
        const originalMarginLeft = document.body.style.marginLeft || '0px';

        // Adjust the body's left margin to make room for the sidebar
        // Check if body already has significant left margin
        const currentMargin = parseInt(getComputedStyle(document.body).marginLeft) || 0;
        const newMargin = Math.max(currentMargin, 300);

        document.body.style.marginLeft = `${newMargin}px`;
        document.body.style.transition = 'margin-left 0.3s ease';

        // Create React root and render the sidebar
        const root = ReactDOM.createRoot(sidebarContainer);
        root.render(<Sidebar/>);

        // Store cleanup function globally for potential future use
        (window as any).__extensionSidebarCleanup = () => {
          root.unmount();
          sidebarContainer.remove();
          document.body.style.marginLeft = originalMarginLeft;
        };

        console.log('Sidebar injected successfully');
      } catch (error) {
        console.error('Failed to inject sidebar:', error);
      }
    };

    // Initialize sidebar when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
      initSidebar();
    }
  },
});

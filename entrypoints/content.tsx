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

// Interface for user-added links
interface UserLink {
  url: string;
  favicon: FaviconResult;
  addedAt: number;
}

// Sidebar component with favicon functionality
const Sidebar: React.FC = () => {
  const [exampleFavicons, setExampleFavicons] = useState<{ [key: string]: FaviconResult }>({});
  const [userLinks, setUserLinks] = useState<UserLink[]>([]);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [addLinkError, setAddLinkError] = useState('');

  // Load user links from background storage via messaging
  useEffect(() => {
    const loadUserLinks = async () => {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'LOAD_USER_LINKS'
        });
        
        if (response.success && response.data) {
          setUserLinks(response.data);
          console.log('[DEBUG_LOG] Loaded user links from background storage:', response.data);
        } else {
          console.error('[DEBUG_LOG] Failed to load user links:', response.error);
        }
      } catch (error) {
        console.error('[DEBUG_LOG] Error loading user links from background storage:', error);
      }
    };

    loadUserLinks();
  }, []);

  // Save user links to background storage via messaging whenever userLinks changes
  useEffect(() => {
    if (userLinks.length > 0) {
      const saveUserLinks = async () => {
        try {
          const response = await browser.runtime.sendMessage({
            type: 'SAVE_USER_LINKS',
            data: userLinks
          });
          
          if (response.success) {
            console.log('[DEBUG_LOG] Saved user links to background storage:', userLinks);
          } else {
            console.error('[DEBUG_LOG] Failed to save user links:', response.error);
          }
        } catch (error) {
          console.error('[DEBUG_LOG] Error saving user links to background storage:', error);
        }
      };
      
      saveUserLinks();
    }
  }, [userLinks]);

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

  // Function to validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Function to add a new link
  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) {
      setAddLinkError('Please enter a URL');
      return;
    }

    if (!isValidUrl(newLinkUrl)) {
      setAddLinkError('Please enter a valid URL');
      return;
    }

    // Check for duplicates
    const isDuplicate = userLinks.some(link => link.url === newLinkUrl) || 
                       Object.keys(exampleFavicons).includes(newLinkUrl);
    
    if (isDuplicate) {
      setAddLinkError('This URL is already added');
      return;
    }

    setIsAddingLink(true);
    setAddLinkError('');

    try {
      // Get favicon for the new URL
      const faviconResult = getFaviconViaGoogle(newLinkUrl);
      
      const newLink: UserLink = {
        url: newLinkUrl,
        favicon: faviconResult,
        addedAt: Date.now()
      };

      setUserLinks(prev => [...prev, newLink]);
      setNewLinkUrl('');
      setShowAddLinkModal(false);
      console.log('[DEBUG_LOG] Added new link:', newLink);
    } catch (error) {
      setAddLinkError('Failed to add link. Please try again.');
      console.error('[DEBUG_LOG] Error adding new link:', error);
    } finally {
      setIsAddingLink(false);
    }
  };

  // Function to cancel adding link
  const handleCancelAddLink = () => {
    setShowAddLinkModal(false);
    setNewLinkUrl('');
    setAddLinkError('');
  };

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

      {/* Icons Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        position: 'relative'
      }}>
        {/* Icons List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '17px',
          marginTop: '15px',
          flex: '1',
          overflowY: 'auto',
          paddingBottom: '60px' // Space for plus button
        }}>
          {/* Example External Favicons */}
          {Object.entries(exampleFavicons).map(([url, result]) => (
            <div key={url} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}>
              {result.success ? (
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={result.iconUrl}
                    alt={`Favicon for ${url}`}
                    style={{
                      width: '25px',
                      height: '25px',
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.log('[DEBUG_LOG] External favicon failed to load:', result.iconUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </a>
              ) : null}
            </div>
          ))}

          {/* User Added Links */}
          {userLinks.map((link) => (
            <div key={link.url} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}>
              {link.favicon.success ? (
                <a href={link.url} target="_blank" rel="noreferrer">
                  <img
                    src={link.favicon.iconUrl}
                    alt={`Favicon for ${link.url}`}
                    style={{
                      width: '25px',
                      height: '25px',
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.log('[DEBUG_LOG] User link favicon failed to load:', link.favicon.iconUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </a>
              ) : null}
            </div>
          ))}
        </div>

        {/* Plus Button */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <button
            onClick={() => setShowAddLinkModal(true)}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#555555',
              border: '1px solid #777777',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#666666';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#555555';
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Add Link Modal */}
      {showAddLinkModal && (
        <div style={{
          position: 'fixed',
          bottom: '50px', // Position above the plus button
          left: '10px', // Align with sidebar padding
          width: '380px',
          backgroundColor: '#404040',
          border: '1px solid #555555',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          zIndex: '1000000'
        }}>
          <h4 style={{
            margin: '0 0 15px 0',
            color: '#ffffff',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            Add New Link
          </h4>
          
          <input
            type="text"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="Enter URL (e.g., https://example.com)"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #666666',
              borderRadius: '4px',
              backgroundColor: '#333333',
              color: '#ffffff',
              fontSize: '14px',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddLink();
              }
            }}
          />

          {addLinkError && (
            <p style={{
              color: '#ff6b6b',
              fontSize: '12px',
              margin: '0 0 10px 0'
            }}>
              {addLinkError}
            </p>
          )}

          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleAddLink}
              disabled={isAddingLink}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: isAddingLink ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isAddingLink ? 0.6 : 1
              }}
            >
              {isAddingLink ? 'Adding...' : 'Add'}
            </button>
            
            <button
              onClick={handleCancelAddLink}
              disabled={isAddingLink}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666666',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: isAddingLink ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isAddingLink ? 0.6 : 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
        const newMargin = Math.max(currentMargin, 60);

        document.body.style.marginLeft = `${newMargin}px`;
        // document.body.style.transition = 'margin-left 0.3s ease';

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

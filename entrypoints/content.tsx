import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import {sendMessage} from 'webext-bridge/content-script';

// TypeScript interfaces for favicon functionality
interface FaviconResult {
  success: boolean;
  iconUrl?: string;
  format?: string;
  source?: string;
  error?: string;
}

// TypeScript interfaces for webext-bridge message responses
interface SaveUserLinksResponse {
  success: boolean;
  error?: string;
}

interface LoadUserLinksResponse {
  success: boolean;
  data?: string[];
  error?: string;
}

// Protocol map for webext-bridge (matching background.ts)
interface ProtocolMap {
  'save-user-links': {
    data: string[];
    return: SaveUserLinksResponse;
  };
  'load-user-links': {
    data: void;
    return: LoadUserLinksResponse;
  };
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
  const [userLinks, setUserLinks] = useState<string[]>([]);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [addLinkError, setAddLinkError] = useState('');

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Icon drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    url: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    url: ''
  });

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState('');

  // Sidebar visibility state
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  // Hide context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({...prev, visible: false}));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  // Load user links from background storage via messaging with retry logic
  useEffect(() => {
    const loadUserLinksWithRetry = async (maxRetries = 3, delay = 500) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[DEBUG_LOG] Attempting to load user links from background (attempt ${attempt}/${maxRetries})`);

          const response = await sendMessage('load-user-links', null, 'background') as unknown as LoadUserLinksResponse;

          if (response && response.success && response.data) {
            setUserLinks(response.data);
            console.log('[DEBUG_LOG] Successfully loaded user links from background storage:', response.data);
            return; // Success, exit retry loop
          } else {
            console.warn(`[DEBUG_LOG] Failed to load user links (attempt ${attempt}):`, response?.error || 'No response');
          }
        } catch (error) {
          console.warn(`[DEBUG_LOG] Error loading user links from background storage (attempt ${attempt}):`, error);
        }

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          console.log(`[DEBUG_LOG] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff
        }
      }

      console.error('[DEBUG_LOG] Failed to load user links after all retry attempts');
    };

    // Start loading URLs immediately when component mounts
    loadUserLinksWithRetry();
  }, []);

  // Save user links to background storage via messaging whenever userLinks changes
  useEffect(() => {
    if (userLinks.length > 0) {
      const saveUserLinks = async () => {
        try {
          const response = await sendMessage('save-user-links', userLinks, 'background') as unknown as SaveUserLinksResponse;

          if (response && response.success) {
            console.log('[DEBUG_LOG] Saved user links to background storage:', userLinks);
          } else {
            console.error('[DEBUG_LOG] Failed to save user links:', response?.error);
          }
        } catch (error) {
          console.error('[DEBUG_LOG] Error saving user links to background storage:', error);
        }
      };

      saveUserLinks();
    }
  }, [userLinks]);

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
    const isDuplicate = userLinks.includes(newLinkUrl);

    if (isDuplicate) {
      setAddLinkError('This URL is already added');
      return;
    }

    setIsAddingLink(true);
    setAddLinkError('');

    try {
      // Add URL directly to the list (no metadata stored)
      setUserLinks(prev => [...prev, newLinkUrl]);
      setNewLinkUrl('');
      setShowAddLinkModal(false);
      console.log('[DEBUG_LOG] Added new URL:', newLinkUrl);
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

  // Function to export URLs as JSON
  const handleExportData = () => {
    try {
      const exportData = {
        urls: userLinks,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sidebar-urls-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[DEBUG_LOG] Exported URLs:', exportData);
    } catch (error) {
      console.error('[DEBUG_LOG] Error exporting data:', error);
    }
  };

  // Helper function to process imported file (used by both file input and drag-and-drop)
  const processImportedFile = async (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      throw new Error('Please select a valid JSON file.');
    }

    setIsImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate the imported data structure
      if (!importData.urls || !Array.isArray(importData.urls)) {
        throw new Error('Invalid file format. Expected JSON with "urls" array.');
      }

      // Validate each URL
      const validUrls: string[] = [];
      const invalidUrls: string[] = [];

      for (const url of importData.urls) {
        if (typeof url === 'string' && isValidUrl(url)) {
          validUrls.push(url);
        } else {
          invalidUrls.push(url);
        }
      }

      if (validUrls.length === 0) {
        throw new Error('No valid URLs found in the imported file.');
      }

      // Merge with existing URLs (avoid duplicates)
      const existingUrls = new Set(userLinks);
      const newUrls = validUrls.filter(url => !existingUrls.has(url));

      if (newUrls.length === 0) {
        setImportSuccess('All URLs from the file are already in your list.');
      } else {
        const updatedUrls = [...userLinks, ...newUrls];
        setUserLinks(updatedUrls);

        let successMessage = `Successfully imported ${newUrls.length} new URL${newUrls.length > 1 ? 's' : ''}.`;
        if (invalidUrls.length > 0) {
          successMessage += ` ${invalidUrls.length} invalid URL${invalidUrls.length > 1 ? 's were' : ' was'} skipped.`;
        }
        setImportSuccess(successMessage);

        console.log('[DEBUG_LOG] Imported URLs:', newUrls);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import file.';
      setImportError(errorMessage);
      console.error('[DEBUG_LOG] Error importing data:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // Function to import URLs from JSON (file input)
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await processImportedFile(file);
    } finally {
      // Reset the file input
      event.target.value = '';
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set isDragOver to false if we're leaving the drop zone entirely
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (isImporting) {
      return; // Don't allow drops while already importing
    }

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      setImportError('No files were dropped.');
      return;
    }

    if (files.length > 1) {
      setImportError('Please drop only one JSON file at a time.');
      return;
    }

    const file = files[0];

    try {
      await processImportedFile(file);
    } catch (error) {
      console.error('[DEBUG_LOG] Error processing dropped file:', error);
    }
  };

  // Function to handle right-click on icons
  const handleRightClick = (event: React.MouseEvent, url: string) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      url: url
    });
  };

  // Function to handle delete from context menu
  const handleDeleteFromContextMenu = () => {
    setUrlToDelete(contextMenu.url);
    setShowDeleteConfirmation(true);
    setContextMenu(prev => ({...prev, visible: false}));
  };

  // Function to confirm deletion
  const handleConfirmDelete = () => {
    if (urlToDelete) {
      setUserLinks(prev => prev.filter(url => url !== urlToDelete));
      console.log('[DEBUG_LOG] Deleted URL:', urlToDelete);
    }
    setShowDeleteConfirmation(false);
    setUrlToDelete('');
  };

  // Function to cancel deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setUrlToDelete('');
  };

  // Icon drag and drop handlers
  const handleIconDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.currentTarget.outerHTML);

    // Add some visual feedback to the dragged element
    setTimeout(() => {
      if (event.currentTarget) {
        event.currentTarget.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleIconDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleIconDragEnter = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleIconDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Only clear dragOverIndex if we're actually leaving the drop zone
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleIconDrop = (event: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    // Create a new array with reordered items
    const newUserLinks = [...userLinks];
    const draggedItem = newUserLinks[draggedIndex];

    // Remove the dragged item from its original position
    newUserLinks.splice(draggedIndex, 1);

    // Insert the dragged item at the new position
    newUserLinks.splice(dropIndex, 0, draggedItem);

    // Update the state
    setUserLinks(newUserLinks);

    console.log('[DEBUG_LOG] Reordered icons:', {
      from: draggedIndex,
      to: dropIndex,
      draggedUrl: draggedItem,
      newOrder: newUserLinks
    });

    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleIconDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    // Reset visual feedback
    if (event.currentTarget) {
      event.currentTarget.style.opacity = '1';
    }

    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Function to close settings modal
  const handleCloseSettings = () => {
    setShowSettingsModal(false);
    setImportError('');
    setImportSuccess('');
    setIsDragOver(false); // Reset drag state when closing modal
  };

  // Function to hide sidebar
  const handleHideSidebar = () => {
    setIsSidebarHidden(true);
    document.body.style.marginLeft = '0px'; // Remove body margin when sidebar is hidden
    document.body.style.transition = 'margin-left 0.3s ease';
  };

  // Function to show sidebar
  const handleShowSidebar = () => {
    setIsSidebarHidden(false);
    document.body.style.marginLeft = '60px'; // Restore body margin when sidebar is shown
    document.body.style.transition = 'margin-left 0.3s ease';
  };

  if (isSidebarHidden) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '20px',
        zIndex: '999999',
      }}>
        <button
          onClick={handleShowSidebar}
          title='Show Sidebar'
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: 'transparent',
            color: '#000',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(158,146,146,0.27)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          &gt;&gt;
        </button>
      </div>);
  }
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
          overflowX: 'hidden',
          paddingBottom: '100px' // Space for plus button and settings button
        }}>


          {/* User Added Links */}
          {userLinks.map((url, index) => {
            // Generate favicon on-demand for each URL
            const faviconResult = getFaviconViaGoogle(url);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={url}
                draggable={true}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  opacity: isDragging ? 0.5 : 1,
                  backgroundColor: isDragOver ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                  borderRadius: '4px',
                  padding: '4px',
                  margin: '2px 0',
                  transition: 'all 0.2s ease',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onContextMenu={(e) => handleRightClick(e, url)}
                onDragStart={(e) => handleIconDragStart(e, index)}
                onDragOver={(e) => handleIconDragOver(e, index)}
                onDragEnter={(e) => handleIconDragEnter(e, index)}
                onDragLeave={handleIconDragLeave}
                onDrop={(e) => handleIconDrop(e, index)}
                onDragEnd={handleIconDragEnd}
              >
                {faviconResult.success ? (
                  <a href={url} target="_blank" rel="noreferrer" title={url}>
                    <img
                      src={faviconResult.iconUrl}
                      alt={`Favicon for ${url}`}
                      style={{
                        width: '25px',
                        height: '25px',
                        display: 'block'
                      }}
                      onError={(e) => {
                        console.log('[DEBUG_LOG] User link favicon failed to load:', faviconResult.iconUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Plus Button */}
        <div style={{
          position: 'absolute',
          bottom: '80px',
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

        {/* Settings Button */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#555555',
              border: '1px solid #777777',
              color: '#ffffff',
              fontSize: '14px',
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
            ⚙️
          </button>
        </div>

        {/* Left Arrow Icon - positioned at bottom of settings icon */}
        <div style={{
          position: 'absolute',
          bottom: '5px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <button
            onClick={handleHideSidebar}
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#666666';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            &lt;&lt;
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          bottom: '90px', // Position above the settings button
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
            Import & Export Settings
          </h4>

          {/* Export Section */}
          <div style={{marginBottom: '20px'}}>
            <h5 style={{
              margin: '0 0 10px 0',
              color: '#ffffff',
              fontSize: '14px'
            }}>
              Export Data
            </h5>
            <button
              onClick={handleExportData}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#4CAF50',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#45a049';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#4CAF50';
              }}
            >
              Download URLs as JSON
            </button>
          </div>

          {/* Import Section */}
          <div style={{marginBottom: '15px'}}>
            <h5 style={{
              margin: '0 0 10px 0',
              color: '#ffffff',
              fontSize: '14px'
            }}>
              Import Data
            </h5>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragOver ? '2px dashed #4CAF50' : '2px dashed #666666',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: isDragOver ? 'rgba(76, 175, 80, 0.1)' : '#333333',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                marginBottom: '10px',
                cursor: isImporting ? 'not-allowed' : 'pointer',
                opacity: isImporting ? 0.6 : 1
              }}
            >
              <div style={{
                color: isDragOver ? '#4CAF50' : '#ffffff',
                fontSize: '14px',
                marginBottom: '10px'
              }}>
                {isDragOver ? (
                  '📁 Drop your JSON file here'
                ) : (
                  '📁 Drag & drop a JSON file here, or click to browse'
                )}
              </div>

              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                disabled={isImporting}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #666666',
                  borderRadius: '4px',
                  backgroundColor: '#404040',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: isImporting ? 'not-allowed' : 'pointer'
                }}
              />
            </div>

            {isImporting && (
              <p style={{
                color: '#ffffff',
                fontSize: '12px',
                margin: '5px 0 0 0',
                textAlign: 'center'
              }}>
                Importing...
              </p>
            )}
          </div>

          {/* Success Message */}
          {importSuccess && (
            <div style={{
              backgroundColor: '#4CAF50',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              {importSuccess}
            </div>
          )}

          {/* Error Message */}
          {importError && (
            <div style={{
              backgroundColor: '#f44336',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              {importError}
            </div>
          )}

          {/* Close Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '15px'
          }}>
            <button
              onClick={handleCloseSettings}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666666',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: '#404040',
            border: '1px solid #555555',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '1000001',
            minWidth: '120px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={handleDeleteFromContextMenu}
            style={{
              padding: '8px 12px',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '14px',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLDivElement).style.backgroundColor = '#555555';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
            }}
          >
            🗑️ Delete
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000002'
        }}>
          <div style={{
            backgroundColor: '#404040',
            border: '1px solid #555555',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h4 style={{
              margin: '0 0 15px 0',
              color: '#ffffff',
              fontSize: '16px',
              textAlign: 'center'
            }}>
              Confirm Deletion
            </h4>

            <p style={{
              color: '#ffffff',
              fontSize: '14px',
              margin: '0 0 20px 0',
              textAlign: 'center',
              wordBreak: 'break-all'
            }}>
              Are you sure you want to delete this link?<br/>
              <span style={{color: '#cccccc', fontSize: '12px'}}>
                {urlToDelete}
              </span>
            </p>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Delete
              </button>

              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#666666',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
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

        document.body.style.marginLeft = `60px`;
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

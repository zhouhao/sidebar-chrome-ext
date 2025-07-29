import React from 'react';
import ReactDOM from 'react-dom/client';

// Sidebar component
const Sidebar: React.FC = () => {
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
      <h3 style={{ margin: '0 0 20px 0', color: '#ffffff' }}>Extension Sidebar</h3>
      <div style={{ color: '#cccccc' }}>
        <p>This sidebar is injected by the browser extension.</p>
        <p>Current page: {window.location.hostname}</p>
        <p>Time: {new Date().toLocaleTimeString()}</p>
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
        root.render(<Sidebar />);
        
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

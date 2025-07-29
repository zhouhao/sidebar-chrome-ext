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
        width: '300px',
        height: '100vh',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #dee2e6',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        zIndex: '999999',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'auto'
      }}
    >
      <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Extension Sidebar</h3>
      <div style={{ color: '#666' }}>
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
    // Create a container for the sidebar
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'extension-sidebar-container';
    
    // Insert the container at the beginning of the body
    document.body.insertBefore(sidebarContainer, document.body.firstChild);
    
    // Adjust the body's left margin to make room for the sidebar
    document.body.style.marginLeft = '300px';
    document.body.style.transition = 'margin-left 0.3s ease';
    
    // Create React root and render the sidebar
    const root = ReactDOM.createRoot(sidebarContainer);
    root.render(<Sidebar />);
    
    console.log('Sidebar injected successfully');
  },
});

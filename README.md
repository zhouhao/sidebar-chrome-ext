# Sidebar Bookmark Extension

A simple and elegant Chrome extension that provides a sidebar for bookmarking your favorite websites. The extension adds a fixed sidebar to the left side of any webpage, allowing you to quickly access and manage your bookmarks with beautiful favicon icons.

## Features

- **Quick Access Sidebar**: Fixed sidebar on the left side of web pages with your favorite bookmarks
- **Favicon Support**: Automatically fetches and displays website favicons using Google's favicon service
- **Drag & Drop Reordering**: Easily reorder your bookmarks by dragging and dropping icons
- **Right-Click Context Menu**: Delete bookmarks with a simple right-click menu
- **Import/Export**: Backup and restore your bookmarks using JSON files
- **Drag & Drop Import**: Simply drag JSON files into the settings modal to import bookmarks
- **Hide/Show Sidebar**: Toggle sidebar visibility with arrow buttons
- **Responsive Design**: Clean, dark-themed interface that works on all websites
- **Persistent Storage**: Bookmarks are saved across browser sessions

## Installation

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zhouhao/sidebar-chrome-ext.git
   cd sidebar-chrome-ext
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   # or
   pnpm build
   ```

4. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the `.output/chrome-mv3` folder

### For Firefox

```bash
npm run build:firefox
# Then load the .output/firefox-mv2 folder in Firefox
```

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- Chrome or Firefox browser

### Development Setup

1. **Start development server**:
   ```bash
   npm run dev
   # or for Firefox
   npm run dev:firefox
   ```

2. **Load the extension**:
   - The development server will automatically rebuild when you make changes
   - Load the extension from `.output/chrome-mv3` (or `.output/firefox-mv2` for Firefox)
   - Reload the extension in the browser when prompted

### Available Scripts

- `npm run dev` - Start development server for Chrome
- `npm run dev:firefox` - Start development server for Firefox
- `npm run build` - Build for production (Chrome)
- `npm run build:firefox` - Build for production (Firefox)
- `npm run zip` - Create distributable zip file (Chrome)
- `npm run zip:firefox` - Create distributable zip file (Firefox)
- `npm run compile` - Type check without building

## Usage

### Adding Bookmarks

1. Click the **+** button at the bottom of the sidebar
2. Enter the URL of the website you want to bookmark
3. Click "Add" to save the bookmark
4. The favicon will automatically appear in the sidebar

### Managing Bookmarks

- **Reorder**: Drag and drop bookmark icons to rearrange them
- **Delete**: Right-click on any bookmark icon and select "Delete"
- **Hide Sidebar**: Click the **<<** arrow at the bottom to hide the sidebar
- **Show Sidebar**: Click the **>>** arrow (appears at bottom left when hidden) to show the sidebar

### Import/Export

1. Click the **⚙️** settings button at the bottom of the sidebar
2. **Export**: Click "Download URLs as JSON" to backup your bookmarks
3. **Import**: 
   - Drag and drop a JSON file into the import area, or
   - Click "Browse" to select a JSON file
   - The extension will merge imported bookmarks with existing ones

### JSON Format

The export/import uses this JSON structure:
```json
{
  "urls": [
    "https://example.com",
    "https://github.com",
    "https://stackoverflow.com"
  ],
  "exportDate": "2024-01-01T00:00:00.000Z",
  "version": "1.0"
}
```

## Technical Details

### Built With

- **WXT Framework**: Modern web extension development framework
- **React 19**: UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **webext-bridge**: Cross-context messaging for web extensions

### Architecture

- **Content Script**: Injects the sidebar into web pages
- **Background Script**: Handles data persistence and cross-tab communication
- **React Components**: Modular UI components for sidebar functionality
- **Chrome Storage API**: Persistent bookmark storage

### Browser Compatibility

- Chrome (Manifest V3)
- Firefox (Manifest V2)
- Edge (Chromium-based)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is open source. Please check the license file for details.

## Troubleshooting

### Common Issues

1. **Sidebar not appearing**: 
   - Refresh the page after installing the extension
   - Check if the extension is enabled in Chrome extensions

2. **Bookmarks not saving**:
   - Ensure the extension has proper permissions
   - Check browser console for error messages

3. **Favicons not loading**:
   - The extension uses Google's favicon service as fallback
   - Some websites may block favicon requests

### Debug Mode

The extension includes debug logging. Check the browser console for `[DEBUG_LOG]` messages to troubleshoot issues.

## Support

If you encounter any issues or have suggestions, please create an issue in the repository.

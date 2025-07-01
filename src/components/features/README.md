# Feature Components Organization

This directory contains complex feature components that encapsulate specific business logic and user interactions. The components are organized in a hierarchical manner:

## Organization Structure

```
features/
├── conversion/                  # Conversion process components
│   ├── ConversionFlow.tsx       # Main container for conversion workflow
│   ├── ConversionProgress.tsx   # Progress visualization component
│   ├── FormatSelector.tsx       # Format selection component
│   └── DownloadManager.tsx      # Download handling component
├── session/                     # Session management components
│   ├── SessionManager.tsx       # Session management UI component
│   └── CloseSession.tsx         # Session closing action component
├── upload/                      # Upload process components
│   ├── UploadZone.tsx           # Main file upload component
│   └── FileValidation.tsx       # File validation logic
└── history/                     # Job history components
    └── JobHistoryPanel.tsx      # Job history display and management
```

## Component Responsibilities

### Conversion Components
- **ConversionFlow**: Container component for the entire conversion process
- **ConversionProgress**: Visual representation of conversion progress
- **FormatSelector**: UI for selecting output formats based on input type
- **DownloadManager**: Handles download token retrieval and file download

### Session Components
- **SessionManager**: User interface for session management
- **CloseSession**: Component for session closure and cleanup

### Upload Components
- **UploadZone**: Drag-and-drop file upload with validation
- **FileValidation**: File validation logic isolated for reuse

### History Components
- **JobHistoryPanel**: Displays and manages conversion job history

## Implementation Guidelines

1. Each component should have a single responsibility
2. Components should communicate through props and state managers
3. API calls should be delegated to hooks or API client
4. Components should handle loading and error states gracefully 
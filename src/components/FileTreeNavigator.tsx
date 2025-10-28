import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Package, FileText, X, Star, Search, ArrowUp, ArrowDown } from 'lucide-react';
import type { Root } from 'protobufjs';
import { parse, Root as ProtoRoot } from 'protobufjs';

interface FileTreeNavigatorProps {
  loadedFiles: Map<string, string>;
  root: Root | null;
  selectedMessage: string | null;
  mainFile: string | null;
  onSelectMessage: (messageName: string) => void;
  onRemoveFile: (filePath: string) => void;
}

interface MessageNode {
  type: 'message';
  name: string;
  fullName: string;
}

interface PackageNode {
  type: 'package';
  name: string;
  messages: MessageNode[];
  packages: PackageNode[];
}

interface FileNode {
  type: 'file';
  path: string;
  isMain: boolean;
  packages: PackageNode[];
  rootMessages: MessageNode[];
}

export const FileTreeNavigator: React.FC<FileTreeNavigatorProps> = ({
  loadedFiles,
  root,
  selectedMessage,
  mainFile,
  onSelectMessage,
  onRemoveFile,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(Array.from(loadedFiles.keys())));
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Build tree structure - parse files separately ONLY to determine message origins
  const fileTree = useMemo((): FileNode[] => {
    if (!root || loadedFiles.size === 0) return [];

    // Step 1: Parse each file separately to determine which messages are defined in which file
    const fileMessageMap = new Map<string, Set<string>>(); // filePath -> set of message short names

    for (const [filePath, fileContent] of loadedFiles) {
      try {
        // Extract message definitions from raw proto text (simple regex approach)
        const messageNames = new Set<string>();

        // Match: message MessageName { ... }
        const messageRegex = /^\s*message\s+(\w+)\s*\{/gm;
        let match;
        while ((match = messageRegex.exec(fileContent)) !== null) {
          messageNames.add(match[1]);
        }

        fileMessageMap.set(filePath, messageNames);
        console.log(`[FileTree] File ${filePath} defines messages:`, Array.from(messageNames));
      } catch (error) {
        console.error(`Failed to extract messages from ${filePath}:`, error);
        fileMessageMap.set(filePath, new Set());
      }
    }

    // Step 2: Extract all messages from the compiled root (with full names and types)
    const extractMessages = (namespace: any, prefix = ''): MessageNode[] => {
      if (!namespace || !namespace.nested) return [];

      const messages: MessageNode[] = [];

      Object.keys(namespace.nested).forEach((key) => {
        const item = namespace.nested[key];
        const fullName = prefix ? `${prefix}.${key}` : key;

        // Check if it's a Type (message)
        if (item.constructor.name === 'Type') {
          messages.push({
            type: 'message',
            name: key,
            fullName: fullName,
          });
        }

        // Recursively process nested namespaces
        if (item.nested) {
          const nestedMessages = extractMessages(item, fullName);
          messages.push(...nestedMessages);
        }
      });

      return messages;
    };

    const allMessages = extractMessages(root);
    console.log('[FileTree] All messages from compiled root:', allMessages.map(m => m.fullName));

    // Step 3: Assign messages to files based on their short name
    const fileMessagesAssignment = new Map<string, MessageNode[]>();

    for (const message of allMessages) {
      // Get the last part of the full name (the actual message name)
      const messageName = message.name;

      // Find which file defines this message
      let assignedFile: string | null = null;
      for (const [filePath, messageNames] of fileMessageMap) {
        if (messageNames.has(messageName)) {
          assignedFile = filePath;
          break;
        }
      }

      // Assign to file or to main file if not found
      const targetFile = assignedFile || mainFile || Array.from(loadedFiles.keys())[0];

      if (!fileMessagesAssignment.has(targetFile)) {
        fileMessagesAssignment.set(targetFile, []);
      }
      fileMessagesAssignment.get(targetFile)!.push(message);
    }

    console.log('[FileTree] Message assignment:',
      Array.from(fileMessagesAssignment.entries()).map(([file, msgs]) =>
        `${file}: ${msgs.map(m => m.fullName).join(', ')}`
      )
    );

    // Step 4: Build package tree for each file
    const buildPackageTree = (messages: MessageNode[]): { packages: PackageNode[]; rootMessages: MessageNode[] } => {
      const packageMap = new Map<string, MessageNode[]>();
      const rootMessages: MessageNode[] = [];

      messages.forEach((msg) => {
        const parts = msg.fullName.split('.');
        if (parts.length === 1) {
          // No package, root level message
          rootMessages.push(msg);
        } else {
          // Has package
          const packageName = parts.slice(0, -1).join('.');
          if (!packageMap.has(packageName)) {
            packageMap.set(packageName, []);
          }
          packageMap.get(packageName)!.push(msg);
        }
      });

      // Build package nodes
      const packages: PackageNode[] = [];
      const sortedPackages = Array.from(packageMap.keys()).sort();

      sortedPackages.forEach((packagePath) => {
        const packageMessages = packageMap.get(packagePath) || [];
        packages.push({
          type: 'package',
          name: packagePath,
          messages: packageMessages,
          packages: [],
        });
      });

      return { packages, rootMessages };
    };

    // Step 5: Create file nodes with their messages
    const fileNodes: FileNode[] = [];

    for (const [filePath] of loadedFiles) {
      const messages = fileMessagesAssignment.get(filePath) || [];
      const { packages, rootMessages } = buildPackageTree(messages);

      fileNodes.push({
        type: 'file',
        path: filePath,
        isMain: filePath === mainFile,
        packages: packages,
        rootMessages: rootMessages,
      });
    }

    return fileNodes;
  }, [root, loadedFiles, mainFile]);

  // Helper function for fuzzy matching
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Simple substring match
    if (lowerText.includes(lowerQuery)) {
      return true;
    }

    // Fuzzy match: check if all query chars appear in order
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length;
  };

  // Helper function to find continuous substring matches for highlighting
  const findSubstringMatches = (text: string, query: string): Array<[number, number]> => {
    if (!query) return [];

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matches: Array<[number, number]> = [];

    let startIndex = 0;
    while (startIndex < lowerText.length) {
      const index = lowerText.indexOf(lowerQuery, startIndex);
      if (index === -1) break;

      matches.push([index, index + lowerQuery.length]);
      startIndex = index + 1; // Allow overlapping matches
    }

    return matches;
  };

  // Helper function to highlight text with matches
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text;

    const matches = findSubstringMatches(text, query);
    if (matches.length === 0) return text;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach(([start, end], idx) => {
      // Add text before match
      if (start > lastIndex) {
        parts.push(text.substring(lastIndex, start));
      }
      // Add highlighted match
      parts.push(
        <mark key={idx} className="bg-blue-200 dark:bg-blue-700 text-inherit rounded px-0.5">
          {text.substring(start, end)}
        </mark>
      );
      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  // Collect all matching messages for navigation
  const matchingMessages = useMemo(() => {
    if (!searchQuery) return [];

    const matches: MessageNode[] = [];

    fileTree.forEach((file) => {
      file.rootMessages.forEach((msg) => {
        if (fuzzyMatch(msg.name, searchQuery)) {
          matches.push(msg);
        }
      });

      file.packages.forEach((pkg) => {
        pkg.messages.forEach((msg) => {
          if (fuzzyMatch(msg.name, searchQuery)) {
            matches.push(msg);
          }
        });
      });
    });

    return matches;
  }, [fileTree, searchQuery]);

  // Reset current result index when search query changes
  useEffect(() => {
    setCurrentResultIndex(0);
  }, [searchQuery]);

  // Auto-expand files and packages that contain matching messages
  useEffect(() => {
    if (!searchQuery) return;

    const filesToExpand = new Set<string>();
    const packagesToExpand = new Set<string>();

    fileTree.forEach((file) => {
      let hasMatches = false;

      // Check root messages
      if (file.rootMessages.some(msg => fuzzyMatch(msg.name, searchQuery))) {
        hasMatches = true;
      }

      // Check packages
      file.packages.forEach((pkg) => {
        if (pkg.messages.some(msg => fuzzyMatch(msg.name, searchQuery))) {
          hasMatches = true;
          packagesToExpand.add(pkg.name);
        }
      });

      if (hasMatches) {
        filesToExpand.add(file.path);
      }
    });

    setExpandedFiles(filesToExpand);
    setExpandedPackages(packagesToExpand);
  }, [searchQuery, fileTree]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Only handle other shortcuts when search input is focused
      if (document.activeElement !== searchInputRef.current) {
        return;
      }

      // Escape: Clear search and blur
      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        searchInputRef.current?.blur();
        return;
      }

      // Enter / Shift+Enter: Navigate results
      if (e.key === 'Enter' && matchingMessages.length > 0) {
        e.preventDefault();

        if (e.shiftKey) {
          // Previous result
          setCurrentResultIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : matchingMessages.length - 1;
            navigateToResult(newIndex);
            return newIndex;
          });
        } else {
          // Next result
          setCurrentResultIndex((prev) => {
            const newIndex = prev < matchingMessages.length - 1 ? prev + 1 : 0;
            navigateToResult(newIndex);
            return newIndex;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchingMessages]);

  // Navigate to a specific result
  const navigateToResult = (index: number) => {
    if (index < 0 || index >= matchingMessages.length) return;

    const message = matchingMessages[index];

    // Find which file and package contains this message
    for (const file of fileTree) {
      let found = false;

      // Check root messages
      if (file.rootMessages.some(m => m.fullName === message.fullName)) {
        // Expand file
        setExpandedFiles(prev => new Set(prev).add(file.path));
        found = true;
      }

      // Check packages
      for (const pkg of file.packages) {
        if (pkg.messages.some(m => m.fullName === message.fullName)) {
          // Expand file and package
          setExpandedFiles(prev => new Set(prev).add(file.path));
          setExpandedPackages(prev => new Set(prev).add(pkg.name));
          found = true;
          break;
        }
      }

      if (found) {
        // Select the message
        onSelectMessage(message.fullName);
        break;
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleNextResult = () => {
    if (matchingMessages.length === 0) return;
    const newIndex = currentResultIndex < matchingMessages.length - 1 ? currentResultIndex + 1 : 0;
    setCurrentResultIndex(newIndex);
    navigateToResult(newIndex);
  };

  const handlePreviousResult = () => {
    if (matchingMessages.length === 0) return;
    const newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : matchingMessages.length - 1;
    setCurrentResultIndex(newIndex);
    navigateToResult(newIndex);
  };

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const togglePackage = (packageName: string) => {
    setExpandedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) {
        next.delete(packageName);
      } else {
        next.add(packageName);
      }
      return next;
    });
  };

  const handleRemoveFile = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    if (confirm(`Remove ${filePath} from memory?`)) {
      onRemoveFile(filePath);
    }
  };

  const renderMessage = (message: MessageNode, depth: number) => {
    // Filter: hide if doesn't match search query
    if (searchQuery && !fuzzyMatch(message.name, searchQuery)) {
      return null;
    }

    const isSelected = selectedMessage === message.fullName;
    const paddingLeft = `${depth * 0.75}rem`;

    return (
      <div
        key={message.fullName}
        className={`flex items-center gap-1 py-0.5 px-1.5 cursor-pointer transition-colors rounded text-xs ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
            : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300'
        }`}
        style={{ paddingLeft }}
        onClick={() => onSelectMessage(message.fullName)}
      >
        <FileText size={12} className="flex-shrink-0" />
        <span className="truncate" title={message.fullName}>
          {highlightText(message.name, searchQuery)}
        </span>
      </div>
    );
  };

  const renderPackage = (pkg: PackageNode, depth: number) => {
    // Filter: hide package if no messages match search query
    const hasMatchingMessages = searchQuery
      ? pkg.messages.some(msg => fuzzyMatch(msg.name, searchQuery))
      : true;

    if (!hasMatchingMessages) {
      return null;
    }

    const isExpanded = expandedPackages.has(pkg.name);
    const paddingLeft = `${depth * 0.75}rem`;

    // Render messages and filter out nulls
    const renderedMessages = pkg.messages
      .map((msg) => renderMessage(msg, depth + 1))
      .filter(Boolean);

    const renderedSubPackages = pkg.packages
      .map((subPkg) => renderPackage(subPkg, depth + 1))
      .filter(Boolean);

    return (
      <div key={pkg.name}>
        <div
          className="flex items-center gap-1 py-0.5 px-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors rounded text-gray-700 dark:text-neutral-300 text-xs"
          style={{ paddingLeft }}
          onClick={() => togglePackage(pkg.name)}
        >
          {isExpanded ? (
            <ChevronDown size={11} className="flex-shrink-0" />
          ) : (
            <ChevronRight size={11} className="flex-shrink-0" />
          )}
          <Package size={11} className="flex-shrink-0" />
          <span className="truncate" title={pkg.name}>
            {pkg.name}
          </span>
        </div>
        {isExpanded && (
          <div>
            {renderedMessages}
            {renderedSubPackages}
          </div>
        )}
      </div>
    );
  };

  const renderFile = (file: FileNode) => {
    // Filter: hide file if no messages match search query
    const hasMatchingMessages = searchQuery
      ? file.rootMessages.some(msg => fuzzyMatch(msg.name, searchQuery)) ||
        file.packages.some(pkg => pkg.messages.some(msg => fuzzyMatch(msg.name, searchQuery)))
      : true;

    if (!hasMatchingMessages) {
      return null;
    }

    const isExpanded = expandedFiles.has(file.path);
    const hasContent = file.packages.length > 0 || file.rootMessages.length > 0;

    // Render messages and packages, filtering out nulls
    const renderedRootMessages = file.rootMessages
      .map((msg) => renderMessage(msg, 1))
      .filter(Boolean);

    const renderedPackages = file.packages
      .map((pkg) => renderPackage(pkg, 1))
      .filter(Boolean);

    return (
      <div key={file.path}>
        <div
          className="flex items-center gap-1.5 py-1 px-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors rounded"
          onClick={() => toggleFile(file.path)}
        >
          {hasContent && (
            <>
              {isExpanded ? (
                <ChevronDown size={11} className="flex-shrink-0 text-gray-500 dark:text-neutral-400" />
              ) : (
                <ChevronRight size={11} className="flex-shrink-0 text-gray-500 dark:text-neutral-400" />
              )}
            </>
          )}
          {!hasContent && <div className="w-3" />}
          <File size={12} className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-gray-900 dark:text-neutral-100 truncate" title={file.path}>
                {file.path.split('/').pop() || file.path}
              </span>
              {file.isMain && (
                <Star size={10} className="flex-shrink-0 text-yellow-500 fill-yellow-500" aria-label="Main file" />
              )}
            </div>
            {file.path.includes('/') && (
              <div className="text-[10px] text-gray-500 dark:text-neutral-400 truncate leading-tight" title={file.path}>
                {file.path}
              </div>
            )}
          </div>
          <button
            onClick={(e) => handleRemoveFile(e, file.path)}
            className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors text-gray-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
            title="Remove file"
          >
            <X size={12} />
          </button>
        </div>

        {isExpanded && hasContent && (
          <div>
            {renderedRootMessages}
            {renderedPackages}
          </div>
        )}
      </div>
    );
  };

  if (fileTree.length === 0) {
    return (
      <div className="text-xs text-gray-500 dark:text-neutral-400 text-center py-3 px-3">
        No files loaded
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-3 pt-3">
      {/* Search Input - Fixed */}
      <div className="flex-shrink-0 mb-2 space-y-2 relative z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-20">
            <Search size={12} className="text-gray-400 dark:text-neutral-500" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search messages..."
            className="relative z-10 w-full pl-7 pr-16 py-1.5 text-xs bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1 z-20">
            {searchQuery && (
              <>
                {/* Result counter */}
                {matchingMessages.length > 0 && (
                  <span className="text-[10px] text-gray-500 dark:text-neutral-400 px-1">
                    {currentResultIndex + 1}/{matchingMessages.length}
                  </span>
                )}
                {/* Navigation buttons */}
                <button
                  onClick={handlePreviousResult}
                  disabled={matchingMessages.length === 0}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-neutral-400"
                  title="Previous result (Shift+Enter)"
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  onClick={handleNextResult}
                  disabled={matchingMessages.length === 0}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-neutral-400"
                  title="Next result (Enter)"
                >
                  <ArrowDown size={10} />
                </button>
                {/* Clear button */}
                <button
                  onClick={handleClearSearch}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors text-gray-600 dark:text-neutral-400"
                  title="Clear search (Esc)"
                >
                  <X size={10} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Files & Messages Header */}
      <div className="flex-shrink-0 mb-1.5">
        <h3 className="text-xs font-semibold text-gray-700 dark:text-neutral-300 px-1">
          Files & Messages
        </h3>
      </div>

      {/* File Tree - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {fileTree.map((file) => renderFile(file)).filter(Boolean)}
      </div>
    </div>
  );
};

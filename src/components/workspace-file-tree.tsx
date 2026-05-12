import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileJson, Folder } from 'lucide-react';
import { type WorkspaceExampleFile } from '@/data/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from './ui/sidebar';

interface WorkspaceFileTreeProps {
  files: WorkspaceExampleFile[];
  onSelect: (file: WorkspaceExampleFile) => void;
  preferLabels?: boolean;
  selectedId: string | null;
  showRoot?: boolean;
}

interface FileTreeDirectoryNode {
  kind: 'directory';
  name: string;
  path: string;
  children: FileTreeNode[];
}

interface FileTreeFileNode {
  kind: 'file';
  file: WorkspaceExampleFile;
  name: string;
}

type FileTreeNode = FileTreeDirectoryNode | FileTreeFileNode;

function collapseSingleChildDirectories(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.kind !== 'directory') return node;

    const collapsedChildren = collapseSingleChildDirectories(node.children);

    if (collapsedChildren.length === 1 && collapsedChildren[0].kind === 'directory') {
      const child = collapsedChildren[0];
      return {
        ...child,
        name: `${node.name}/${child.name}`,
      };
    }

    return {
      ...node,
      children: collapsedChildren,
    };
  });
}

function buildFileTree(
  files: WorkspaceExampleFile[],
  preferLabels: boolean,
) {
  const root: FileTreeDirectoryNode = {
    kind: 'directory',
    name: 'Project',
    path: 'project-root',
    children: [],
  };

  for (const file of files) {
    let currentDirectory = root;

    file.segments.forEach((segment, index) => {
      const isLast = index === file.segments.length - 1;

      if (isLast) {
        currentDirectory.children.push({
          kind: 'file',
          file,
          name: preferLabels ? file.label : segment,
        });
        return;
      }

      const directoryPath = file.segments.slice(0, index + 1).join('/');
      const existingDirectory = currentDirectory.children.find((child) => {
        return child.kind === 'directory' && child.path === directoryPath;
      });

      if (existingDirectory && existingDirectory.kind === 'directory') {
        currentDirectory = existingDirectory;
        return;
      }

      const nextDirectory: FileTreeDirectoryNode = {
        kind: 'directory',
        name: segment,
        path: directoryPath,
        children: [],
      };

      currentDirectory.children.push(nextDirectory);
      currentDirectory = nextDirectory;
    });
  }

  return {
    ...root,
    children: collapseSingleChildDirectories(sortTree(root.children)),
  };
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .map((node) => {
      if (node.kind === 'directory') {
        return {
          ...node,
          children: sortTree(node.children),
        };
      }

      return node;
    })
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'directory' ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
}

function FileTreeDirectory({
  node,
  onOpenChange,
  onSelect,
  openDirectories,
  selectedId,
}: {
  node: FileTreeDirectoryNode;
  onOpenChange: (path: string, open: boolean) => void;
  onSelect: (file: WorkspaceExampleFile) => void;
  openDirectories: Record<string, boolean>;
  selectedId: string | null;
}) {
  const containsSelected = node.children.some((child) => {
    return containsSelection(child, selectedId);
  });
  const open = openDirectories[node.path] ?? containsSelected;

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/tree-node w-full"
        onOpenChange={(nextOpen) => onOpenChange(node.path, nextOpen)}
        open={open}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="font-medium"
            isActive={containsSelected && open}
            tooltip={node.path === 'project-root' ? 'Project root' : node.path}
            type="button"
          >
            <ChevronRight className={`collapsible-chevron transition-transform ${open ? 'rotate-90' : ''}`} />
            <Folder />
            <span>{node.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mt-1">
            {node.children.map((child) =>
              child.kind === 'directory' ? (
                <FileTreeDirectory
                  key={child.path}
                  node={child}
                  onOpenChange={onOpenChange}
                  onSelect={onSelect}
                  openDirectories={openDirectories}
                  selectedId={selectedId}
                />
              ) : (
                <SidebarMenuSubItem key={child.file.id}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={selectedId === child.file.id}
                  >
                    <button
                      onClick={() => onSelect(child.file)}
                      title={child.file.relativePath}
                      type="button"
                    >
                      <FileJson />
                      <span>{child.name}</span>
                    </button>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ),
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function containsSelection(node: FileTreeNode, selectedId: string | null): boolean {
  if (node.kind === 'file') {
    return node.file.id === selectedId;
  }

  return node.children.some((child) => containsSelection(child, selectedId));
}

export function WorkspaceFileTree({
  files,
  onSelect,
  preferLabels = false,
  selectedId,
  showRoot = false,
}: WorkspaceFileTreeProps) {
  const rootNode = useMemo(() => buildFileTree(files, preferLabels), [files, preferLabels]);
  const [openDirectories, setOpenDirectories] = useState<Record<string, boolean>>({});
  const selectedDirectoryPaths = useMemo(() => {
    const selectedFile = files.find((file) => file.id === selectedId);

    if (!selectedFile) {
      return [] as string[];
    }

    return selectedFile.segments
      .slice(0, -1)
      .map((_, index) => selectedFile.segments.slice(0, index + 1).join('/'));
  }, [files, selectedId]);

  useEffect(() => {
    if (selectedDirectoryPaths.length === 0) {
      return;
    }

    setOpenDirectories((current) => {
      let changed = false;
      const next = { ...current };

      for (const path of selectedDirectoryPaths) {
        if (!next[path]) {
          next[path] = true;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [selectedDirectoryPaths]);

  if (rootNode.children.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sidebar-border px-3 py-4 text-sm text-sidebar-foreground/70">
        No JSON files found in <code>src/data/library</code>.
      </div>
    );
  }

  return (
    <SidebarMenu>
      {showRoot ? (
        <FileTreeDirectory
          key={rootNode.path}
          node={rootNode}
          onOpenChange={(path, open) => {
            setOpenDirectories((current) => ({
              ...current,
              [path]: open,
            }));
          }}
          onSelect={onSelect}
          openDirectories={openDirectories}
          selectedId={selectedId}
        />
      ) : (
        rootNode.children.map((child) =>
          child.kind === 'directory' ? (
            <FileTreeDirectory
              key={child.path}
              node={child}
              onOpenChange={(path, open) => {
                setOpenDirectories((current) => ({
                  ...current,
                  [path]: open,
                }));
              }}
              onSelect={onSelect}
              openDirectories={openDirectories}
              selectedId={selectedId}
            />
          ) : (
            <SidebarMenuItem key={child.file.id}>
              <SidebarMenuButton
                isActive={selectedId === child.file.id}
                onClick={() => onSelect(child.file)}
                tooltip={child.file.relativePath}
                type="button"
              >
                <FileJson />
                <span>{child.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )
      )}
    </SidebarMenu>
  );
}

import { BookOpen, FolderOpen, MoreHorizontal, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { WorkspaceFileTree } from '@/components/workspace-file-tree';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateTitle,
} from '@/components/ui/empty-state';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  type BrowserDraftDocument,
  type DiagramExample,
  type WorkspaceExampleFile,
} from '@/data/types';
import { BrandRow, ResizableSidebarRail, SidebarSection } from './inspector';
import { pluralize } from './document-helpers';
import type { ConnectedProject, MainView } from './types';

interface AppSidebarProps {
  activeProject: ConnectedProject | null;
  activeProjectDocumentSelected: boolean;
  activeProjectId: string | null;
  browserDraftDocuments: BrowserDraftDocument[];
  connectedProjects: ConnectedProject[];
  currentView: MainView;
  libraryWorkspaceFiles: WorkspaceExampleFile[];
  onConnectProjectFolder: () => void;
  onDeleteDrafts: (draftIds: string[]) => void;
  onDocumentSelect: (document: DiagramExample) => void;
  onHelpSelect: () => void;
  onRefreshConnectedProject: (projectId: string) => Promise<void>;
  onReconnectProject: (projectId: string) => Promise<void>;
  onRemoveConnectedProject: (projectId: string) => void;
  onSaveBrowserDraft: () => void;
  onToggleDraftSelection: (draftId: string) => void;
  selectedDocumentId: string;
  selectedDraftIds: string[];
  setActiveProjectId: (projectId: string) => void;
  setSelectedDraftIds: (draftIds: string[]) => void;
  setSidebarWidth: (width: number) => void;
  sidebarMinimized: boolean;
  sidebarWidth: number;
  onToggleSidebarMinimized: () => void;
}

export function AppSidebar({
  activeProject,
  activeProjectDocumentSelected,
  activeProjectId,
  browserDraftDocuments,
  connectedProjects,
  currentView,
  libraryWorkspaceFiles,
  onConnectProjectFolder,
  onDeleteDrafts,
  onDocumentSelect,
  onHelpSelect,
  onRefreshConnectedProject,
  onReconnectProject,
  onRemoveConnectedProject,
  onSaveBrowserDraft,
  onToggleDraftSelection,
  selectedDocumentId,
  selectedDraftIds,
  setActiveProjectId,
  setSelectedDraftIds,
  setSidebarWidth,
  sidebarMinimized,
  sidebarWidth,
  onToggleSidebarMinimized,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" data-minimized={sidebarMinimized ? 'true' : 'false'} variant="floating">
      <SidebarHeader className="px-2 py-2">
        <BrandRow
          minimized={sidebarMinimized}
          onToggleMinimized={onToggleSidebarMinimized}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarSection
          action={(
            <Button
              aria-label="Add project"
              onClick={onConnectProjectFolder}
              size="icon-xs"
              title="Add project"
              type="button"
              variant="ghost"
            >
              <Plus />
            </Button>
          )}
          countLabel={connectedProjects.length > 0 ? pluralize(connectedProjects.length, 'project') : undefined}
          title="Projects"
        >
          {connectedProjects.length > 0 ? (
            <div className="space-y-2">
              <SidebarMenu>
                {connectedProjects.map((project) => {
                  const isProjectActive = activeProjectId === project.id;

                  return (
                    <SidebarMenuItem key={project.id}>
                      <div className="flex items-start gap-1.5">
                        <SidebarMenuButton
                          className="min-w-0 flex-1"
                          isActive={isProjectActive}
                          onClick={() => setActiveProjectId(project.id)}
                          tooltip={project.name}
                          type="button"
                        >
                          <FolderOpen />
                          <span className="truncate">{project.name}</span>
                        </SidebarMenuButton>
                        <Button
                          aria-label={project.handle ? `Refresh ${project.name}` : `Reconnect ${project.name}`}
                          onClick={() => {
                            setActiveProjectId(project.id);
                            if (project.handle) {
                              void onRefreshConnectedProject(project.id);
                            } else {
                              void onReconnectProject(project.id);
                            }
                          }}
                          size="icon-xs"
                          title={project.handle ? `Refresh ${project.name}` : `Reconnect ${project.name}`}
                          type="button"
                          variant="ghost"
                        >
                          {project.handle ? <RefreshCw /> : <FolderOpen />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={`Project menu for ${project.name}`}
                              size="icon-xs"
                              title={`Project menu for ${project.name}`}
                              type="button"
                              variant="ghost"
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {project.handle ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveProjectId(project.id);
                                  void onRefreshConnectedProject(project.id);
                                }}
                              >
                                <RefreshCw />
                                Refresh project
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveProjectId(project.id);
                                  void onReconnectProject(project.id);
                                }}
                              >
                                <FolderOpen />
                                Reconnect project
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onRemoveConnectedProject(project.id)}
                            >
                              <Trash2 />
                              Remove project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>

              {activeProject ? (
                activeProject.files.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {activeProjectDocumentSelected ? activeProject.name : `${activeProject.name} files`}
                    </div>
                    <WorkspaceFileTree
                      files={activeProject.files}
                      onSelect={onDocumentSelect}
                      preferLabels
                      selectedId={currentView === 'document' ? selectedDocumentId : null}
                    />
                  </div>
                ) : (
                  <EmptyState className="mx-2">
                    <EmptyStateHeader>
                      <EmptyStateTitle>No diagrams in {activeProject.name}</EmptyStateTitle>
                      <EmptyStateDescription>
                        This connected project does not include any diagram files yet.
                      </EmptyStateDescription>
                    </EmptyStateHeader>
                    <EmptyStateFooter>
                      <Button
                        className="w-full"
                        onClick={() => void (activeProject.handle
                          ? onRefreshConnectedProject(activeProject.id)
                          : onReconnectProject(activeProject.id))}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {activeProject.handle ? <RefreshCw /> : <FolderOpen />}
                        <span>{activeProject.handle ? 'Refresh project' : 'Reconnect project'}</span>
                      </Button>
                    </EmptyStateFooter>
                  </EmptyState>
                )
              ) : null}
            </div>
          ) : (
            <EmptyState className="mx-2">
              <EmptyStateHeader>
                <EmptyStateTitle>No projects yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Add a project to browse local diagram files and save changes directly to disk.
                </EmptyStateDescription>
              </EmptyStateHeader>
              <EmptyStateFooter>
                <Button
                  className="w-full"
                  onClick={onConnectProjectFolder}
                  size="sm"
                  type="button"
                >
                  <Plus />
                  <span>Add project</span>
                </Button>
              </EmptyStateFooter>
            </EmptyState>
          )}
        </SidebarSection>

        <SidebarSection
          countLabel={pluralize(libraryWorkspaceFiles.length, 'file')}
          title="Library"
        >
          <WorkspaceFileTree
            files={libraryWorkspaceFiles}
            onSelect={onDocumentSelect}
            preferLabels
            selectedId={currentView === 'document' ? selectedDocumentId : null}
          />
        </SidebarSection>

        <SidebarSection
          countLabel={
            browserDraftDocuments.length > 0
              ? pluralize(browserDraftDocuments.length, 'draft')
              : 'Empty'
          }
          title="Drafts"
        >
          {browserDraftDocuments.length > 0 ? (
            <div className="space-y-2">
              <SidebarMenu>
                {browserDraftDocuments.map((draftDocument) => (
                  <SidebarMenuItem key={draftDocument.id}>
                    <div className="flex items-center gap-2">
                      <SidebarMenuButton
                        className="min-w-0 flex-1"
                        isActive={currentView === 'document' && selectedDocumentId === draftDocument.id}
                        onClick={() => onDocumentSelect(draftDocument)}
                        tooltip="Browser storage"
                        type="button"
                      >
                        <Save />
                        <span className="truncate">{draftDocument.displayName}</span>
                      </SidebarMenuButton>
                      <input
                        aria-label={`Select ${draftDocument.displayName}`}
                        checked={selectedDraftIds.includes(draftDocument.id)}
                        className="size-4 rounded border-border bg-background accent-foreground"
                        onChange={() => onToggleDraftSelection(draftDocument.id)}
                        type="checkbox"
                      />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              {selectedDraftIds.length > 0 ? (
                <div className="flex items-center justify-between gap-2 px-2">
                  <span className="text-xs text-muted-foreground">
                    {pluralize(selectedDraftIds.length, 'draft')} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setSelectedDraftIds([])}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={() => onDeleteDrafts(selectedDraftIds)}
                      size="xs"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 />
                      <span>Delete selected</span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState className="mx-2">
              <EmptyStateHeader>
                <EmptyStateTitle>No drafts yet</EmptyStateTitle>
                <EmptyStateDescription>
                  Create a draft to keep a browser copy while you iterate.
                </EmptyStateDescription>
              </EmptyStateHeader>
              <EmptyStateFooter>
                <Button
                  className="w-full"
                  onClick={onSaveBrowserDraft}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Save />
                  <span>Clone</span>
                </Button>
              </EmptyStateFooter>
            </EmptyState>
          )}
        </SidebarSection>

        <SidebarGroup className="mt-auto px-2 pb-2 pt-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={currentView === 'help'}
                onClick={onHelpSelect}
                type="button"
              >
                <BookOpen />
                <span>Help</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <ResizableSidebarRail onResize={setSidebarWidth} width={sidebarWidth} />
    </Sidebar>
  );
}

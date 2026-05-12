import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Info, Menu, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { clampInspectorWidth, clampSidebarWidth } from './layout-constants';

export function SidebarSection({
  action,
  children,
  countLabel,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  countLabel?: string;
  title: string;
}) {
  return (
    <SidebarGroup className="px-2 py-3">
      <SidebarGroupLabel className="h-auto justify-between px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{title}</span>
        {countLabel || action ? (
          <span className="flex items-center gap-1.5">
            {countLabel ? <span>{countLabel}</span> : null}
            {action}
          </span>
        ) : null}
      </SidebarGroupLabel>
      <SidebarGroupContent className="mt-1">
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function InspectorTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className="diagram-inspector-shell__tab"
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

export function ResizableInspectorRail({
  onResize,
}: {
  onResize: (nextWidth: number) => void;
}) {
  const draggingRef = useRef(false);
  const containerRectRef = useRef<DOMRect | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('cursor');
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const containerRect = event.currentTarget.parentElement?.getBoundingClientRect();

    if (!containerRect) {
      return;
    }

    draggingRef.current = true;
    setDragging(true);
    containerRectRef.current = containerRect;
    document.body.style.cursor = 'col-resize';
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!draggingRef.current || !containerRectRef.current) {
        return;
      }

      onResize(
        clampInspectorWidth(containerRectRef.current.right - moveEvent.clientX),
      );
    };

    const stopDragging = () => {
      draggingRef.current = false;
      setDragging(false);
      containerRectRef.current = null;
      document.body.style.removeProperty('cursor');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    event.preventDefault();
  };

  return (
    <div
      aria-label="Resize inspector"
      aria-orientation="vertical"
      className="diagram-inspector-shell__rail"
      data-dragging={dragging ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      role="separator"
      title="Resize inspector"
    />
  );
}

export function WorkspaceAlert({
  children,
  title,
  variant,
}: {
  children: ReactNode;
  title: string;
  variant?: 'default' | 'destructive' | 'warning';
}) {
  return (
    <Alert variant={variant === 'destructive' ? 'destructive' : 'default'}>
      {variant === 'destructive' || variant === 'warning' ? <TriangleAlert /> : <Info />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function BrandRow({
  minimized,
  onToggleMinimized,
}: {
  minimized: boolean;
  onToggleMinimized: () => void;
}) {
  const handleToggleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onToggleMinimized();
    },
    [onToggleMinimized],
  );

  return (
    <div
      className="flex items-center justify-between gap-2 cursor-pointer select-none"
      onClick={onToggleMinimized}
      onKeyDown={handleToggleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={minimized ? 'Expand sidebar' : 'Collapse sidebar'}
      title={minimized ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <div className="flex items-center gap-1">
        <Button
          aria-hidden
          size="icon-xs"
          tabIndex={-1}
          variant="ghost"
        >
          <Menu />
        </Button>
        <div className="min-w-0 text-[10px] font-semibold tracking-[0.18em] text-foreground">
          AI SYSTEMS DESIGNER
        </div>
      </div>
    </div>
  );
}

export function ResizableSidebarRail({
  onResize,
  width,
}: {
  onResize: (nextWidth: number) => void;
  width: number;
}) {
  const { state, toggleSidebar } = useSidebar();
  const clickBlockedRef = useRef(false);
  const dragStateRef = useRef<{ startWidth: number; startX: number } | null>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragStateRef.current) {
        return;
      }

      const delta = event.clientX - dragStateRef.current.startX;
      if (Math.abs(delta) > 2) {
        clickBlockedRef.current = true;
      }

      onResize(clampSidebarWidth(dragStateRef.current.startWidth + delta));
    },
    [onResize],
  );

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, [handlePointerMove, stopDragging]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || state !== 'expanded') {
      return;
    }

    clickBlockedRef.current = false;
    dragStateRef.current = {
      startWidth: width,
      startX: event.clientX,
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    event.preventDefault();
  };

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (clickBlockedRef.current) {
      clickBlockedRef.current = false;
      event.preventDefault();
      return;
    }

    toggleSidebar();
  };

  return (
    <SidebarRail
      aria-label={state === 'expanded' ? 'Resize sidebar' : 'Expand sidebar'}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      title={state === 'expanded' ? 'Resize or collapse sidebar' : 'Expand sidebar'}
    />
  );
}

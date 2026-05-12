import { useEffect, useMemo, useState } from 'react';
import { Position } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { DeleteInspectorFooter } from './DeleteInspectorFooter';
import { SelectField, type SelectOption } from './SelectField';
import { Input } from '@/components/ui/input';
import { parseStyleDimension, type DiagramEdge, type DiagramNode } from './layout';
import type { DiagramConnectorLineStyle, DiagramHandlePosition } from './schema';
import { useEdgeEditor } from './edge-editor-context';
import {
  buildEdgeGeometry,
  canCollapseEdgeRoute,
  collapseEdgeRoutingBends,
  getLoopOffsetFromTrackY,
  getRaisedHeightFromTrackY,
  getTrackYFromLoopOffset,
  getTrackYFromRaisedHeight,
  resetEdgeRoutingBends,
  resolveHandlePosition,
  snapRoutingOffset,
  snapEdgeValue,
  type RoutableEdgeData,
  type EdgeNodeBounds,
  type EdgeRoutingVariant,
} from './edge-routing';

const HANDLE_OPTIONS: DiagramHandlePosition[] = ['top', 'right', 'bottom', 'left'];

const ROUTE_OPTIONS: SelectOption[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step' },
  { value: 'raised', label: 'Raised' },
];

const EDGE_STYLE_OPTIONS: SelectOption[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
];

function getEdgeNodeBounds(node: DiagramNode | undefined): EdgeNodeBounds | undefined {
  if (!node) {
    return undefined;
  }

  const width = parseStyleDimension(node.style?.width);
  const height = parseStyleDimension(node.style?.height);

  if (width === undefined || height === undefined) {
    return undefined;
  }

  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

function getNodeFallback(node: DiagramNode | undefined) {
  return {
    x: node?.position.x ?? 0,
    y: node?.position.y ?? 0,
  };
}

function useDraftField(serverValue: string) {
  const [draft, setDraft] = useState(serverValue);

  useEffect(() => {
    setDraft(serverValue);
  }, [serverValue]);

  return { draft, setDraft };
}

function commitOnEnter(commit: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    commit();
  };
}

function NumericField({
  label,
  onCommit,
  snap,
  value,
}: {
  label: string;
  onCommit: (value: number) => void;
  snap?: (value: number) => number;
  value: number;
}) {
  const { draft, setDraft } = useDraftField(String(value));

  const commit = () => {
    const parsed = Number(draft);

    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }

    const snapped = snap ? snap(parsed) : snapEdgeValue(parsed);
    onCommit(snapped);
  };

  return (
    <label className="diagram-edge-inspector__field">
      <span className="diagram-edge-inspector__label">{label}</span>
      <Input
        aria-label={label}
        className="diagram-edge-inspector__input"
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={commitOnEnter(commit)}
        step={16}
        type="number"
        value={draft}
      />
    </label>
  );
}

function TextField({
  label,
  onCommit,
  value,
}: {
  label: string;
  onCommit: (value: string | undefined) => void;
  value: string;
}) {
  const { draft, setDraft } = useDraftField(value);

  const commit = () => {
    const normalized = draft.trim();
    onCommit(normalized ? normalized : undefined);
  };

  return (
    <label className="diagram-edge-inspector__field diagram-edge-inspector__field--wide">
      <span className="diagram-edge-inspector__label">{label}</span>
      <Input
        aria-label={label}
        className="diagram-edge-inspector__input"
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={commitOnEnter(commit)}
        type="text"
        value={draft}
      />
    </label>
  );
}

function positionToHandleValue(position: Position): DiagramHandlePosition {
  switch (position) {
    case Position.Top:
      return 'top';
    case Position.Bottom:
      return 'bottom';
    case Position.Left:
      return 'left';
    case Position.Right:
    default:
      return 'right';
  }
}

function getCurrentLineStyle(edge: DiagramEdge, edgeData: RoutableEdgeData): DiagramConnectorLineStyle {
  if (edgeData.lineStyle) {
    return edgeData.lineStyle;
  }

  return edge.style?.strokeDasharray ? 'dashed' : 'solid';
}

export function EdgeInspector({
  edge,
  nodes,
  onDelete,
}: {
  edge: DiagramEdge;
  nodes: DiagramNode[];
  onDelete: () => void;
}) {
  const editor = useEdgeEditor();
  const edgeData = ((edge.data as RoutableEdgeData | undefined) ?? {}) satisfies RoutableEdgeData;
  const sourceNode = useMemo(
    () => nodes.find((node) => node.id === edge.source),
    [edge.source, nodes],
  );
  const targetNode = useMemo(
    () => nodes.find((node) => node.id === edge.target),
    [edge.target, nodes],
  );
  const sourcePosition = resolveHandlePosition(edge.sourceHandle, Position.Right);
  const targetPosition = resolveHandlePosition(edge.targetHandle, Position.Left);
  const geometry = buildEdgeGeometry({
    label: typeof edge.label === 'string' ? edge.label : undefined,
    routing: edgeData.routing,
    sourceBounds: getEdgeNodeBounds(sourceNode),
    sourceFallback: getNodeFallback(sourceNode),
    sourcePosition,
    targetBounds: getEdgeNodeBounds(targetNode),
    targetFallback: getNodeFallback(targetNode),
    targetPosition,
    variant: edgeData.variant,
  });
  const visibleVariant: EdgeRoutingVariant =
    geometry.variant === 'default' ? 'bend' : geometry.variant;

  if (!editor) {
    return null;
  }

  const handleOptions =
    geometry.routeKind === 'loopback'
      ? (['top', 'bottom'] satisfies DiagramHandlePosition[])
      : HANDLE_OPTIONS;

  const applyLoopHandlePosition = (position: DiagramHandlePosition) => {
    editor.setEdgeSourcePosition(edge.id, position);
    editor.setEdgeTargetPosition(edge.id, position);
  };
  const currentLineStyle = getCurrentLineStyle(edge, edgeData);
  const raisedHeight = geometry.controlPoints.track
    ? getRaisedHeightFromTrackY(
        geometry.source.y,
        geometry.target.y,
        geometry.controlPoints.track.y,
      )
    : 0;
  const loopOffset = geometry.controlPoints.track
    ? getLoopOffsetFromTrackY(
        geometry.source.y,
        geometry.sourcePosition,
        geometry.controlPoints.track.y,
      )
    : 0;
  const showsBendActions = geometry.routeKind !== 'direct';
  const canCollapseBend = canCollapseEdgeRoute(geometry.routeKind);
  const resetBendLabel =
    geometry.routeKind === 'raised' || geometry.routeKind === 'loopback'
      ? 'Reset height'
      : 'Reset bend';
  const collapseBendLabel =
    geometry.routeKind === 'raised' || geometry.routeKind === 'loopback'
      ? 'Collapse height'
      : 'Collapse bend';

  return (
    <aside
      aria-label="Edge inspector"
      className="diagram-edge-inspector"
    >
      <div className="diagram-edge-inspector__header">
        <div>
          <p className="diagram-edge-inspector__eyebrow">Edge</p>
          <h3 className="diagram-edge-inspector__title">
            {typeof edge.label === 'string' && edge.label
              ? edge.label
              : `${edge.source} -> ${edge.target}`}
          </h3>
        </div>
      </div>

      <section className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Routing</h4>
        <div className="diagram-edge-inspector__grid">
          <TextField
            label="Edge text"
            onCommit={(value) => {
              editor.setEdgeLabel(edge.id, value);
            }}
            value={typeof edge.label === 'string' ? edge.label : ''}
          />
          <SelectField
            label="Route"
            onChange={(value) => {
              editor.setEdgeRoutingVariant(edge.id, value as EdgeRoutingVariant);
            }}
            options={ROUTE_OPTIONS}
            value={visibleVariant}
          />
          <SelectField
            label="Edge style"
            onChange={(value) => {
              editor.setEdgeLineStyle(edge.id, value as DiagramConnectorLineStyle);
            }}
            options={EDGE_STYLE_OPTIONS}
            value={currentLineStyle}
          />
        </div>
      </section>

      <section className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Endpoints</h4>
        <div className="diagram-edge-inspector__grid">
          <SelectField
            label="Source side"
            onChange={(value) => {
              const nextPosition = value as DiagramHandlePosition;

              if (geometry.routeKind === 'loopback') {
                applyLoopHandlePosition(nextPosition);
                return;
              }

              editor.setEdgeSourcePosition(edge.id, nextPosition);
            }}
            options={handleOptions.map((option) => ({ value: option, label: option }))}
            value={positionToHandleValue(geometry.sourcePosition)}
          />
          <NumericField
            label="Source offset"
            onCommit={(value) => {
              editor.setEdgeRouting(edge.id, (current) => ({
                ...(current ?? {}),
                sourceOffset: value,
              }));
            }}
            snap={snapRoutingOffset}
            value={geometry.routing.sourceOffset ?? 0}
          />
          <SelectField
            label="Target side"
            onChange={(value) => {
              const nextPosition = value as DiagramHandlePosition;

              if (geometry.routeKind === 'loopback') {
                applyLoopHandlePosition(nextPosition);
                return;
              }

              editor.setEdgeTargetPosition(edge.id, nextPosition);
            }}
            options={handleOptions.map((option) => ({ value: option, label: option }))}
            value={positionToHandleValue(geometry.targetPosition)}
          />
          <NumericField
            label="Target offset"
            onCommit={(value) => {
              editor.setEdgeRouting(edge.id, (current) => ({
                ...(current ?? {}),
                targetOffset: value,
              }));
            }}
            snap={snapRoutingOffset}
            value={geometry.routing.targetOffset ?? 0}
          />
        </div>
      </section>

      <section className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Geometry</h4>
        <div className="diagram-edge-inspector__grid">
          {geometry.routeKind === 'horizontal-step' ? (
            <NumericField
              label="Bend X"
              onCommit={(value) => {
                editor.setEdgeRouting(edge.id, (current) => ({
                  ...(current ?? {}),
                  bendX: value,
                }));
              }}
              value={geometry.routing.bendX ?? geometry.controlPoints.bend?.x ?? 0}
            />
          ) : null}

          {geometry.routeKind === 'vertical-step' ? (
            <NumericField
              label="Bend Y"
              onCommit={(value) => {
                editor.setEdgeRouting(edge.id, (current) => ({
                  ...(current ?? {}),
                  bendY: value,
                }));
              }}
              value={geometry.routing.bendY ?? geometry.controlPoints.bend?.y ?? 0}
            />
          ) : null}

          {geometry.routeKind === 'mixed-step' ? (
            <>
              <NumericField
                label="Elbow X"
                onCommit={(value) => {
                  editor.setEdgeRouting(edge.id, (current) => ({
                    ...(current ?? {}),
                    elbowX: value,
                  }));
                }}
                value={geometry.routing.elbowX ?? geometry.controlPoints.bend?.x ?? 0}
              />
              <NumericField
                label="Elbow Y"
                onCommit={(value) => {
                  editor.setEdgeRouting(edge.id, (current) => ({
                    ...(current ?? {}),
                    elbowY: value,
                  }));
                }}
                value={geometry.routing.elbowY ?? geometry.controlPoints.bend?.y ?? 0}
              />
            </>
          ) : null}

          {(geometry.routeKind === 'raised' || geometry.routeKind === 'loopback') ? (
            <NumericField
              label={geometry.routeKind === 'raised' ? 'Raised Height' : 'Loop Offset'}
              onCommit={(value) => {
                editor.setEdgeRouting(edge.id, (current) => ({
                  ...(current ?? {}),
                  trackY: geometry.routeKind === 'raised'
                    ? getTrackYFromRaisedHeight(geometry.source.y, geometry.target.y, value)
                    : getTrackYFromLoopOffset(
                        geometry.source.y,
                        geometry.sourcePosition,
                        value,
                      ),
                }));
              }}
              value={geometry.routeKind === 'raised' ? raisedHeight : loopOffset}
            />
          ) : null}
        </div>

        <div className="diagram-edge-inspector__actions">
          <Button
            onClick={() => editor.resetEdgeRouting(edge.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Reset to auto route
          </Button>
          <Button
            disabled={!showsBendActions}
            onClick={() => {
              editor.setEdgeRouting(
                edge.id,
                resetEdgeRoutingBends(edgeData.routing),
              );
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {resetBendLabel}
          </Button>
          {canCollapseBend ? (
            <Button
              onClick={() => {
                editor.setEdgeRouting(
                  edge.id,
                  collapseEdgeRoutingBends({
                    routeKind: geometry.routeKind,
                    routing: edgeData.routing,
                    source: geometry.source,
                    sourcePosition: geometry.sourcePosition,
                    target: geometry.target,
                    targetPosition: geometry.targetPosition,
                  }),
                );
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {collapseBendLabel}
            </Button>
          ) : null}
        </div>
      </section>

      <DeleteInspectorFooter label="Delete edge" onDelete={onDelete} />
    </aside>
  );
}

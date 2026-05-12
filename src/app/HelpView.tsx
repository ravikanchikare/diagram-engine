export function HelpView() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6 text-sm">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-xl font-semibold">Help</h1>
        <section>
          <h2 className="mb-3 text-base font-semibold">Diagram types</h2>
          <div className="space-y-4 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Sequence</p>
              <p>Multi-actor lane-based message flows. Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">type: "sequence"</code> with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">sequenceActor</code> and <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">sequenceAction</code> elements.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">State</p>
              <p>State machines with directed edges. Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">type: "state"</code> with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">state</code> nodes and edge objects with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">from</code>/<code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">to</code> fields.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Entity</p>
              <p>Entity-relationship diagrams. Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">type: "entity"</code> with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">entity</code> nodes that have <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">header</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">rows</code>, and <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">handles</code>.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Overview</p>
              <p>Architecture overviews with icons and text. Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">type: "overview"</code> with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">icon</code> and <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">text</code> elements.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Block</p>
              <p>Flowcharts and block diagrams. Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">type: "block"</code> with <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">block</code> nodes, optional <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">layer</code> containers, and edge objects.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Theming</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>Create a <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">diagram-theme.json</code> file in your connected project root to apply custom colors across all diagrams in that project.</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">{`{
  "type": "diagram-theme",
  "tokens": {
    "light": {
      "canvas": { "background": "#f8fafc", "gridColor": "#dde7f3" },
      "node": { "background": "#ffffff", "border": "#d1dce8" },
      "connector": { "default": "#9aa7b8" }
    },
    "dark": {
      "canvas": { "background": "#0f1724", "gridColor": "#1e2d42" }
    }
  }
}`}</pre>
            <p>You can also add a <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">tokens</code> field directly inside any diagram definition to override tokens for that diagram only.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Keyboard shortcuts</h2>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between"><span>Pan canvas</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Space + drag</kbd></div>
            <div className="flex justify-between"><span>Zoom in / out</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Scroll</kbd></div>
            <div className="flex justify-between"><span>Fit view</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl/⌘ + Shift + H</kbd></div>
            <div className="flex justify-between"><span>Select all</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl/⌘ + A</kbd></div>
            <div className="flex justify-between"><span>Apply Markdoc in inspector</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl/⌘ + Enter</kbd></div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Export</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>Use the <strong className="font-medium text-foreground">Export</strong> button in the toolbar to download the current diagram as PNG, JPEG, or SVG. The export captures the full canvas at 2× pixel ratio.</p>
            <p>To export the JSON definition, open the JSON view tab and copy the editor contents, or use your browser's save function.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Connected projects</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>Click <strong className="font-medium text-foreground">Add project</strong> in the sidebar to open a local folder. All <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">.json</code> files that contain valid diagram definitions are discovered automatically.</p>
            <p>Changes saved via the <strong className="font-medium text-foreground">Save</strong> button are written directly to disk. A <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">diagram-theme.json</code> file at the project root is loaded as the project theme.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

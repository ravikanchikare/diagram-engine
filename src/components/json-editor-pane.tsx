import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type JSONEditor from 'jsoneditor';
import type { JSONEditorOptions } from 'jsoneditor';
import { cn } from '@/lib/utils';
import 'jsoneditor/dist/jsoneditor.css';

export interface JsonEditorPaneHandle {
  focus: () => void;
}

export interface JsonEditorPaneProps {
  className?: string;
  invalid?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}

export const JsonEditorPane = forwardRef<
  JsonEditorPaneHandle,
  JsonEditorPaneProps
>(function JsonEditorPane(
  {
    className,
    invalid = false,
    onChangeText,
    value,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<JSONEditor | null>(null);
  const syncingRef = useRef(false);
  const onChangeTextRef = useRef(onChangeText);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = editorRef.current?.getText();
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    onChangeTextRef.current = onChangeText;
  }, [onChangeText]);

  useImperativeHandle(ref, () => ({
    focus() {
      containerRef.current
        ?.querySelector<HTMLElement>('.jsoneditor textarea, .ace_text-input')
        ?.focus();
    },
  }));

  useEffect(() => {
    let disposed = false;
    let mountedEditor: JSONEditor | null = null;

    async function mountEditor() {
      if (!containerRef.current) {
        return;
      }

      const { default: JSONEditorClass } = await import('jsoneditor');

      if (disposed || !containerRef.current) {
        return;
      }

      const options: JSONEditorOptions = {
        mainMenuBar: false,
        mode: 'code',
        modes: ['code'],
        navigationBar: true,
        onChangeText(nextText) {
          if (syncingRef.current) {
            return;
          }

          onChangeTextRef.current(nextText);
        },
        statusBar: true,
      };

      mountedEditor = new JSONEditorClass(containerRef.current, options);
      editorRef.current = mountedEditor;
      syncingRef.current = true;
      mountedEditor.setText(value);
      syncingRef.current = false;
    }

    void mountEditor();

    return () => {
      disposed = true;
      mountedEditor?.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const currentText = editor.getText();

    if (currentText === value) {
      return;
    }

    syncingRef.current = true;
    editor.updateText(value);
    syncingRef.current = false;
  }, [value]);

  return (
    <div
      className={cn(
        'json-editor-pane',
        invalid ? 'json-editor-pane--invalid' : undefined,
        className,
      )}
    >
      <button
        className="json-editor-pane__copy"
        onClick={handleCopy}
        type="button"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <div className="json-editor-pane__surface" ref={containerRef} />
    </div>
  );
});

import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';

type JsonViewerProps = {
  value: string;
  maxHeight?: string;
  className?: string;
};

export function JsonViewer({
  value,
  maxHeight = '360px',
  className = '',
}: JsonViewerProps) {
  return (
    <CodeMirror
      value={value}
      height={maxHeight}
      theme="dark"
      extensions={[json(), EditorView.lineWrapping, EditorView.editable.of(false)]}
      editable={false}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      className={`overflow-hidden rounded-md border border-slate-800 bg-slate-950/80 text-[13px] ${className}`}
    />
  );
}

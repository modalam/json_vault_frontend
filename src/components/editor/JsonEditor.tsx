import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';

type JsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function JsonEditor({ value, onChange, readOnly = false }: JsonEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme="dark"
      extensions={[json(), EditorView.lineWrapping]}
      onChange={onChange}
      editable={!readOnly}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
      }}
      className="h-full overflow-hidden text-[13px]"
      data-testid="json-editor"
    />
  );
}

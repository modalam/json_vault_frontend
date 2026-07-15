import { create } from 'zustand';

type EditorMode = 'text' | 'tree';

type EditorState = {
  text: string;
  mode: EditorMode;
  valid: boolean;
  error: string | null;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  statusMessage: string | null;
  blobId: string | null;
  blobName: string;
  setText: (text: string, opts?: { dirty?: boolean; fromRemote?: boolean }) => void;
  setMode: (mode: EditorMode) => void;
  setValidation: (valid: boolean, error: string | null) => void;
  setSaving: (saving: boolean) => void;
  setLoading: (loading: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  setBlobId: (id: string | null) => void;
  setBlobName: (name: string) => void;
  reset: () => void;
};

const DEFAULT_JSON = '{\n  "hello": "world"\n}\n';

export const useEditorStore = create<EditorState>((set) => ({
  text: DEFAULT_JSON,
  mode: 'text',
  valid: true,
  error: null,
  dirty: false,
  saving: false,
  loading: false,
  statusMessage: null,
  blobId: null,
  blobName: '',
  setText: (text, opts) =>
    set({
      text,
      dirty: opts?.fromRemote ? false : (opts?.dirty ?? true),
    }),
  setMode: (mode) => set({ mode }),
  setValidation: (valid, error) => set({ valid, error }),
  setSaving: (saving) => set({ saving }),
  setLoading: (loading) => set({ loading }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setBlobId: (blobId) => set({ blobId }),
  setBlobName: (blobName) => set({ blobName }),
  reset: () =>
    set({
      text: DEFAULT_JSON,
      mode: 'text',
      valid: true,
      error: null,
      dirty: false,
      saving: false,
      loading: false,
      statusMessage: null,
      blobId: null,
      blobName: '',
    }),
}));

export { DEFAULT_JSON };

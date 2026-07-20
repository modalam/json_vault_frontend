import { useNavigate } from 'react-router-dom';
import { HttpRequestView } from '@/components/editor/HttpRequestView';
import { getRequestReturnPath } from '@/lib/request-navigation';
import { useEditorStore } from '@/stores/editor-store';

export function RequestPage() {
  const navigate = useNavigate();
  const text = useEditorStore((state) => state.text);

  return (
    <HttpRequestView
      initialBody={text.trim() ? text : ''}
      onBack={() => navigate(getRequestReturnPath())}
    />
  );
}

import { useParams } from 'react-router-dom';
import { EditorWorkspace } from '@/components/editor/EditorWorkspace';

export function BlobPage() {
  const { id } = useParams<{ id: string }>();
  return <EditorWorkspace blobId={id} />;
}

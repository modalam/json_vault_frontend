import { useNavigate } from 'react-router-dom';
import { HttpRequestView } from '@/components/editor/HttpRequestView';

export function RequestPage() {
  const navigate = useNavigate();

  return <HttpRequestView onBack={() => navigate('/dashboard')} />;
}

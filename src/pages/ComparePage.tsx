import { useNavigate } from 'react-router-dom';
import { JsonCompareView } from '@/components/editor/JsonCompareView';

export function ComparePage() {
  const navigate = useNavigate();

  return <JsonCompareView onBack={() => navigate('/dashboard')} />;
}

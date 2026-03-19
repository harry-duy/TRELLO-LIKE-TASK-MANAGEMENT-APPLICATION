import { useParams } from 'react-router-dom';
import BoardCanvas from '@components/board/BoardCanvas';

export default function BoardPage() {
  const { boardId } = useParams();
  return <BoardCanvas boardId={boardId} showHeader />;
}

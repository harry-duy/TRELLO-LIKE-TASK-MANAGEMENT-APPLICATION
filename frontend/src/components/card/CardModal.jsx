// src/components/card/CardModal.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cardService from '@services/cardService';

export default function CardModal({ cardId, boardId, onClose }) {
  const queryClient = useQueryClient();

  // Lấy dữ liệu chi tiết thẻ
  const { data: card, isLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => cardService.getDetails(cardId),
  });

  // Mutation để thêm bình luận
  const commentMutation = useMutation({
    mutationFn: (content) => cardService.addComment(cardId, { content, boardId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['card', cardId]); // Refresh lại dữ liệu thẻ
    },
  });

  if (isLoading) return <div className="modal-overlay">Đang tải...</div>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
        <header className="mb-4">
          <h2 className="text-xl font-bold">{card?.title}</h2>
          <p className="text-sm text-gray-500">Trong danh sách: {card?.list?.name}</p>
        </header>

        <section className="mb-6">
          <h3 className="font-semibold mb-2">Mô tả</h3>
          <p className="text-gray-700 bg-gray-50 p-3 rounded">{card?.description || 'Chưa có mô tả...'}</p>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Hoạt động (Bình luận)</h3>
          <div className="space-y-4 mb-4">
            {card?.comments?.map((comment) => (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex-shrink-0" />
                <div className="bg-gray-100 p-2 rounded-lg flex-1">
                  <p className="text-sm font-bold">{comment.user.name}</p>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Ô nhập bình luận */}
          <textarea 
            className="input w-full mb-2" 
            placeholder="Viết bình luận..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commentMutation.mutate(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </section>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>
  );
}
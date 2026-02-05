import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import boardService from '@services/boardService';
import cardService from '@services/cardService';
import ListColumn from '@components/board/ListColumn';
import CardModal from '@components/card/CardModal';
import { 
  initializeSocket, 
  joinBoard, 
  leaveBoard, 
  onCardMoved, 
  emitCardMove,
  onCommentAdded
} from '@config/socket';
import toast from 'react-hot-toast';

export default function BoardPage() {
  const { boardId } = useParams();
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [activeCard, setActiveCard] = useState(null); // Cho hiệu ứng DragOverlay

  // 1. Fetch dữ liệu bảng (kèm lists và cards)
  const { data: board, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardDetails(boardId),
    enabled: !!boardId,
  });

  // 2. Thiết lập Socket.io
  useEffect(() => {
    if (boardId) {
      initializeSocket();
      joinBoard(boardId);

      // Lắng nghe sự kiện di chuyển thẻ từ người khác
      const unSubMove = onCardMoved((data) => {
        queryClient.invalidateQueries(['board', boardId]);
        toast.success("Một thẻ vừa được di chuyển!");
      });

      // Lắng nghe bình luận mới
      const unSubComment = onCommentAdded((data) => {
        if (selectedCardId === data.cardId) {
          queryClient.invalidateQueries(['card', data.cardId]);
        }
      });

      return () => {
        leaveBoard(boardId);
        unSubMove();
        unSubComment();
      };
    }
  }, [boardId, queryClient, selectedCardId]);

  // 3. Cấu hình Sensors cho Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // Tránh click nhầm thành kéo
    })
  );

  // 4. Xử lý khi bắt đầu kéo
  const handleDragStart = (event) => {
    const { active } = event;
    // Tìm thông tin thẻ đang kéo để hiển thị overlay
    const card = board?.lists
      .flatMap(l => l.cards)
      .find(c => c._id === active.id);
    setActiveCard(card);
  };

  // 5. Xử lý khi kết thúc kéo thả
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id;
    const overId = over.id;

    // Tìm list đích (overId có thể là ID của list hoặc ID của card trong list đó)
    const overList = board.lists.find(l => 
      l._id === overId || l.cards.some(c => c._id === overId)
    );

    if (!overList) return;

    const listId = overList._id;
    // Tính toán position (đơn giản hóa: đưa về cuối hoặc vị trí dựa trên index)
    const position = overList.cards.length; 

    try {
      // Gọi API cập nhật DB
      await cardService.moveCard(cardId, { listId, position, boardId });
      
      // Phát Socket cho người khác
      emitCardMove({ boardId, cardId, listId, position });
      
      // Cập nhật lại UI local
      queryClient.invalidateQueries(['board', boardId]);
    } catch (error) {
      toast.error("Không thể di chuyển thẻ!");
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full">Đang tải bảng...</div>;
  if (isError) return <div className="text-center p-10">Lỗi tải dữ liệu bảng!</div>;

  return (
    <div 
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: board?.background || '#0079bf' }}
    >
      {/* Board Header */}
      <div className="p-3 bg-black bg-opacity-20 text-white flex justify-between items-center shrink-0">
        <h1 className="text-lg font-bold">{board?.name}</h1>
        <div className="flex gap-2">
          <button className="btn btn-sm bg-white bg-opacity-20">Lọc</button>
          <button className="btn btn-sm bg-white bg-opacity-20">Thành viên</button>
        </div>
      </div>

      {/* Main Kanban Area */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start custom-scrollbar">
          {board?.lists?.map((list) => (
            <ListColumn 
              key={list._id} 
              list={list} 
              onCardClick={(id) => setSelectedCardId(id)}
              onCardAdded={() => queryClient.invalidateQueries(['board', boardId])}
            />
          ))}
          
          <button className="w-72 shrink-0 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-lg text-left font-medium transition-all">
            + Thêm danh sách khác
          </button>
        </div>

        {/* Lớp phủ khi đang kéo thẻ */}
        <DragOverlay>
          {activeCard ? (
            <div className="card shadow-2xl rotate-3 w-64 opacity-90">
              {activeCard.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal Chi tiết thẻ */}
      {selectedCardId && (
        <CardModal 
          cardId={selectedCardId} 
          boardId={boardId}
          onClose={() => setSelectedCardId(null)} 
        />
      )}
    </div>
  );
}
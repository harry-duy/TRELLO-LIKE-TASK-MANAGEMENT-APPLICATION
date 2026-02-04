import { useState } from 'react';
import cardService from '@services/cardService';

export default function ListColumn({ list, onCardAdded }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleAddCard = async () => {
    if (!title.trim()) return;
    try {
      await cardService.create({
        title: title.trim(),
        listId: list._id,
        boardId: list.board
      });
      setTitle('');
      setIsAdding(false);
      // Gọi callback để trang cha refetch lại dữ liệu
      if (onCardAdded) onCardAdded(); 
    } catch (err) {
      console.error("Lỗi tạo thẻ:", err);
    }
  };

  return (
    <div className="bg-gray-100 w-72 rounded-lg flex flex-col max-h-full">
      {/* ... Header của List ... */}
      
      {/* ... Danh sách Card ... */}

      <div className="p-2">
        {isAdding ? (
          <div>
            <textarea
              className="w-full p-2 border rounded shadow-sm mb-2"
              placeholder="Nhập tiêu đề thẻ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleAddCard} className="btn btn-primary btn-sm">Thêm thẻ</button>
              <button onClick={() => setIsAdding(false)} className="text-gray-500">Hủy</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full p-2 text-gray-600 hover:bg-gray-200 text-left rounded"
          >
            + Thêm thẻ mới
          </button>
        )}
      </div>
    </div>
  );
}
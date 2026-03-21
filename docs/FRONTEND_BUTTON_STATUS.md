# Frontend Buttons and Actions - Current Status

## Mục đích
Tài liệu này liệt kê các nút/action trong frontend hiện đang:
- chưa hoạt động,
- mới là placeholder UI,
- hoặc hoạt động một phần nhưng còn phụ thuộc backend.

Mục tiêu là để cả team nhìn nhanh và biết:
- nút nào đã dùng được thật,
- nút nào cần nối logic frontend thêm,
- nút nào đang chờ backend.

## Quy ước trạng thái
- `Hoạt động`: nút đã có logic dùng được.
- `Một phần`: có UI và có phản hồi, nhưng còn thiếu logic đầy đủ hoặc còn phụ thuộc backend.
- `Placeholder`: mới có giao diện, gần như chưa có hành vi thật.
- `Chờ backend`: frontend đã hoặc gần như sẵn sàng, nhưng API/logic backend chưa đủ.

## Danh sách hiện tại

| Khu vực | Nút / Action | Trạng thái | Hiện tại đang làm gì | Logic mong muốn |
|---|---|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | `Bảng` ở sidebar trái | Placeholder | Chỉ hiển thị active style, chưa có `onClick` thật để đổi nội dung dashboard | Khi bấm sẽ chuyển dashboard sang chế độ xem tập trung vào danh sách board hoặc section board gần đây/starred |
| `frontend/src/pages/DashboardPage.jsx` | `Gần đây` ở sidebar trái | Placeholder | Chỉ là nút giao diện, chưa điều hướng hoặc lọc dữ liệu | Khi bấm sẽ focus section board gần đây hoặc lọc dashboard theo board recent |
| `frontend/src/pages/DashboardPage.jsx` | `Bảng` trong action của workspace card | Placeholder | Chỉ hiện nút, chưa có logic | Có thể chuyển workspace card sang tab `Boards` hoặc scroll tới khu danh sách board của workspace đó |
| `frontend/src/pages/DashboardPage.jsx` | `Thành viên` trong action của workspace card | Placeholder | Chỉ hiện nút, chưa mở modal/panel | Nên mở modal danh sách thành viên workspace hoặc điều hướng tới khu quản lý thành viên |
| `frontend/src/pages/DashboardPage.jsx` | `Chỉnh sửa` trong `Cài đặt workspace` | Một phần / Chờ backend | Đã mở form sửa tên + mô tả, đã thử gọi `PUT /workspaces/:id` | Khi backend hỗ trợ đầy đủ thì sửa xong sẽ lưu thật và refresh dữ liệu ổn định |
| `frontend/src/pages/DashboardPage.jsx` | `Xoá workspace` trong `Cài đặt workspace` | Một phần / Chờ backend | Đã có confirm và thử gọi `DELETE /workspaces/:id` | Khi backend hỗ trợ đầy đủ thì xoá thật, cập nhật lại dashboard và điều hướng an toàn |
| `frontend/src/components/board/BoardMembersPanel.jsx` | `Mời` thành viên vào board | Một phần / Chờ backend | Có form nhập email/tên và UI panel | Nên mời thành viên thật vào board, validate quyền, trả lỗi rõ ràng nếu user không hợp lệ hoặc không đủ quyền |
| `frontend/src/components/board/BoardMembersPanel.jsx` | Danh sách thành viên board | Một phần | Đang hiển thị dữ liệu member có sẵn từ API/DB | Nên chỉ hiển thị đúng member thật của board hiện tại, tách rõ owner/member/invited |
| `frontend/src/components/board/BoardCanvas.jsx` | `AI Search` | Một phần / Chờ backend | UI và mutation đã có, chỉ dùng được khi backend AI + key + endpoint sẵn sàng | Tìm card theo ngôn ngữ tự nhiên, trả kết quả ổn định và có fallback khi AI không sẵn sàng |
| `frontend/src/components/ai/AIAssistantWidget.jsx` | `AI Assist` nổi toàn app | Một phần | UI widget có mở/đóng và chat request | Cần đảm bảo lấy đúng context board/workspace hiện tại và phản hồi ổn định theo quyền user |

## Các action đã hoạt động đáng chú ý
Những phần dưới đây hiện đã có logic dùng được ở frontend:
- Chuyển ngôn ngữ `VI/EN`
- Tạo workspace
- Tạo board trong workspace
- Mở workspace
- Mở board
- Đánh dấu sao board
- Kéo thả card giữa các list
- Kéo thả list để đổi vị trí
- Thêm / sửa tên / xoá list
- Thêm / sửa / xoá card
- Lọc card trong board
- Sao chép link board
- Chỉnh sửa board (tên, mô tả, màu nền)

## Ghi chú quan trọng
- Một số nút nhìn như đã có đầy đủ, nhưng thực tế mới ở mức frontend-ready. Ví dụ: `Chỉnh sửa workspace`, `Xoá workspace`, `Mời thành viên vào board`.
- Một số dữ liệu member đang có thể bị ảnh hưởng bởi việc cả nhóm dùng chung một database hoặc backend chưa lọc quyền đủ chặt.
- Với các nút đang ở trạng thái `Placeholder`, phần ưu tiên tốt nhất là quyết định rõ UX trước khi nối logic để tránh sửa giao diện nhiều lần.

## Gợi ý thứ tự làm tiếp
1. Hoàn thiện `Thành viên workspace` trên dashboard/workspace.
2. Chốt rõ logic `Bảng` và `Gần đây` ở sidebar dashboard.
3. Kiểm tra lại luồng `Mời thành viên board` với backend để xác nhận field và quyền.
4. Khi backend sẵn sàng, nối thật `Chỉnh sửa workspace` và `Xoá workspace`.

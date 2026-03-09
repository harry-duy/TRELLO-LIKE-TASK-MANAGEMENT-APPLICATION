import { useUiStore } from '../store/uiStore';

const translations = {
  vi: {
    appName: 'TaskFlow',
    workspaces: 'Workspaces',
    recent: 'Gần đây',
    starred: 'Đã đánh dấu',
    searchPlaceholder: 'Tìm kiếm bảng, thẻ, thành viên...',
    aiAssist: 'AI Assist',
    new: 'Tạo mới',
    logout: 'Đăng xuất',
    dashboard: 'Bảng làm việc',

    workspaceBoard: 'Bảng làm việc',
    filter: 'Lọc',
    members: 'Thành viên',
    addAnotherList: 'Thêm danh sách khác',
    trashHint: 'Kéo thả thẻ vào đây để xóa',
    loadingBoard: 'Đang tải bảng...',
    boardError: 'Lỗi tải dữ liệu bảng',
    listNamePlaceholder: 'Tên danh sách...',
    addList: 'Thêm danh sách',
    cancel: 'Hủy',
  },
  en: {
    appName: 'TaskFlow',
    workspaces: 'Workspaces',
    recent: 'Recent',
    starred: 'Starred',
    searchPlaceholder: 'Search boards, cards, members...',
    aiAssist: 'AI Assist',
    new: 'New',
    logout: 'Logout',
    dashboard: 'Dashboard',

    workspaceBoard: 'Workspace board',
    filter: 'Filter',
    members: 'Members',
    addAnotherList: 'Add another list',
    trashHint: 'Drag cards here to delete',
    loadingBoard: 'Loading board...',
    boardError: 'Failed to load board',
    listNamePlaceholder: 'List name...',
    addList: 'Add list',
    cancel: 'Cancel',
  },
};

export function useTranslation() {
  const language = useUiStore((state) => state.language);
  const setLanguage = useUiStore((state) => state.setLanguage);

  const t = (key) => {
    const dict = translations[language] || translations.vi;
    return dict[key] || key;
  };

  return { t, language, setLanguage };
}


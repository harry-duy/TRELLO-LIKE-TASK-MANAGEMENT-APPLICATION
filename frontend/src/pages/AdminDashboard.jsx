import { useMemo, useState } from 'react';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import adminService from '@services/adminService';
import apiClient from '@config/api';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from 'recharts';

const roles = ['user', 'staff', 'admin'];

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [search,             setSearch]             = useState('');
  const [roleFilter,         setRoleFilter]         = useState('');
  const [statusFilter,       setStatusFilter]       = useState('');
  const [workspaceSearch,    setWorkspaceSearch]    = useState('');
  const [workspaceVisibility,setWorkspaceVisibility]= useState('');
  const [boardSearch,        setBoardSearch]        = useState('');
  const [boardClosedFilter,  setBoardClosedFilter]  = useState('');
  const [activityActionFilter,setActivityActionFilter] = useState('');
  const [analyticsDays,      setAnalyticsDays]      = useState(7);

  const queryParams = useMemo(() => ({
    search: search.trim(), role: roleFilter, isActive: statusFilter, page: 1, limit: 100,
  }), [search, roleFilter, statusFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', queryParams],
    queryFn: () => adminService.getUsers(queryParams),
  });
  const { data: workspaceData, isLoading: isWorkspaceLoading } = useQuery({
    queryKey: ['admin-workspaces', workspaceSearch, workspaceVisibility],
    queryFn: () => adminService.getWorkspaces({ search: workspaceSearch.trim(), visibility: workspaceVisibility }),
  });
  const { data: boardData, isLoading: isBoardLoading } = useQuery({
    queryKey: ['admin-boards', boardSearch, boardClosedFilter],
    queryFn: () => adminService.getBoards({ search: boardSearch.trim(), isClosed: boardClosedFilter }),
  });
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminService.getSystemOverview(),
  });
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['admin-trends', analyticsDays],
    queryFn: () => adminService.getSystemTrends(analyticsDays),
  });
  const { data: workspaceAnalyticsData } = useQuery({
    queryKey: ['admin-workspace-analytics', analyticsDays],
    queryFn: async () => {
      // Lấy analytics cho tất cả workspaces (dùng workspace đầu tiên có sẵn)
      const wsRes = await apiClient.get('/admin/workspaces?limit=1');
      const workspaces = wsRes?.data || [];
      if (!workspaces.length) return null;
      const res = await apiClient.get(`/activities/analytics/${workspaces[0]._id}?days=${analyticsDays}`);
      return res?.data ?? res;
    },
  });
  const { data: aiUsageData, isLoading: isAIUsageLoading } = useQuery({
    queryKey: ['admin-ai-usage'],
    queryFn: () => adminService.getAIUsageStats(30),
  });
  const {
    data: activityData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isActivityLoading
  } = useInfiniteQuery({
    queryKey: ['admin-system-activities', activityActionFilter],
    queryFn: ({ pageParam }) => adminService.getSystemActivities({ page: pageParam, limit: 30, action: activityActionFilter }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
  const { data: resourceData, isLoading: isResourceLoading } = useQuery({
    queryKey: ['admin-system-resources'],
    queryFn: () => adminService.getSystemResources(),
  });

  const users        = data?.data || [];
  const workspaces   = workspaceData?.data || [];
  const boards       = boardData?.data || [];
  const overview     = overviewData?.data || {};
  const trend        = trendData?.data?.completionTrend || [];
  const userPerf     = workspaceAnalyticsData?.userPerformance || [];
  const aiSummary    = aiUsageData?.data?.summary || {};
  const aiByFeature  = aiUsageData?.data?.byFeature || [];
  const activities   = activityData?.pages?.flatMap(page => page.data.activities) || [];
  const resources    = resourceData?.data || {};

  const refreshUsers      = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const refreshWorkspaces = () => queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
  const refreshBoards     = () => queryClient.invalidateQueries({ queryKey: ['admin-boards'] });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminService.updateUserRole(userId, role),
    onSuccess: () => { toast.success('Đã cập nhật vai trò'); refreshUsers(); },
    onError: err => toast.error(err?.message || 'Không thể cập nhật vai trò'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => adminService.updateUserStatus(userId, isActive),
    onSuccess: () => { toast.success('Đã cập nhật trạng thái'); refreshUsers(); },
    onError: err => toast.error(err?.message || 'Không thể cập nhật trạng thái'),
  });
  const deleteMutation = useMutation({
    mutationFn: (userId) => adminService.deleteUser(userId),
    onSuccess: () => { toast.success('Đã xoá người dùng'); refreshUsers(); },
    onError: err => toast.error(err?.message || 'Không thể xoá'),
  });
  const addMemberMutation = useMutation({
    mutationFn: ({ workspaceId, payload }) => adminService.addWorkspaceMember(workspaceId, payload),
    onSuccess: () => { toast.success('Đã cập nhật thành viên workspace'); refreshWorkspaces(); },
    onError: err => toast.error(err?.message || 'Không thể thêm thành viên'),
  });
  const updateWorkspaceMemberRoleMutation = useMutation({
    mutationFn: ({ workspaceId, userId, role }) => adminService.updateWorkspaceMemberRole(workspaceId, userId, role),
    onSuccess: () => { toast.success('Đã cập nhật role workspace'); refreshWorkspaces(); },
    onError: err => toast.error(err?.message || 'Không thể cập nhật role workspace'),
  });
  const transferOwnershipMutation = useMutation({
    mutationFn: ({ workspaceId, userId }) => adminService.transferWorkspaceOwnership(workspaceId, userId),
    onSuccess: () => { toast.success('Đã chuyển ownership workspace'); refreshWorkspaces(); },
    onError: err => toast.error(err?.message || 'Không thể chuyển ownership'),
  });
  const removeMemberMutation = useMutation({
    mutationFn: ({ workspaceId, userId }) => adminService.removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => { toast.success('Đã xoá thành viên'); refreshWorkspaces(); },
    onError: err => toast.error(err?.message || 'Không thể xoá thành viên'),
  });
  const deleteWorkspaceMutation = useMutation({
    mutationFn: (workspaceId) => adminService.deleteWorkspace(workspaceId),
    onSuccess: () => { toast.success('Đã xoá workspace'); refreshWorkspaces(); refreshBoards(); },
    onError: err => toast.error(err?.message || 'Không thể xoá workspace'),
  });
  const boardStatusMutation = useMutation({
    mutationFn: ({ boardId, isClosed }) => adminService.updateBoardStatus(boardId, isClosed),
    onSuccess: () => { toast.success('Đã cập nhật board'); refreshBoards(); },
    onError: err => toast.error(err?.message || 'Không thể cập nhật board'),
  });
  const deleteBoardMutation = useMutation({
    mutationFn: (boardId) => adminService.deleteBoard(boardId),
    onSuccess: () => { toast.success('Đã xoá board'); refreshBoards(); },
    onError: err => toast.error(err?.message || 'Không thể xoá board'),
  });

  const handleDelete   = (userId, email) => {
    if (!window.confirm(`Xoá tài khoản ${email}?`)) return;
    deleteMutation.mutate(userId);
  };
  const handleAddMember = (workspaceId) => {
    const userId = window.prompt('Nhập User ID cần thêm:');
    if (!userId) return;
    const role = window.prompt('Role (admin/member/staff):', 'member') || 'member';
    addMemberMutation.mutate({ workspaceId, payload: { userId: userId.trim(), role: role.trim() } });
  };

  const handleUpdateWorkspaceMemberRole = (workspaceId, userId, currentRole) => {
    const role = window.prompt('Role mới (admin/member/staff):', currentRole || 'member');
    if (!role) return;
    updateWorkspaceMemberRoleMutation.mutate({ workspaceId, userId, role: role.trim() });
  };

  const handleTransferOwnership = (workspaceId, currentOwnerId) => {
    const userId = window.prompt('Nhập User ID member mới làm owner:', currentOwnerId || '');
    if (!userId) return;
    transferOwnershipMutation.mutate({ workspaceId, userId: userId.trim() });
  };

  const handleDeleteWorkspace = (workspaceId, name) => {
    if (!window.confirm(`Xoá workspace ${name}? Toàn bộ board bên trong cũng sẽ bị xoá.`)) return;
    deleteWorkspaceMutation.mutate(workspaceId);
  };

  const handleDeleteBoard = (boardId, name) => {
    if (!window.confirm(`Xoá board ${name}?`)) return;
    deleteBoardMutation.mutate(boardId);
  };

  // Colors for bar chart
  const BAR_COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white heading-soft">Admin Dashboard</h1>
        <p className="text-soft mt-2">Theo dõi hệ thống, quản trị người dùng, workspace và board.</p>
      </div>

      {/* ── System Overview ── */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-white">Tổng quan hệ thống</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-emerald-100/70">Khoảng thời gian:</label>
            <select className="input py-1 w-24" value={analyticsDays} onChange={e => setAnalyticsDays(Number(e.target.value))}>
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
          </div>
        </div>

        {isOverviewLoading ? (
          <div className="text-sm text-emerald-100/70">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Users',      val: overview.totalUsers,      sub: `Active: ${overview.activeUsers || 0}` },
              { label: 'Workspaces', val: overview.totalWorkspaces, sub: `Active: ${overview.activeWorkspaces || 0}` },
              { label: 'Boards',     val: overview.totalBoards,     sub: `Open: ${overview.openBoards || 0}` },
              { label: 'Cards',      val: overview.totalCards,      sub: `Completed: ${overview.completedCards || 0}` },
            ].map(c => (
              <div key={c.label} className="card bg-white/10 border border-white/10 p-3">
                <div className="text-xs text-emerald-100/70">{c.label}</div>
                <div className="text-2xl font-bold text-white mt-1">{c.val || 0}</div>
                <div className="text-xs text-emerald-100/70">{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Completion Trend Chart */}
        <div className="card bg-white/10 border border-white/10 p-4 mt-3">
          <h3 className="text-sm font-semibold text-emerald-50 mb-3">Xu hướng hoàn thành card ({analyticsDays} ngày)</h3>
          {isTrendLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải biểu đồ...</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.6)" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }} labelStyle={{ color: 'white' }} itemStyle={{ color: '#34d399' }} />
                  <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── User Performance (Completion per user) ── */}
        <div className="card bg-white/10 border border-white/10 p-4 mt-3">
          <h3 className="text-sm font-semibold text-emerald-50 mb-3">
            Cards hoàn thành theo thành viên ({analyticsDays} ngày)
          </h3>
          {userPerf.length === 0 ? (
            <p className="text-sm text-emerald-100/70 italic">Chưa có dữ liệu hoàn thành card trong khoảng thời gian này.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Bar chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userPerf.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} width={80}
                      tickFormatter={v => v?.split(' ').slice(-1)[0] || v} />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }} labelStyle={{ color: 'white' }} />
                    <Bar dataKey="count" name="Cards hoàn thành" radius={[0, 4, 4, 0]}>
                      {userPerf.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Table */}
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-xs text-emerald-100/60 font-600 uppercase">#</th>
                      <th className="text-left py-2 px-3 text-xs text-emerald-100/60 font-600 uppercase">Thành viên</th>
                      <th className="text-right py-2 px-3 text-xs text-emerald-100/60 font-600 uppercase">Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userPerf.map((u, i) => (
                      <tr key={u._id || i} className="border-t border-white/5">
                        <td className="py-2 px-3 text-emerald-100/50 text-xs">{i + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: `hsl(${(u.name || '').charCodeAt(0) * 17 % 360},60%,42%)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>
                              {(u.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white text-xs font-medium">{u.name || 'N/A'}</div>
                              {u.email && <div className="text-emerald-100/40 text-[10px]">{u.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(52,211,153,.15)', color: '#34d399', fontSize: 12, fontWeight: 700 }}>
                            {u.count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* AI Usage */}
        <div className="card bg-white/10 border border-white/10 p-4 mt-3">
          <h3 className="text-sm font-semibold text-emerald-50 mb-3">AI Usage (30 ngày)</h3>
          {isAIUsageLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total calls',  val: aiSummary.totalCalls  || 0 },
                { label: 'Success rate', val: `${aiSummary.successRate || 0}%` },
                { label: 'Failed calls', val: aiSummary.failedCalls  || 0 },
                { label: 'Total tokens', val: aiSummary.totalTokens  || 0 },
              ].map(c => (
                <div key={c.label} className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-emerald-100/70">{c.label}</div>
                  <div className="text-xl font-bold text-white">{c.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── System Activity ── */}
      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Activity toàn hệ thống</h2>
        <div className="mt-3 flex gap-3 flex-wrap">
          <select className="input w-56" value={activityActionFilter} onChange={e => setActivityActionFilter(e.target.value)}>
            <option value="">Tất cả hành động</option>
            <option value="card_created">card_created</option>
            <option value="card_completed">card_completed</option>
            <option value="board_created">board_created</option>
            <option value="workspace_created">workspace_created</option>
            <option value="attachment_added">attachment_added</option>
          </select>
        </div>
        <div 
          className="card bg-white/10 border border-white/10 overflow-auto mt-3 h-96 relative"
          onScroll={(e) => {
            const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight + 50 && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
        >
          {isActivityLoading ? (
            <div className="p-4 text-sm text-emerald-100/70">Đang tải...</div>
          ) : (
            <table className="min-w-full text-sm text-left text-emerald-50">
              <thead className="bg-white/5 text-emerald-100/80">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Board</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act, i) => (
                  <tr key={`${act._id}-${i}`} className="border-t border-white/10">
                    <td className="px-4 py-3">{new Date(act.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{act.actor?.email || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,.08)', fontSize: 11, fontFamily: 'monospace' }}>{act.action}</span>
                    </td>
                    <td className="px-4 py-3">{act.workspace?.name || '-'}</td>
                    <td className="px-4 py-3">{act.board?.name || '-'}</td>
                  </tr>
                ))}
                {activities.length === 0 && !isActivityLoading && (
                  <tr><td className="px-4 py-5 text-center text-emerald-100/70" colSpan={5}>Chưa có activity.</td></tr>
                )}
                {isFetchingNextPage && (
                  <tr><td className="px-4 py-3 text-center text-emerald-100/70" colSpan={5}>Đang tải thêm...</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── System Resources ── */}
      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Tài nguyên hệ thống</h2>
        {isResourceLoading ? (
          <div className="text-sm text-emerald-100/70 mt-3">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-sm font-semibold text-emerald-50">Upload Policy</div>
              <div className="text-xs text-emerald-100/70 mt-2">Max file size: {resources.uploadPolicy?.maxFileSizeMB || 0} MB</div>
              <div className="text-xs text-emerald-100/70 mt-1">Allowed: {(resources.uploadPolicy?.allowedExtensions || []).join(', ')}</div>
            </div>
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-sm font-semibold text-emerald-50">Cloudinary</div>
              <div className="text-xs text-emerald-100/70 mt-2">Configured: {resources.cloudinary?.configured ? '✓ Yes' : '✗ No'}</div>
              <div className="text-xs text-emerald-100/70 mt-1">Cloud: {resources.cloudinary?.cloudName || 'N/A'}</div>
              {resources.cloudinary?.error && <div className="text-xs text-red-300 mt-1">{resources.cloudinary.error}</div>}
            </div>
          </div>
        )}
      </div>

      {/* ── User Management ── */}
      <div className="pt-4 border-t border-white/10">
        <h1 className="text-2xl font-bold text-white heading-soft">Quản lý người dùng</h1>
        <p className="text-soft mt-2">Đổi role, khóa/mở tài khoản và xóa người dùng.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input" placeholder="Tìm theo tên hoặc email" />
        <select className="input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
      </div>
      <div className="card bg-white/10 border border-white/10 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-emerald-100/70">Đang tải...</div>
        ) : isError ? (
          <div className="p-4 text-sm text-red-300">Không thể tải danh sách người dùng.</div>
        ) : (
          <table className="min-w-full text-sm text-left text-emerald-50">
            <thead className="bg-white/5 text-emerald-100/80">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id} className="border-t border-white/10">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <select className="input py-1" value={user.role}
                      onChange={e => roleMutation.mutate({ userId: user._id, role: e.target.value })}
                      disabled={roleMutation.isPending}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" className="btn btn-secondary"
                        onClick={() => statusMutation.mutate({ userId: user._id, isActive: !user.isActive })}
                        disabled={statusMutation.isPending}>
                        {user.isActive ? 'Khóa' : 'Mở'}
                      </button>
                      <button type="button" className="btn bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => handleDelete(user._id, user.email)}
                        disabled={deleteMutation.isPending}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="px-4 py-5 text-center text-emerald-100/70" colSpan={5}>Không có người dùng phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Workspace Management ── */}
      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Quản lý Workspace</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input value={workspaceSearch} onChange={e => setWorkspaceSearch(e.target.value)} className="input" placeholder="Tìm workspace theo tên" />
          <select className="input" value={workspaceVisibility} onChange={e => setWorkspaceVisibility(e.target.value)}>
            <option value="">Tất cả visibility</option>
            <option value="private">private</option>
            <option value="public">public</option>
          </select>
        </div>
        <div className="mt-3 space-y-3">
          {isWorkspaceLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải...</div>
          ) : workspaces.map(ws => (
            <div key={ws._id} className="card bg-white/10 border border-white/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-emerald-50">{ws.name}</div>
                  <div className="text-xs text-emerald-100/70">Owner: {ws.owner?.email || 'N/A'} · Visibility: {ws.visibility}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => handleAddMember(ws._id)} disabled={addMemberMutation.isPending}>
                    Thêm member
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleTransferOwnership(ws._id, ws.owner?._id)} disabled={transferOwnershipMutation.isPending}>
                    Chuyển owner
                  </button>
                  <button type="button" className="btn bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDeleteWorkspace(ws._id, ws.name)} disabled={deleteWorkspaceMutation.isPending}>
                    Xóa workspace
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(ws.members || []).map(m => (
                  <div key={m._id || m.user?._id} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
                    <span>{m.user?.email || m.user}</span>
                    <button
                      type="button"
                      className="text-emerald-100/70 hover:text-white"
                      onClick={() => handleUpdateWorkspaceMemberRole(ws._id, m.user?._id || m.user, m.role)}
                      disabled={updateWorkspaceMemberRoleMutation.isPending}
                    >
                      ({m.role})
                    </button>
                    <button type="button" className="text-red-300 hover:text-red-200"
                      onClick={() => removeMemberMutation.mutate({ workspaceId: ws._id, userId: m.user?._id || m.user })}
                      disabled={removeMemberMutation.isPending}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!isWorkspaceLoading && workspaces.length === 0 && (
            <div className="text-sm text-emerald-100/70">Không có workspace phù hợp.</div>
          )}
        </div>
      </div>

      {/* ── Board Management ── */}
      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Quản lý Board</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input value={boardSearch} onChange={e => setBoardSearch(e.target.value)} className="input" placeholder="Tìm board theo tên" />
          <select className="input" value={boardClosedFilter} onChange={e => setBoardClosedFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="false">Đang mở</option>
            <option value="true">Đã đóng</option>
          </select>
        </div>
        <div className="mt-3 space-y-2">
          {isBoardLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải...</div>
          ) : boards.map(board => (
            <div key={board._id} className="card bg-white/10 border border-white/10 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-emerald-50">{board.name}</div>
                <div className="text-xs text-emerald-100/70">Workspace: {board.workspace?.name || 'N/A'} · {board.isClosed ? 'Closed' : 'Open'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-secondary"
                  onClick={() => boardStatusMutation.mutate({ boardId: board._id, isClosed: !board.isClosed })}
                  disabled={boardStatusMutation.isPending}>
                  {board.isClosed ? 'Mở lại' : 'Đóng board'}
                </button>
                <button type="button" className="btn bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => handleDeleteBoard(board._id, board.name)}
                  disabled={deleteBoardMutation.isPending}>
                  Xóa board
                </button>
              </div>
            </div>
          ))}
          {!isBoardLoading && boards.length === 0 && (
            <div className="text-sm text-emerald-100/70">Không có board phù hợp.</div>
          )}
        </div>
      </div>
    </div>
  );
}

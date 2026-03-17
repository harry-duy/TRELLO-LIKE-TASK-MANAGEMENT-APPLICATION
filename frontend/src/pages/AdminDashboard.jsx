import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import adminService from '@services/adminService';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const roles = ['user', 'staff', 'admin'];

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [workspaceVisibility, setWorkspaceVisibility] = useState('');
  const [boardSearch, setBoardSearch] = useState('');
  const [boardClosedFilter, setBoardClosedFilter] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('');
  const [logFile, setLogFile] = useState('combined.log');
  const [logLines, setLogLines] = useState(150);

  const queryParams = useMemo(
    () => ({
      search: search.trim(),
      role: roleFilter,
      isActive: statusFilter,
      page: 1,
      limit: 100,
    }),
    [search, roleFilter, statusFilter]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', queryParams],
    queryFn: () => adminService.getUsers(queryParams),
  });

  const { data: workspaceData, isLoading: isWorkspaceLoading } = useQuery({
    queryKey: ['admin-workspaces', workspaceSearch, workspaceVisibility],
    queryFn: () =>
      adminService.getWorkspaces({
        search: workspaceSearch.trim(),
        visibility: workspaceVisibility,
      }),
  });

  const { data: boardData, isLoading: isBoardLoading } = useQuery({
    queryKey: ['admin-boards', boardSearch, boardClosedFilter],
    queryFn: () =>
      adminService.getBoards({
        search: boardSearch.trim(),
        isClosed: boardClosedFilter,
      }),
  });

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminService.getSystemOverview(),
  });

  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['admin-trends'],
    queryFn: () => adminService.getSystemTrends(7),
  });

  const { data: aiUsageData, isLoading: isAIUsageLoading } = useQuery({
    queryKey: ['admin-ai-usage'],
    queryFn: () => adminService.getAIUsageStats(30),
  });

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['admin-system-activities', activityActionFilter],
    queryFn: () =>
      adminService.getSystemActivities({
        page: 1,
        limit: 20,
        action: activityActionFilter,
      }),
  });

  const { data: resourceData, isLoading: isResourceLoading } = useQuery({
    queryKey: ['admin-system-resources'],
    queryFn: () => adminService.getSystemResources(),
  });

  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['admin-system-logs', logFile, logLines],
    queryFn: () => adminService.getSystemLogs({ file: logFile, lines: logLines }),
  });

  const users = data?.data || [];
  const workspaces = workspaceData?.data || [];
  const boards = boardData?.data || [];
  const overview = overviewData?.data || {};
  const trend = trendData?.data?.completionTrend || [];
  const aiUsageSummary = aiUsageData?.data?.summary || {};
  const aiUsageByFeature = aiUsageData?.data?.byFeature || [];
  const aiUsageByUser = aiUsageData?.data?.byUser || [];
  const activities = activityData?.data?.activities || [];
  const resources = resourceData?.data || {};
  const logs = logsData?.data?.lines || [];

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const refreshWorkspaces = () => queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
  const refreshBoards = () => queryClient.invalidateQueries({ queryKey: ['admin-boards'] });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminService.updateUserRole(userId, role),
    onSuccess: () => {
      toast.success('Cập nhật vai trò thành công');
      refreshUsers();
    },
    onError: (error) => toast.error(error?.message || 'Không thể cập nhật vai trò'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => adminService.updateUserStatus(userId, isActive),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công');
      refreshUsers();
    },
    onError: (error) => toast.error(error?.message || 'Không thể cập nhật trạng thái'),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => adminService.deleteUser(userId),
    onSuccess: () => {
      toast.success('Xóa người dùng thành công');
      refreshUsers();
    },
    onError: (error) => toast.error(error?.message || 'Không thể xóa người dùng'),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ workspaceId, payload }) => adminService.addWorkspaceMember(workspaceId, payload),
    onSuccess: () => {
      toast.success('Cập nhật thành viên workspace thành công');
      refreshWorkspaces();
    },
    onError: (error) => toast.error(error?.message || 'Không thể thêm/cập nhật thành viên'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ workspaceId, userId }) => adminService.removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      toast.success('Xóa thành viên khỏi workspace thành công');
      refreshWorkspaces();
    },
    onError: (error) => toast.error(error?.message || 'Không thể xóa thành viên'),
  });

  const boardStatusMutation = useMutation({
    mutationFn: ({ boardId, isClosed }) => adminService.updateBoardStatus(boardId, isClosed),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái board thành công');
      refreshBoards();
    },
    onError: (error) => toast.error(error?.message || 'Không thể cập nhật board'),
  });

  const handleDelete = (userId, email) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa tài khoản ${email}?`);
    if (!confirmed) return;
    deleteMutation.mutate(userId);
  };

  const handleAddMember = (workspaceId) => {
    const userId = window.prompt('Nhập User ID cần thêm vào workspace:');
    if (!userId) return;

    const role = window.prompt('Nhập role trong workspace (admin/member):', 'member') || 'member';
    addMemberMutation.mutate({ workspaceId, payload: { userId: userId.trim(), role: role.trim() } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white heading-soft">Admin Dashboard</h1>
        <p className="text-soft mt-2">Theo dõi hệ thống, quản trị người dùng, workspace và board.</p>
      </div>

      <div className="pt-2 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Tổng quan hệ thống</h2>
        {isOverviewLoading ? (
          <div className="text-sm text-emerald-100/70 mt-3">Đang tải số liệu tổng quan...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-xs text-emerald-100/70">Users</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.totalUsers || 0}</div>
              <div className="text-xs text-emerald-100/70">Active: {overview.activeUsers || 0}</div>
            </div>
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-xs text-emerald-100/70">Workspaces</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.totalWorkspaces || 0}</div>
              <div className="text-xs text-emerald-100/70">Active: {overview.activeWorkspaces || 0}</div>
            </div>
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-xs text-emerald-100/70">Boards</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.totalBoards || 0}</div>
              <div className="text-xs text-emerald-100/70">Open: {overview.openBoards || 0}</div>
            </div>
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-xs text-emerald-100/70">Cards</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.totalCards || 0}</div>
              <div className="text-xs text-emerald-100/70">Completed: {overview.completedCards || 0}</div>
            </div>
          </div>
        )}

        <div className="card bg-white/10 border border-white/10 p-4 mt-3">
          <h3 className="text-sm font-semibold text-emerald-50 mb-3">Xu hướng hoàn thành card (7 ngày)</h3>
          {isTrendLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải biểu đồ...</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card bg-white/10 border border-white/10 p-4 mt-3">
          <h3 className="text-sm font-semibold text-emerald-50 mb-3">AI Usage (30 ngày)</h3>
          {isAIUsageLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải thống kê AI...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-emerald-100/70">Total calls</div>
                  <div className="text-xl font-bold text-white">{aiUsageSummary.totalCalls || 0}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-emerald-100/70">Success rate</div>
                  <div className="text-xl font-bold text-white">{aiUsageSummary.successRate || 0}%</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-emerald-100/70">Failed calls</div>
                  <div className="text-xl font-bold text-white">{aiUsageSummary.failedCalls || 0}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-emerald-100/70">Total tokens</div>
                  <div className="text-xl font-bold text-white">{aiUsageSummary.totalTokens || 0}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm font-semibold text-emerald-50 mb-2">Theo tính năng</div>
                  <div className="space-y-2">
                    {aiUsageByFeature.map((item) => (
                      <div key={item._id} className="flex items-center justify-between text-xs text-emerald-100/80">
                        <span>{item._id}</span>
                        <span>{item.count} calls</span>
                      </div>
                    ))}
                    {aiUsageByFeature.length === 0 && (
                      <div className="text-xs text-emerald-100/70">Chưa có dữ liệu.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm font-semibold text-emerald-50 mb-2">Top người dùng AI</div>
                  <div className="space-y-2">
                    {aiUsageByUser.map((item) => (
                      <div key={item.userId} className="flex items-center justify-between text-xs text-emerald-100/80">
                        <span>{item.email || item.name || 'N/A'}</span>
                        <span>{item.calls} calls</span>
                      </div>
                    ))}
                    {aiUsageByUser.length === 0 && (
                      <div className="text-xs text-emerald-100/70">Chưa có dữ liệu.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Activity toàn hệ thống</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <select
            className="input"
            value={activityActionFilter}
            onChange={(e) => setActivityActionFilter(e.target.value)}
          >
            <option value="">Tất cả hành động</option>
            <option value="card_created">card_created</option>
            <option value="card_completed">card_completed</option>
            <option value="board_created">board_created</option>
            <option value="workspace_created">workspace_created</option>
            <option value="workspace_member_added">workspace_member_added</option>
          </select>
        </div>

        <div className="card bg-white/10 border border-white/10 overflow-auto mt-3">
          {isActivityLoading ? (
            <div className="p-4 text-sm text-emerald-100/70">Đang tải activity...</div>
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
                {activities.map((activity) => (
                  <tr key={activity._id} className="border-t border-white/10">
                    <td className="px-4 py-3">{new Date(activity.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{activity.actor?.email || 'N/A'}</td>
                    <td className="px-4 py-3">{activity.action}</td>
                    <td className="px-4 py-3">{activity.workspace?.name || '-'}</td>
                    <td className="px-4 py-3">{activity.board?.name || '-'}</td>
                  </tr>
                ))}
                {activities.length === 0 && (
                  <tr>
                    <td className="px-4 py-5 text-center text-emerald-100/70" colSpan={5}>
                      Chưa có activity phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Tài nguyên hệ thống</h2>
        {isResourceLoading ? (
          <div className="text-sm text-emerald-100/70 mt-3">Đang tải tài nguyên hệ thống...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-sm font-semibold text-emerald-50">Upload Policy</div>
              <div className="text-xs text-emerald-100/70 mt-2">
                Max file size: {resources.uploadPolicy?.maxFileSizeMB || 0} MB
              </div>
              <div className="text-xs text-emerald-100/70 mt-1">
                Allowed: {(resources.uploadPolicy?.allowedExtensions || []).join(', ')}
              </div>
            </div>

            <div className="card bg-white/10 border border-white/10 p-3">
              <div className="text-sm font-semibold text-emerald-50">Cloudinary</div>
              <div className="text-xs text-emerald-100/70 mt-2">
                Configured: {resources.cloudinary?.configured ? 'Yes' : 'No'}
              </div>
              <div className="text-xs text-emerald-100/70 mt-1">
                Cloud: {resources.cloudinary?.cloudName || 'N/A'}
              </div>
              {resources.cloudinary?.usage && (
                <div className="text-xs text-emerald-100/70 mt-1">
                  Objects: {resources.cloudinary.usage.objects?.usage || 0} / {resources.cloudinary.usage.objects?.limit || '∞'}
                </div>
              )}
              {resources.cloudinary?.error && (
                <div className="text-xs text-red-300 mt-1">{resources.cloudinary.error}</div>
              )}
            </div>
          </div>
        )}

        <div className="card bg-white/10 border border-white/10 p-3 mt-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <h3 className="text-sm font-semibold text-emerald-50">System Logs</h3>
            <div className="flex gap-2">
              <select className="input py-1" value={logFile} onChange={(e) => setLogFile(e.target.value)}>
                <option value="combined.log">combined.log</option>
                <option value="error.log">error.log</option>
                <option value="exceptions.log">exceptions.log</option>
                <option value="rejections.log">rejections.log</option>
              </select>
              <input
                type="number"
                min={20}
                max={500}
                value={logLines}
                onChange={(e) => setLogLines(Number(e.target.value) || 150)}
                className="input py-1 w-28"
              />
            </div>
          </div>

          {isLogsLoading ? (
            <div className="text-sm text-emerald-100/70 mt-3">Đang tải logs...</div>
          ) : (
            <pre className="mt-3 max-h-72 overflow-auto rounded bg-black/40 p-3 text-xs text-emerald-100 whitespace-pre-wrap">
              {logs.length > 0 ? logs.join('\n') : 'No log lines returned.'}
            </pre>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white heading-soft">Quản lý người dùng</h1>
        <p className="text-soft mt-2">Admin có thể đổi role, khóa/mở tài khoản và xóa người dùng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          placeholder="Tìm theo tên hoặc email"
        />

        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="user">user</option>
          <option value="staff">staff</option>
          <option value="admin">admin</option>
        </select>

        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
      </div>

      <div className="card bg-white/10 border border-white/10 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-emerald-100/70">Đang tải danh sách người dùng...</div>
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
              {users.map((user) => (
                <tr key={user._id} className="border-t border-white/10">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input py-1"
                      value={user.role}
                      onChange={(e) =>
                        roleMutation.mutate({ userId: user._id, role: e.target.value })
                      }
                      disabled={roleMutation.isPending}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.isActive
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-red-500/20 text-red-200'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          statusMutation.mutate({ userId: user._id, isActive: !user.isActive })
                        }
                        disabled={statusMutation.isPending}
                      >
                        {user.isActive ? 'Khóa' : 'Mở'}
                      </button>
                      <button
                        type="button"
                        className="btn bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => handleDelete(user._id, user.email)}
                        disabled={deleteMutation.isPending}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-4 py-5 text-center text-emerald-100/70" colSpan={5}>
                    Không có người dùng phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Quản lý Workspace (Super Access)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input
            value={workspaceSearch}
            onChange={(e) => setWorkspaceSearch(e.target.value)}
            className="input"
            placeholder="Tìm workspace theo tên"
          />
          <select
            className="input"
            value={workspaceVisibility}
            onChange={(e) => setWorkspaceVisibility(e.target.value)}
          >
            <option value="">Tất cả visibility</option>
            <option value="private">private</option>
            <option value="public">public</option>
          </select>
        </div>

        <div className="mt-3 space-y-3">
          {isWorkspaceLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải workspace...</div>
          ) : (
            workspaces.map((workspace) => (
              <div key={workspace._id} className="card bg-white/10 border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-emerald-50">{workspace.name}</div>
                    <div className="text-xs text-emerald-100/70">
                      Owner: {workspace.owner?.email || 'N/A'} • Visibility: {workspace.visibility}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleAddMember(workspace._id)}
                    disabled={addMemberMutation.isPending}
                  >
                    Thêm member
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(workspace.members || []).map((member) => (
                    <div
                      key={member._id || member.user?._id}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs"
                    >
                      <span>{member.user?.email || member.user}</span>
                      <span className="text-emerald-100/70">({member.role})</span>
                      <button
                        type="button"
                        className="text-red-300 hover:text-red-200"
                        onClick={() =>
                          removeMemberMutation.mutate({
                            workspaceId: workspace._id,
                            userId: member.user?._id || member.user,
                          })
                        }
                        disabled={removeMemberMutation.isPending}
                        title="Xóa member"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {!isWorkspaceLoading && workspaces.length === 0 && (
            <div className="text-sm text-emerald-100/70">Không có workspace phù hợp.</div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h2 className="text-xl font-semibold text-white">Quản lý Board (Đóng/Mở)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            className="input"
            placeholder="Tìm board theo tên"
          />
          <select
            className="input"
            value={boardClosedFilter}
            onChange={(e) => setBoardClosedFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="false">Đang mở</option>
            <option value="true">Đã đóng</option>
          </select>
        </div>

        <div className="mt-3 space-y-2">
          {isBoardLoading ? (
            <div className="text-sm text-emerald-100/70">Đang tải board...</div>
          ) : (
            boards.map((board) => (
              <div
                key={board._id}
                className="card bg-white/10 border border-white/10 p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-emerald-50">{board.name}</div>
                  <div className="text-xs text-emerald-100/70">
                    Workspace: {board.workspace?.name || 'N/A'} • Trạng thái: {board.isClosed ? 'Closed' : 'Open'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    boardStatusMutation.mutate({ boardId: board._id, isClosed: !board.isClosed })
                  }
                  disabled={boardStatusMutation.isPending}
                >
                  {board.isClosed ? 'Mở lại' : 'Đóng board'}
                </button>
              </div>
            ))
          )}
          {!isBoardLoading && boards.length === 0 && (
            <div className="text-sm text-emerald-100/70">Không có board phù hợp.</div>
          )}
        </div>
      </div>
    </div>
  );
}
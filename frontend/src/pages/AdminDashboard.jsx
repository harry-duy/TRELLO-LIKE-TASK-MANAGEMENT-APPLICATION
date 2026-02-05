// frontend/src/pages/AdminDashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import apiClient from '@config/api';

export default function AdminDashboard() {
  const { workspaceId } = useParams();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(`/activities/analytics/${workspaceId}`);
      return res.data;
    }
  });

  if (isLoading) return <div>Đang tải thống kê...</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Thống kê năng suất công việc</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Biểu đồ xu hướng hoàn thành thẻ */}
        <div className="card p-4 bg-white shadow rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Số thẻ hoàn thành (7 ngày qua)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ so sánh giữa các thành viên */}
        <div className="card p-4 bg-white shadow rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Hiệu suất thành viên</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.userPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
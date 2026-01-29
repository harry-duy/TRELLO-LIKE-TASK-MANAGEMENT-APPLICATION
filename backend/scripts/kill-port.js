/**
 * Giải phóng port (Windows: netstat + taskkill).
 * Chạy: node scripts/kill-port.js 5001
 */
const { execSync } = require('child_process');
const port = process.argv[2] || '5001';

try {
  if (process.platform === 'win32') {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = out.trim().split('\n').filter((l) => l.includes('LISTENING'));
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
        console.log(`[kill-port] Đã tắt process ${pid} (port ${port}).`);
      } catch (_) {}
    }
    if (pids.size === 0) {
      // Không có process nào đang listen port này
    }
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' });
    console.log(`[kill-port] Đã thử giải phóng port ${port}.`);
  }
} catch (e) {
  // Không tìm thấy process hoặc lỗi → bỏ qua
}

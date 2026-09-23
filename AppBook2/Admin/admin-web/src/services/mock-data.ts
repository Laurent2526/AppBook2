import { Book, User, Withdrawal } from '@/types/admin';

export const books: Book[] = [
  { id: 'BK-1024', title: 'Mùa Hạ Không Tên', author: 'Linh Chi', category: 'Tâm lý', status: 'Pending', reads: 12480, revenue: 18600000, updatedAt: '12 phút trước', cover: 'linear-gradient(145deg, #f4a261, #e76f51)' },
  { id: 'BK-1021', title: 'Kẻ Đứng Sau Cánh Cửa', author: 'Đỗ Minh', category: 'Trinh thám', status: 'Published', reads: 82760, revenue: 42350000, updatedAt: 'Hôm qua', cover: 'linear-gradient(145deg, #264653, #2a9d8f)' },
  { id: 'BK-1018', title: 'Thành Phố Sau Mưa', author: 'An Nhiên', category: 'Tiểu thuyết', status: 'Pending Delete', reads: 45120, revenue: 12780000, updatedAt: '2 ngày trước', cover: 'linear-gradient(145deg, #457b9d, #1d3557)' },
  { id: 'BK-1014', title: 'Bếp Nhỏ Có Nắng', author: 'Mai Anh', category: 'Đời sống', status: 'Rejected', reads: 3200, revenue: 0, updatedAt: '3 ngày trước', cover: 'linear-gradient(145deg, #e9c46a, #f4a261)' },
  { id: 'BK-1008', title: 'Những Vì Sao Lạc', author: 'Hoàng Nam', category: 'Khoa học viễn tưởng', status: 'Published', reads: 113400, revenue: 65800000, updatedAt: '5 ngày trước', cover: 'linear-gradient(145deg, #3a0ca3, #4361ee)' },
];

export const users: User[] = [
  { id: 'US-8831', name: 'Nguyễn Minh Anh', email: 'minhanh@email.com', role: 'Author', status: 'Active', joinedAt: '18/09/2026', avatar: 'MA' },
  { id: 'US-8828', name: 'Trần Hoàng Long', email: 'long.tran@email.com', role: 'Reader', status: 'Active', joinedAt: '17/09/2026', avatar: 'TL' },
  { id: 'US-8819', name: 'Lê Thu Hà', email: 'thuha@email.com', role: 'Author', status: 'Locked', joinedAt: '16/09/2026', avatar: 'TH' },
  { id: 'US-8802', name: 'Phạm Quốc Bảo', email: 'quocbao@email.com', role: 'Reader', status: 'Pending', joinedAt: '15/09/2026', avatar: 'PB' },
];

export const withdrawals: Withdrawal[] = [
  { id: 'WD-2048', author: 'Linh Chi', amount: 4500000, method: 'Vietcombank •••• 2841', requestedAt: 'Hôm nay, 09:42', status: 'Pending' },
  { id: 'WD-2047', author: 'Đỗ Minh', amount: 8200000, method: 'Momo • 0912 34 56 78', requestedAt: 'Hôm nay, 08:17', status: 'Pending' },
  { id: 'WD-2044', author: 'Hoàng Nam', amount: 12500000, method: 'ACB •••• 1190', requestedAt: 'Hôm qua', status: 'Processed' },
];

export const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

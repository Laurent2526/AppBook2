export type ContentStatus = 'Pending' | 'Published' | 'Rejected' | 'Hidden' | 'Pending Delete';
export type UserStatus = 'Active' | 'Locked' | 'Pending';

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  status: ContentStatus;
  reads: number;
  revenue: number;
  updatedAt: string;
  cover: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Reader' | 'Author' | 'Admin';
  status: UserStatus;
  joinedAt: string;
  avatar: string;
};

export type Withdrawal = {
  id: string;
  author: string;
  amount: number;
  method: string;
  requestedAt: string;
  status: 'Pending' | 'Processed' | 'Rejected';
};

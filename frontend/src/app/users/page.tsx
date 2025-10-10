"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { User } from 'types';

export default function UsersPage() {
  const { data, isLoading, error } = useQuery<{ items: User[] }>({
    queryKey: ['users'],
    queryFn: () => apiGet<{ items: User[] }>(endpoints.users.list()),
  });

  const users = data?.items ?? [];

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      <h1>Danh sách người dùng</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {users.map((user) => (
          <div key={user.id} style={{ border: '1px solid #ccc', padding: 16, width: 300 }}>
            <div>Tên: {user.name}</div>
            <div>Email: {user.email}</div>
            <div>Vai trò: {user.role ?? ''}</div>
            <div>Trạng thái: {user.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</div>
            {user.phone && <div>Điện thoại: {user.phone}</div>}
            {user.avatarUrl && <img src={user.avatarUrl} alt={user.name} style={{ width: 80, borderRadius: 40 }} />}
            <a href={`/users/${user.id}`}>Chi tiết</a>
          </div>
        ))}
      </div>
    </div>
  );
}

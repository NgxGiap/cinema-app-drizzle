"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { Cinema } from 'types';

export default function CinemasPage() {
  const { data, isLoading, error } = useQuery<{ items: Cinema[] }>({
    queryKey: ['cinemas'],
    queryFn: () => apiGet<{ items: Cinema[] }>(endpoints.cinemas.list()),
  });

  const cinemas = data?.items ?? [];

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      <h1>Danh sách rạp</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {cinemas.map((cinema) => (
          <div key={cinema.id} style={{ border: '1px solid #ccc', padding: 16, width: 300 }}>
            <h2>{cinema.name}</h2>
            <div>Địa chỉ: {cinema.address}</div>
            <div>Thành phố: {cinema.city}</div>
            {cinema.phone && <div>Điện thoại: {cinema.phone}</div>}
            {cinema.email && <div>Email: {cinema.email}</div>}
            <div>Trạng thái: {cinema.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</div>
            <div>Số phòng: {cinema.roomsCount ?? ''}</div>
            <a href={`/cinemas/${cinema.id}`}>Chi tiết</a>
          </div>
        ))}
      </div>
    </div>
  );
}

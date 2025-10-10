"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { Cinema } from 'types';

export default function CinemaDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useQuery<Cinema>({
    queryKey: ['cinema', params.id],
    queryFn: () => apiGet<Cinema>(endpoints.cinemas.detail(params.id)),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error || !data) return <div>Error: {(error as Error)?.message ?? 'Không tìm thấy rạp'}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <div>Địa chỉ: {data.address}</div>
      <div>Thành phố: {data.city}</div>
      {data.phone && <div>Điện thoại: {data.phone}</div>}
      {data.email && <div>Email: {data.email}</div>}
      <div>Trạng thái: {data.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</div>
      <div>Số phòng: {data.roomsCount ?? ''}</div>
      {data.rooms && (
        <div>
          <h2>Danh sách phòng</h2>
          <ul>
            {data.rooms.map((room) => (
              <li key={room.id}>{room.name} {room.capacity ? `(Sức chứa: ${room.capacity})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

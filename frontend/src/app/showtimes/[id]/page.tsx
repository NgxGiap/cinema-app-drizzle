"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { Showtime } from 'types';

export default function ShowtimeDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useQuery<Showtime>({
    queryKey: ['showtime', params.id],
    queryFn: () => apiGet<Showtime>(endpoints.showtimes.detail(params.id)),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error || !data) return <div>Error: {(error as Error)?.message ?? 'Không tìm thấy lịch chiếu'}</div>;

  return (
    <div>
      <h1>Chi tiết lịch chiếu</h1>
      <div>Phim: {data.movie?.title || data.movieId}</div>
      <div>Rạp: {data.cinema?.name || data.cinemaId}</div>
      <div>Phòng: {data.room?.name || data.roomId}</div>
      <div>Bắt đầu: {data.startsAt ? new Date(data.startsAt).toLocaleString() : (data.startAt ? new Date(data.startAt).toLocaleString() : '')}</div>
      <div>Định dạng: {data.format || ''}</div>
      <div>Giá vé: {data.price || data.basePrice || ''}</div>
      <div>Số ghế: {data.totalSeats ?? ''} | Đã đặt: {data.bookedSeats ?? ''} | Còn trống: {data.availableSeats ?? ''}</div>
      <div>Trạng thái: {data.isActive ? 'Đang chiếu' : 'Ngừng chiếu'}</div>
      <a href={`/booking/${data.id}`}>Đặt vé</a>
    </div>
  );
}

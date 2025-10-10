"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { Booking } from 'types';

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useQuery<Booking>({
    queryKey: ['booking', params.id],
    queryFn: () => apiGet<Booking>(endpoints.bookings.detail(params.id)),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error || !data) return <div>Error: {(error as Error)?.message ?? 'Không tìm thấy booking'}</div>;

  return (
    <div>
      <h1>Chi tiết booking</h1>
      <div>Mã booking: {data.bookingNumber ?? data.id}</div>
      <div>Trạng thái: {data.status}</div>
      <div>Thanh toán: {data.paymentStatus ?? ''}</div>
      <div>Số tiền: {data.totalAmount} {data.currency ?? ''}</div>
      <div>Hết hạn giữ ghế: {data.expiresAt ? new Date(data.expiresAt).toLocaleString() : ''}</div>
      <div>Ngày tạo: {data.createdAt ? new Date(data.createdAt).toLocaleString() : ''}</div>
    </div>
  );
}

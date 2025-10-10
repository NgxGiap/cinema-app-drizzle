"use client";
import { useAuthStore } from 'store/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { Booking, Ticket } from 'types';

export default function TicketsPage() {
  const { token } = useAuthStore();
  const { data: bookingsData, isLoading } = useQuery<{ items: Booking[] }>({
    queryKey: ['bookings'],
    queryFn: () => apiGet<{ items: Booking[] }>(endpoints.bookings.mine(), token ?? undefined),
  });
  const bookings = bookingsData?.items ?? [];

  const { data: ticketsData, isLoading: loadingTickets } = useQuery<{ items: Ticket[] }>({
    queryKey: ['tickets', bookings.map((b) => b.id)],
    queryFn: async () => {
      if (!bookings.length) return { items: [] };
      const allTickets: Ticket[] = [];
      for (const booking of bookings) {
        const t = await apiGet<{ items: Ticket[] }>(endpoints.tickets.byBooking(booking.id), token ?? undefined);
        allTickets.push(...(t.items ?? []));
      }
      return { items: allTickets };
    },
    enabled: !!bookings.length,
  });
  const tickets = ticketsData?.items ?? [];

  if (isLoading || loadingTickets) return <div>Loading...</div>;

  return (
    <div>
      <h1>Vé của tôi</h1>
      {tickets.map((ticket) => (
        <div key={ticket.id} style={{ border: '1px solid #ccc', margin: 8, padding: 8 }}>
          <div>Phim: {ticket.movieTitle}</div>
          <div>Rạp: {ticket.cinemaName}</div>
          <div>Ghế: {ticket.seatLabels?.join(', ') || ticket.seatNumber || ''}</div>
          <div>Hàng: {ticket.row ?? ''} | Cột: {ticket.column ?? ''}</div>
          <div>Thời gian: {ticket.startAt}</div>
          <div>Status: {ticket.status}</div>
          {ticket.checkedInAt && <div>Check-in: {new Date(ticket.checkedInAt).toLocaleString()}</div>}
          {ticket.checkedInGate && <div>Cổng: {ticket.checkedInGate}</div>}
          <img src={`data:image/png;base64,${ticket.qrData}`} alt="QR" />
        </div>
      ))}
    </div>
  );
}

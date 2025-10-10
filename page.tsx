// "use client";
// import { useEffect, useState } from 'react';
// import RouteGuard from 'app/providers/RouteGuard';
// import { useBookingStore } from 'store/bookingStore';
// import { useShowtime, useSeatMap, useHoldSeats, useCancelBooking } from 'api/hooks';
// import { useRouter } from 'next/navigation';
// import type { Booking } from 'types';

// export default function BookingPage({ params }: { params: { showtimeId: string } }) {
//   return (
//     <RouteGuard>
//       <BookingPageInner showtimeId={params.showtimeId} />
//     </RouteGuard>
//   );
// }

// function BookingPageInner({ showtimeId }: { showtimeId: string }) {
//   const router = useRouter();
//   const bookingStore = useBookingStore();
//   const { roomId, selectedSeatIds, combos, bookingId, expiresAt } = bookingStore;
//   const [countdown, setCountdown] = useState<number>(0);

//   // Lấy roomId nếu chưa có
//   useEffect(() => {
//     if (!roomId) {
//       const { data: showtime } = useShowtime(showtimeId);
//       if (showtime?.roomId) bookingStore.setContext({ movieId: showtime.movieId, cinemaId: showtime.cinemaId, roomId: showtime.roomId, showtimeId });
//     }
//   }, [roomId, showtimeId, bookingStore]);

//   const { data: seatMapData, isLoading } = useSeatMap(roomId ?? '', showtimeId);
//   const seatMap = seatMapData?.items ?? [];
//   const holdMutation = useHoldSeats();
//   const cancelMutation = useCancelBooking();

//   // Countdown TTL
//   useEffect(() => {
//     if (expiresAt) {
//       const ttl = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
//       setCountdown(ttl);
//       if (ttl > 0) {
//         const timer = setInterval(() => {
//           const newTtl = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
//           setCountdown(newTtl);
//         }, 1000);
//         return () => clearInterval(timer);
//       }
//     }
//   }, [expiresAt]);

//   // On hold success
//   useEffect(() => {
//     const booking = holdMutation.data as Booking | undefined;
//     if (booking) {
//       bookingStore.setHold({
//         bookingId: booking.id,
//         expiresAt: booking.expiresAt ?? booking.createdAt,
//         amount: String(booking.totalAmount ?? ''),
//       });
//       router.push('/checkout');
//     }
//   }, [holdMutation.data, bookingStore, router]);

//   if (isLoading) return <div>Loading seat map...</div>;

//   return (
//     <div>
//       <h1>Chọn ghế</h1>
//       <div>
//         {seatMap.map((seat) => (
//           <button
//             key={seat.id}
//             disabled={seat.status !== 'available'}
//             style={{ margin: 4, background: selectedSeatIds.includes(seat.id) ? 'green' : 'white' }}
//             onClick={() => bookingStore.toggleSeat(seat.id)}
//           >
//             {seat.seatNumber}
//           </button>
//         ))}
//       </div>
//       <button
//         onClick={() => holdMutation.mutate({ showtimeId, seatIds: selectedSeatIds, combos })}
//         disabled={selectedSeatIds.length === 0 || holdMutation.isLoading || countdown === 0}
//       >
//         Giữ ghế
//       </button>
//       {bookingId && (
//         <button
//           onClick={() => {
//             cancelMutation.mutate(bookingId, {
//               onSuccess: () => {
//                 bookingStore.reset();
//                 router.back();
//               },
//             });
//           }}
//           disabled={cancelMutation.isLoading}
//         >
//           Huỷ giữ ghế
//         </button>
//       )}
//       {expiresAt && (
//         <div>
//           <strong>Countdown: {countdown}s</strong>
//           {countdown === 0 && <div>Đã hết thời gian giữ ghế, vui lòng giữ lại!</div>}
//         </div>
//       )}
//     </div>
//   );
// }
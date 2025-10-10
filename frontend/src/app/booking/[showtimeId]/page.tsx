"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from 'store/authStore';
import { useBookingStore } from 'store/bookingStore';
import { useSeatMap, useHoldSeats, useCancelBooking } from 'api/hooks';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import type { Booking, Showtime } from 'types';

export default function BookingPage({ params }: { params: { showtimeId: string } }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const bookingStore = useBookingStore();
  const { roomId, selectedSeatIds, combos, bookingId, expiresAt } = bookingStore;
  const [sessionId] = useState(() => crypto.randomUUID());
  const [countdown, setCountdown] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [loadingShowtime, setLoadingShowtime] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Log để debug
  useEffect(() => {
    console.log('🔑 User token:', token);
    console.log('📦 Selected seats:', selectedSeatIds);
  }, [token, selectedSeatIds]);

  // Wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Fetch showtime detail nếu chưa có roomId
  useEffect(() => {
    if (!mounted || !token || roomId || loadingShowtime) return;

    setLoadingShowtime(true);
    setError(null);

    (async () => {
      try {
        const response = await apiGet<{ items: Showtime[] }>(
          endpoints.showtimes.list(),
          token
        );

        const showtime = response.items?.find(st => st.id === params.showtimeId);
        
        if (showtime) {
          const roomIdValue = showtime.roomId || showtime.room?.id;
          if (roomIdValue) {
            bookingStore.setContext({
              movieId: showtime.movieId,
              cinemaId: showtime.cinemaId,
              roomId: roomIdValue,
              showtimeId: params.showtimeId,
            });
          } else {
            setError('Suất chiếu này chưa có thông tin phòng chiếu');
          }
        } else {
          setError('Không tìm thấy suất chiếu');
        }
      } catch (err) {
        console.error('Failed to fetch showtime:', err);
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin suất chiếu');
      } finally {
        setLoadingShowtime(false);
      }
    })();
  }, [mounted, token, roomId, params.showtimeId, bookingStore, loadingShowtime]);

  // Fetch seat map
  const { data: seatMapData, isLoading: loadingSeatMap, error: seatMapError } = useSeatMap(
    roomId ?? '',
    params.showtimeId,
    token ?? undefined
  );
  const seatMap = seatMapData ?? [];

  const holdMutation = useHoldSeats(token ?? undefined);
  const cancelMutation = useCancelBooking(token ?? undefined);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const calculateTTL = () => 
      Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

    setCountdown(calculateTTL());

    const timer = setInterval(() => {
      const newTtl = calculateTTL();
      setCountdown(newTtl);
      if (newTtl === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Handle hold success
  useEffect(() => {
    const booking = holdMutation.data as Booking | undefined;
    if (!booking || !holdMutation.isSuccess) return; // ✅ Thêm check isSuccess

    // ✅ Chỉ chạy 1 lần khi hold thành công
    console.log('✅ Hold successful, booking:', booking);
    
    bookingStore.setHold({
      bookingId: booking.id,
      expiresAt: booking.expiresAt ?? booking.createdAt,
      amount: String(booking.totalAmount ?? ''),
    });
    
    router.push('/checkout');
  }, [holdMutation.isSuccess, holdMutation.data]); // ✅ Đổi dependency


  const handleHoldSeats = () => {
    console.log('🎯 Hold seats clicked:', { selectedSeatIds, count: selectedSeatIds.length });
    
    if (selectedSeatIds.length === 0) {
      alert('Vui lòng chọn ghế');
      return;
    }
    
    holdMutation.mutate(
      {
        showtimeId: params.showtimeId,
        seatIds: selectedSeatIds,
        sessionId,
        combos: combos.length > 0 ? combos : undefined,
      },
      {
        onSuccess: (data: unknown) => {
          const booking = data as Booking;
          console.log('✅ Hold successful:', booking);
          
          bookingStore.setHold({
            bookingId: booking.id,
            expiresAt: booking.expiresAt ?? booking.createdAt,
            amount: String(booking.totalAmount ?? ''),
          });
          
          console.log('🚀 Navigating to checkout...');
          router.push('/checkout');
        },
        onError: (error) => {
          console.error('❌ Hold failed:', error);
        },
      }
    );
  };

  const handleCancel = () => {
    if (!bookingId) return;
    cancelMutation.mutate(bookingId, {
      onSuccess: () => {
        bookingStore.reset();
        router.push('/showtimes');
      },
    });
  };

  // Not mounted yet
  if (!mounted) {
    return null;
  }

  // Not logged in
  if (!token) {
    router.push(`/auth/login?next=${encodeURIComponent(`/booking/${params.showtimeId}`)}`);
    return null;
  }

  // Loading showtime
  if (loadingShowtime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Đang tải thông tin suất chiếu...</p>
        </div>
      </div>
    );
  }

  // Error loading showtime
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-red-50 p-6 rounded-lg max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/showtimes')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quay về Lịch chiếu
          </button>
        </div>
      </div>
    );
  }

  // No roomId yet
  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Đang tải thông tin phòng chiếu...</p>
        </div>
      </div>
    );
  }

  // Loading seat map
  if (loadingSeatMap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Đang tải sơ đồ ghế...</p>
        </div>
      </div>
    );
  }

  // Seat map error
  if (seatMapError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-red-50 p-6 rounded-lg max-w-md">
          <p className="text-red-600 mb-4">
            {seatMapError instanceof Error ? seatMapError.message : 'Lỗi tải sơ đồ ghế'}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Thử lại
            </button>
            <button
              onClick={() => router.push('/showtimes')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty seats
  if (seatMap.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-yellow-50 p-6 rounded-lg max-w-md">
          <p className="text-yellow-700 mb-4">Chưa có ghế nào.</p>
          <button
            onClick={() => router.push('/showtimes')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ✅ Debug: Log state trước khi render
  console.log('🎬 Render booking page:', {
    seatMapCount: seatMap.length,
    selectedCount: selectedSeatIds.length,
    token: token ? 'present' : 'missing',
    holdPending: holdMutation.isPending,
    countdown,
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Chọn ghế</h1>

      {/* Screen */}
      <div className="mb-6">
        <div className="bg-gray-800 h-2 rounded-t-3xl mx-auto max-w-xl"></div>
        <p className="text-center text-sm text-gray-500 mt-2">Màn hình</p>
      </div>

      {/* Seat Map */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-grid grid-cols-10 gap-2">
          {seatMap.map((seat) => {
            const isSelected = selectedSeatIds.includes(seat.id);
            const isAvailable = seat.status === 'available'; // ✅ Backend đã trả về status
            
            return (
              <button
                key={seat.id}
                disabled={!isAvailable || holdMutation.isPending} // ✅ Disable nếu đang hold
                onClick={() => {
                  console.log('🖱️ Toggle seat:', seat.id);
                  bookingStore.toggleSeat(seat.id);
                }}
                className={`
                  p-3 rounded text-sm font-medium transition-all
                  ${isSelected ? 'bg-green-500 text-white border-2 border-green-600' : ''}
                  ${!isAvailable && !isSelected ? 'bg-gray-300 cursor-not-allowed' : ''}
                  ${isAvailable && !isSelected ? 'bg-white border border-gray-300 hover:bg-blue-50' : ''}
                `}
              >
                {seat.seatNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected info */}
      {selectedSeatIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="font-semibold">Đã chọn {selectedSeatIds.length} ghế</p>
          <p className="text-sm text-gray-600 mt-1">
            {seatMap
              .filter(s => selectedSeatIds.includes(s.id))
              .map(s => s.seatNumber)
              .join(', ')}
          </p>
        </div>
      )}

      {/* Countdown */}
      {expiresAt && countdown > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 rounded">
          <strong>Thời gian còn lại: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</strong>
        </div>
      )}

      {countdown === 0 && expiresAt && (
        <div className="mb-4 p-3 bg-red-50 rounded">
          <p className="text-red-700">Đã hết thời gian giữ ghế!</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleHoldSeats}
          disabled={
            selectedSeatIds.length === 0 || 
            holdMutation.isPending || 
            (!!expiresAt && countdown === 0)  // ← CHỈ check countdown nếu ĐÃ CÓ expiresAt
          }
          className="flex-1 min-w-[200px] px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {holdMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang giữ...
            </span>
          ) : (
            `Giữ ghế (${selectedSeatIds.length})`
          )}
        </button>

        {bookingId && (
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold disabled:bg-gray-400 hover:bg-red-700 transition-colors"
          >
            {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy'}
          </button>
        )}

        <button
          onClick={() => router.push('/showtimes')}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
        >
          Quay lại
        </button>
      </div>

      {/* Errors */}
      {holdMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 rounded text-red-700">
          {(holdMutation.error as Error)?.message ?? 'Lỗi giữ ghế'}
        </div>
      )}
    </div>
  );
}
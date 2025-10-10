"use client";
import { useShowtimes } from 'api/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from 'store/bookingStore';
import { useAuthStore } from 'store/authStore';

export default function Showtimes() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('movieId') ?? undefined;
  const { token } = useAuthStore();
  const bookingStore = useBookingStore();

  const { data, isLoading, error } = useShowtimes(movieId ? { movieId } : undefined);
  const showtimes = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600">Lỗi: {(error as Error).message}</div>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Lịch chiếu</h1>
      
      {movieId && showtimes[0]?.movie?.title && (
        <p className="text-lg mb-4">Phim: <strong>{showtimes[0].movie.title}</strong></p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showtimes.map((showtime) => {
          // Log để debug
          console.log('Showtime data:', {
            id: showtime.id,
            roomId: showtime.roomId,
            room: showtime.room,
          });

          return (
            <div 
              key={showtime.id} 
              className="border rounded-lg p-4 hover:shadow-xl transition-all cursor-pointer bg-white"
              onClick={() => {
                if (!token) {
                  const currentPath = `/booking/${showtime.id}`;
                  router.push(`/auth/login?next=${encodeURIComponent(currentPath)}`);
                  return;
                }

                // Lấy roomId từ showtime (có thể là trực tiếp hoặc từ room.id)
                const roomId = showtime.roomId || showtime.room?.id;

                if (!roomId) {
                  alert('Suất chiếu này chưa có thông tin phòng chiếu');
                  console.error('Missing roomId for showtime:', showtime);
                  return;
                }

                // Set context ngay lập tức
                bookingStore.setContext({
                  movieId: showtime.movieId,
                  cinemaId: showtime.cinemaId,
                  roomId: roomId,
                  showtimeId: showtime.id,
                });

                // Navigate
                router.push(`/booking/${showtime.id}`);
              }}
            >
              {!movieId && (
                <div className="font-bold text-lg mb-2">
                  {showtime.movie?.title || 'N/A'}
                </div>
              )}

              <div className="space-y-1 text-sm">
                <div>🎬 {showtime.cinema?.name || 'N/A'}</div>
                <div>🚪 {showtime.room?.name || 'N/A'}</div>
                <div>🕐 {showtime.startsAt 
                  ? new Date(showtime.startsAt).toLocaleString('vi-VN')
                  : (showtime.startAt 
                      ? new Date(showtime.startAt).toLocaleString('vi-VN')
                      : 'N/A')
                }</div>
                <div>💰 {showtime.price || showtime.basePrice || 'N/A'} VND</div>
                <div>💺 {showtime.availableSeats ?? 0}/{showtime.totalSeats ?? 0} còn trống</div>
              </div>

              <div className="mt-3">
                {showtime.isActive ? (
                  <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Đang chiếu
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Ngừng chiếu
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
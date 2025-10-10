 "use client";
import { useMovies } from 'api/hooks';
import { useRouter } from 'next/navigation';

export default function MoviesPage() {
  const { data, isLoading, error } = useMovies();
  const movies = data?.items ?? [];
  const router = useRouter();
  const { token } = require('store/authStore').useAuthStore();
  console.log('User token:', token);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      <h1>Danh sách phim</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {movies.map((movie) => (
          <div key={movie.id} style={{ border: '1px solid #ccc', padding: 16, width: 250, cursor: 'pointer' }}
            onClick={() => router.push(`/movies/${movie.id}`)}>
            <img src={movie.posterUrl} alt={movie.title} style={{ width: '100%' }} />
            <h2>{movie.title}</h2>
            <div>Thể loại: {movie.genres.join(', ')}</div>
            <div>Trạng thái: {movie.state}</div>
            {movie.releaseDate && <div>Khởi chiếu: {new Date(movie.releaseDate).toLocaleDateString()}</div>}
            {movie.runtimeMinutes && <div>Thời lượng: {movie.runtimeMinutes} phút</div>}
            {movie.ratingCode && <div>Rating: {movie.ratingCode}</div>}
            {movie.originalLanguage && <div>Ngôn ngữ: {movie.originalLanguage}</div>}
            {movie.directors && <div>Đạo diễn: {movie.directors.join(', ')}</div>}
            {movie.cast && <div>Diễn viên: {movie.cast.map((c: import('types').CastItem) => c.name + (c.role ? ` (${c.role})` : '')).join(', ')}</div>}
            {movie.trailerUrl && <div><a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer">Trailer</a></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

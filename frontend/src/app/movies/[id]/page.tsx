"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from 'api/http';
import { endpoints } from 'api/endpoints';
import { Movie } from 'types';

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useQuery<Movie>({
    queryKey: ['movie', params.id],
    queryFn: () => apiGet<Movie>(endpoints.movies.detail(params.id)),
  });
  const router = require('next/navigation').useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (error || !data) return <div>Error: {(error as Error)?.message ?? 'Không tìm thấy phim'}</div>;

  return (
  <div>
      <h1>{data.title}</h1>
      <img src={data.posterUrl} alt={data.title} style={{ width: 300 }} />
      {data.description && <div>Mô tả: {data.description}</div>}
      {data.releaseDate && <div>Khởi chiếu: {new Date(data.releaseDate).toLocaleDateString()}</div>}
      {data.runtimeMinutes && <div>Thời lượng: {data.runtimeMinutes} phút</div>}
      <div>Thể loại: {data.genres.join(', ')}</div>
      <div>Trạng thái: {data.state}</div>
      {data.ratingCode && <div>Rating: {data.ratingCode}</div>}
      {data.originalLanguage && <div>Ngôn ngữ: {data.originalLanguage}</div>}
      {data.directors && <div>Đạo diễn: {data.directors.join(', ')}</div>}
      {data.cast && <div>Diễn viên: {data.cast.map((c: import('types').CastItem) => c.name + (c.role ? ` (${c.role})` : '')).join(', ')}</div>}
      {data.trailerUrl && (
        <div>
          <a href={data.trailerUrl} target="_blank" rel="noopener noreferrer">Trailer</a>
        </div>
      )}
      <button style={{marginTop: 16}} onClick={() => router.push(`/showtimes?movieId=${data.id}`)}>
        Xem lịch chiếu
      </button>
    </div>
  );
}

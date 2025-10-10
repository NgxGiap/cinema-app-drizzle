"use client";
import { useAuthStore } from 'store/authStore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!token) {
      // Lưu current path để redirect sau khi login
      const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      const encodedPath = encodeURIComponent(currentPath);
      router.replace(`/auth/login?next=${encodedPath}`);
    }
  }, [token, router, pathname, searchParams]);

  // Không render children nếu chưa có token
  if (!token) return null;
  
  return <>{children}</>;
}
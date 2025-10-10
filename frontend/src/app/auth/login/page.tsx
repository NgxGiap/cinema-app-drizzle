"use client";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from 'api/http';
import { endpoints } from 'api/endpoints';
import { useAuthStore } from 'store/authStore';
import { useRouter, useSearchParams } from 'next/navigation';

type LoginPayload = { email: string; password: string };
type LoginResponse = { token: string; userId: string };

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiPost<{ email: string; password: string }, { token: string; userId: string }>(
        endpoints.auth.login(), 
        payload
      ),
    onSuccess: (res) => {
      setAuth(res.token, res.userId);
      router.push(nextUrl); // Redirect về trang trước đó
    },
  });

  return (
    <div>
      <h1>Đăng nhập</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate({ email, password });
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loginMutation.isLoading}>
          Đăng nhập
        </button>
      </form>
      {loginMutation.error ? (
        <div>Error: {loginMutation.error instanceof Error ? loginMutation.error.message : String(loginMutation.error)}</div>
      ) : null}
    </div>
  );
}

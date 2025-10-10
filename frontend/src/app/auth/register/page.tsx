"use client";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from 'api/http';
import { endpoints } from 'api/endpoints';

type RegisterPayload = { name: string; password: string; email: string };
type RegisterResponse = { userId: string };

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) =>
      apiPost<RegisterPayload, RegisterResponse>(endpoints.auth.register(), payload),
    onSuccess: () => {
      window.location.href = '/auth/login';
    },
  });

  return (
    <div>
      <h1>Đăng ký</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          registerMutation.mutate({ name, password, email });
        }}
      >
        <input
          type="text"
          placeholder="Tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <button type="submit" disabled={registerMutation.isLoading}>
          Đăng ký
        </button>
      </form>
      {registerMutation.error ? (
        <div>Error: {registerMutation.error instanceof Error ? registerMutation.error.message : String(registerMutation.error)}</div>
      ) : null}
    </div>
  );
}

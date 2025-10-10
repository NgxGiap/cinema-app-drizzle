"use client";
import RouteGuard from 'app/providers/RouteGuard';
import { useEffect, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useBookingStore } from 'store/bookingStore';
import { usePaymentIntent, usePaymentDetail } from 'api/hooks';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  return (
    <RouteGuard>
      <CheckoutPageInner />
    </RouteGuard>
  );
}

function CheckoutPageInner() {
  const { token } = useAuthStore();
  const router = useRouter();
  const { bookingId, expiresAt, amount, setPayment } = useBookingStore();
  
  const paymentOptions: Array<{ label: string; value: import('types').PaymentMethod }> = [
    { label: 'MOMO', value: 'MOMO' },
    { label: 'CARD', value: 'CARD' },
  ];
  
  const [method, setMethod] = useState<import('types').PaymentMethod>('MOMO');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const paymentIntent = usePaymentIntent(token ?? undefined);
  const paymentDetail = usePaymentDetail(paymentId ?? '', token ?? undefined);

  // ✅ Wait for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Kiểm tra bookingId SAU KHI mount
  useEffect(() => {
    if (!mounted) return;

    console.log('🔍 Checkout state:', { bookingId, expiresAt, amount });

    if (!bookingId) {
      console.warn('⚠️ No bookingId, redirecting to showtimes');
      router.replace('/showtimes');
      return;
    }

    // Kiểm tra hết hạn
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      console.warn('⚠️ Booking expired, redirecting to showtimes');
      alert('Booking đã hết hạn, vui lòng đặt lại');
      router.replace('/showtimes');
    }
  }, [mounted, bookingId, expiresAt, router]);

  // Handle payment intent success
  useEffect(() => {
    if (paymentIntent.data?.payment) {
      setPaymentId(String(paymentIntent.data.payment.id));
      setPayment(String(paymentIntent.data.payment.id));
      
      if (paymentIntent.data.redirectUrl) {
        window.location.href = paymentIntent.data.redirectUrl;
      }
      
      if (paymentIntent.data.qrData) {
        setQrData(paymentIntent.data.qrData);
      }
    }
  }, [paymentIntent.data, setPayment]);

  // Handle payment success
  useEffect(() => {
    if (paymentDetail.data?.payment.status === 'PAID') {
      router.replace('/tickets?bookingId=' + bookingId);
    }
  }, [paymentDetail.data, bookingId, router]);

  // ✅ Not mounted yet
  if (!mounted) {
    return null;
  }

  // ✅ No booking
  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Đang kiểm tra booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Thanh toán</h1>

      {/* Booking info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Mã booking:</span>
            <span className="font-semibold">{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tổng tiền:</span>
            <span className="font-semibold text-lg text-blue-600">
              {amount ? `${amount} VND` : 'Đang tính...'}
            </span>
          </div>
          {expiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Hết hạn:</span>
              <span className="text-red-600">
                {new Date(expiresAt).toLocaleString('vi-VN')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">
          Phương thức thanh toán
        </label>
        <select 
          value={method} 
          onChange={e => setMethod(e.target.value as import('types').PaymentMethod)}
          className="w-full p-3 border rounded-lg"
        >
          {paymentOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Payment button */}
      <button
        onClick={() => paymentIntent.mutate({ bookingId: bookingId!, method })}
        disabled={paymentIntent.isPending || !bookingId}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
      >
        {paymentIntent.isPending ? 'Đang xử lý...' : 'Thanh toán'}
      </button>

      {/* QR Code */}
      {qrData && (
        <div className="mt-6 bg-white rounded-lg shadow p-6 text-center">
          <p className="mb-4 font-semibold">Quét mã QR để thanh toán</p>
          <img 
            src={`data:image/png;base64,${qrData}`} 
            alt="QR Code" 
            className="mx-auto max-w-xs"
          />
        </div>
      )}

      {/* Payment status */}
      {paymentDetail.data && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Trạng thái thanh toán</p>
            <p className="text-lg font-semibold">
              {paymentDetail.data.payment.status}
            </p>
          </div>
        </div>
      )}

      {/* Retry on failure */}
      {paymentDetail.data?.payment.status === 'FAILED' && (
        <button 
          onClick={() => paymentIntent.mutate({ bookingId: bookingId!, method })}
          className="w-full mt-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700"
        >
          Thanh toán lại
        </button>
      )}

      {/* Errors */}
      {paymentIntent.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {(paymentIntent.error as Error)?.message ?? 'Lỗi thanh toán'}
        </div>
      )}
    </div>
  );
}
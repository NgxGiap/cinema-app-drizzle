export type SeatType = 'REGULAR' | 'VIP' | 'COUPLE' | 'DISABLED';

export type SeatLayout = {
  defaultPrice: string; // "90000.00"
  defaultType?: SeatType; // mặc định REGULAR
  blocks: Array<{
    name?: string;
    rows: number; // số hàng
    cols: number; // số cột
    rowLabels?: string[]; // ví dụ ["A","B","C"]; nếu thiếu -> tự A,B,C...
    rowStartFrom?: string; // ví dụ "A" (khi không có rowLabels)
    firstColumn?: number; // cột bắt đầu (mặc định 1)
    aisles?: { cols?: number[]; rows?: number[] }; // lối đi: loại bỏ cả cột/hàng
    holes?: Array<{ row: number; col: number }>; // ô trống rời rạc
    typeByRow?: Record<string, SeatType>; // "A":"VIP"
    typeByCol?: Record<number, SeatType>; // 1:"DISABLED"
    priceByType?: Partial<Record<SeatType, string>>; // { VIP:"120000.00" }
  }>;
};

import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Projects
  dang_thuc_hien: { label: 'Đang thực hiện', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  tre_han: { label: 'Trễ hạn', className: 'bg-red-50 text-red-700 border-red-100' },
  cho_nghiem_thu: { label: 'Chờ nghiệm thu', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  da_nghiem_thu: { label: 'Đã nghiệm thu', className: 'bg-green-50 text-green-700 border-green-100' },
  huy_bo: { label: 'Đã hủy', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  // Contracts
  cho_duyet: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  da_ky: { label: 'Đã ký', className: 'bg-green-50 text-green-700 border-green-100' },
  hoan_thanh: { label: 'Hoàn thành', className: 'bg-green-50 text-green-700 border-green-100' },
  huy: { label: 'Đã hủy', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  // Councils
  cho_danh_gia: { label: 'Chờ đánh giá', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  dang_danh_gia: { label: 'Đang đánh giá', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  da_hoan_thanh: { label: 'Đã hoàn thành', className: 'bg-green-50 text-green-700 border-green-100' },
  // Settlements
  cho_bo_sung: { label: 'Chờ bổ sung', className: 'bg-red-50 text-red-700 border-red-100' },
  hop_le: { label: 'Hợp lệ', className: 'bg-green-50 text-green-700 border-green-100' },
  da_xac_nhan: { label: 'Đã xác nhận', className: 'bg-green-50 text-green-700 border-green-100' },
  hoa_don_vat: { label: 'Thiếu VAT', className: 'bg-orange-50 text-orange-700 border-orange-100' },
  // Extensions
  da_phe_duyet: { label: 'Đã phê duyệt', className: 'bg-green-50 text-green-700 border-green-100' },
  dang_cho: { label: 'Đang chờ BGH', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  tu_choi: { label: 'Từ chối', className: 'bg-red-50 text-red-700 border-red-100' },
  // Council member roles
  chu_tich: { label: 'Chủ tịch', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  phan_bien_1: { label: 'Phản biện 1', className: 'bg-purple-50 text-purple-700 border-purple-100' },
  phan_bien_2: { label: 'Phản biện 2', className: 'bg-purple-50 text-purple-700 border-purple-100' },
  thu_ky: { label: 'Thư ký', className: 'bg-teal-50 text-teal-700 border-teal-100' },
  uy_vien: { label: 'Ủy viên', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

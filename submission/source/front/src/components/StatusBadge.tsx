import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Projects
  dang_thuc_hien: { label: 'Đang thực hiện', className: 'badge-info' },
  tre_han: { label: 'Trễ hạn', className: 'badge-error' },
  cho_nghiem_thu: { label: 'Chờ nghiệm thu', className: 'badge-warning' },
  da_nghiem_thu: { label: 'Đã nghiệm thu', className: 'badge-success' },
  huy_bo: { label: 'Đã hủy', className: 'badge-neutral' },
  // Contracts
  cho_duyet: { label: 'Chờ duyệt', className: 'badge-warning' },
  da_ky: { label: 'Đã ký', className: 'badge-success' },
  hoan_thanh: { label: 'Hoàn thành', className: 'badge-success' },
  huy: { label: 'Đã hủy', className: 'badge-neutral' },
  // Councils
  cho_danh_gia: { label: 'Chờ đánh giá', className: 'badge-warning' },
  dang_danh_gia: { label: 'Đang đánh giá', className: 'badge-info' },
  da_hoan_thanh: { label: 'Đã hoàn thành', className: 'badge-success' },
  // Settlements
  cho_bo_sung: { label: 'Chờ bổ sung', className: 'badge-error' },
  hop_le: { label: 'Hợp lệ', className: 'badge-success' },
  da_xac_nhan: { label: 'Đã xác nhận', className: 'badge-success' },
  hoa_don_vat: { label: 'Thiếu VAT', className: 'badge-warning' },
  // Extensions
  da_phe_duyet: { label: 'Đã phê duyệt', className: 'badge-success' },
  dang_cho: { label: 'Đang chờ BGH', className: 'badge-neutral' },
  tu_choi: { label: 'Từ chối', className: 'badge-error' },
  // Council member roles
  chu_tich: { label: 'Chủ tịch', className: 'badge-info' },
  phan_bien_1: { label: 'Phản biện 1', className: 'badge-primary' },
  phan_bien_2: { label: 'Phản biện 2', className: 'badge-primary' },
  thu_ky: { label: 'Thư ký', className: 'badge-success' },
  uy_vien: { label: 'Ủy viên', className: 'badge-neutral' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || { label: status, className: 'badge-neutral' };
  return (
    <span className={`badge ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

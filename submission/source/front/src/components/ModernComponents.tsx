/**
 * modernComponents.tsx
 * Ready-to-use modern UI components
 * Copy-paste and customize for your needs
 */

import React, { useState } from 'react';

// ============================================================
// 1. MODERN BUTTONS
// ============================================================

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const ModernButton: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  onClick,
}) => {
  const baseClass = 'font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-300 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-300',
    tertiary: 'text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-300',
    danger: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700 focus:ring-error-300 shadow-sm',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClass} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Đang xử lý...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

// ============================================================
// 2. MODERN CARD
// ============================================================

interface CardProps {
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const ModernCard: React.FC<CardProps> = ({
  className,
  clickable = false,
  onClick,
  children,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 p-6 shadow-card
        ${clickable ? 'hover:shadow-lg hover:border-primary-200 cursor-pointer transition-all duration-200' : ''}
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
};

// ============================================================
// 3. MODERN INPUT
// ============================================================

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  icon?: React.ReactNode;
  error?: string;
  helpText?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

export const ModernInput: React.FC<InputProps> = ({
  label,
  placeholder,
  type = 'text',
  icon,
  error,
  helpText,
  value,
  onChange,
  disabled,
  className,
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 rounded-lg border text-sm font-medium
            placeholder:text-gray-400
            ${icon ? 'pl-10' : ''}
            ${error
              ? 'border-error-500 bg-error-50 focus:ring-2 focus:ring-error-300'
              : 'border-gray-200 bg-white focus:ring-2 focus:ring-primary-300 focus:border-primary-500'
            }
            focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${className || ''}
          `}
        />
      </div>
      {error && <p className="text-xs text-error-600 font-medium">{error}</p>}
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

// ============================================================
// 4. MODERN STATUS BADGE
// ============================================================

type BadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  status: BadgeStatus;
  label: string;
  animate?: boolean;
}

export const ModernBadge: React.FC<BadgeProps> = ({
  status,
  label,
  animate = false,
}) => {
  const statusStyles = {
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    error: 'bg-error-50 text-error-700',
    info: 'bg-info-50 text-info-700',
    default: 'bg-gray-100 text-gray-700',
  };

  const dotColor = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
    default: 'bg-gray-500',
  };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusStyles[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor[status]} ${animate ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
};

// ============================================================
// 5. MODERN SELECT/DROPDOWN
// ============================================================

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const ModernSelect: React.FC<SelectProps> = ({
  label,
  placeholder = 'Chọn một tùy chọn',
  options,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-lg border text-sm font-medium
          appearance-none cursor-pointer
          ${error
            ? 'border-error-500 bg-error-50 focus:ring-2 focus:ring-error-300'
            : 'border-gray-200 bg-white focus:ring-2 focus:ring-primary-300'
          }
          focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed
          bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%226b7280%22%3e%3cpath fill-rule=%22evenodd%22 d=%22M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z%22 clip-rule=%22evenodd%22/%3e%3c/svg%3e')] bg-no-repeat bg-right bg-[1.25rem] pr-8
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error-600 font-medium">{error}</p>}
    </div>
  );
};

// ============================================================
// 6. MODERN MODAL/DIALOG
// ============================================================

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  danger?: boolean;
}

export const ModernModal: React.FC<ModalProps> = ({
  isOpen,
  title,
  description,
  children,
  onClose,
  onConfirm,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmLoading = false,
  danger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-300">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && <p className="text-gray-600 mt-2 text-sm">{description}</p>}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50 transition-all ${
              danger
                ? 'bg-error-500 hover:bg-error-600 active:bg-error-700'
                : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700'
            }`}
          >
            {confirmLoading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 7. MODERN TABLE
// ============================================================

interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps {
  columns: Column[];
  data: Record<string, any>[];
  loading?: boolean;
  onRowClick?: (row: Record<string, any>) => void;
}

export const ModernTable: React.FC<TableProps> = ({
  columns,
  data,
  loading = false,
  onRowClick,
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-${col.align || 'left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 text-sm text-gray-700 text-${col.align || 'left'}`}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================
// 8. MODERN ALERT/NOTIFICATION
// ============================================================

type AlertType = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  type: AlertType;
  title: string;
  message?: string;
  onClose?: () => void;
  closeable?: boolean;
}

export const ModernAlert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onClose,
  closeable = true,
}) => {
  const typeStyles = {
    success: 'bg-success-50 border-success-200 text-success-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    info: 'bg-info-50 border-info-200 text-info-800',
  };

  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className={`rounded-lg border p-4 ${typeStyles[type]} flex items-start gap-3`}>
      <span className="text-xl flex-shrink-0">{icons[type]}</span>
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-sm mt-1 opacity-75">{message}</p>}
      </div>
      {closeable && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-75 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ============================================================
// 9. MODERN LOADER/SKELETON
// ============================================================

export const ModernSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
);

export const ModernSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-primary-500 border-t-transparent rounded-full animate-spin`} />
  );
};

// ============================================================
// EXAMPLE USAGE
// ============================================================

export const ComponentShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-display-lg font-bold text-gray-900">Modern Components Showcase</h1>

        {/* Buttons */}
        <ModernCard>
          <h2 className="h2 mb-4">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <ModernButton variant="primary">Primary</ModernButton>
            <ModernButton variant="secondary">Secondary</ModernButton>
            <ModernButton variant="tertiary">Tertiary</ModernButton>
            <ModernButton variant="danger">Delete</ModernButton>
            <ModernButton loading>Loading</ModernButton>
          </div>
        </ModernCard>

        {/* Badges */}
        <ModernCard>
          <h2 className="h2 mb-4">Status Badges</h2>
          <div className="flex flex-wrap gap-4">
            <ModernBadge status="success" label="Hoàn thành" />
            <ModernBadge status="info" label="Đang xử lý" animate />
            <ModernBadge status="warning" label="Cảnh báo" />
            <ModernBadge status="error" label="Lỗi" />
          </div>
        </ModernCard>

        {/* Form */}
        <ModernCard>
          <h2 className="h2 mb-4">Form Fields</h2>
          <div className="space-y-4">
            <ModernInput label="Email Address" placeholder="user@example.com" type="email" />
            <ModernSelect
              label="Chọn Trạng Thái"
              options={[
                { value: '1', label: 'Đang thực hiện' },
                { value: '2', label: 'Hoàn thành' },
              ]}
            />
          </div>
        </ModernCard>

        {/* Alerts */}
        <ModernCard>
          <h2 className="h2 mb-4">Alerts</h2>
          <div className="space-y-3">
            <ModernAlert type="success" title="Success!" message="Operation completed successfully" />
            <ModernAlert type="warning" title="Warning" message="Please review this information" />
            <ModernAlert type="error" title="Error" message="Something went wrong" />
          </div>
        </ModernCard>

        {/* Modal */}
        <ModernCard>
          <ModernButton onClick={() => setIsModalOpen(true)}>Open Modal</ModernButton>
          <ModernModal
            isOpen={isModalOpen}
            title="Confirm Action"
            description="Are you sure you want to proceed?"
            onClose={() => setIsModalOpen(false)}
            onConfirm={() => {
              setIsModalOpen(false);
              alert('Confirmed!');
            }}
          />
        </ModernCard>

        {/* Table */}
        <ModernCard>
          <h2 className="h2 mb-4">Data Table</h2>
          <ModernTable
            columns={[
              { key: 'id', label: 'ID', width: '80px' },
              { key: 'name', label: 'Name' },
              { key: 'status', label: 'Status' },
            ]}
            data={[
              { id: '1', name: 'Đề tài 1', status: 'Hoàn thành' },
              { id: '2', name: 'Đề tài 2', status: 'Đang thực hiện' },
            ]}
          />
        </ModernCard>
      </div>
    </div>
  );
};

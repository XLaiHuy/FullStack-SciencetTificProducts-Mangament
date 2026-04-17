import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const AuthShell: React.FC<Props> = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen bg-white">
    <div
      className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(140deg, rgba(0, 77, 153, 0.84), rgba(0, 145, 221, 0.72)), url('/background.jpg')" }}
    >
      <div className="absolute -top-20 -right-16 w-72 h-72 bg-white/20 rounded-full blur-2xl animate-soft-float" />
      <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-info-300/30 rounded-full blur-2xl animate-soft-float" />
      <div className="absolute inset-0 opacity-20">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: `${(i + 1) * 95}px`, height: `${(i + 1) * 95}px`, top: `${i * 14}%`, left: `${i * 9 - 8}%`, opacity: 0.24 }}
          />
        ))}
      </div>
      <div className="relative z-10 text-white text-center max-w-xl animate-fade-up">
        <div className="w-44 h-44 bg-transparent flex items-center justify-center mx-auto mb-10 animate-soft-float">
          <img src="/LoGoOu.png" alt="Logo Cổng NCKH Trường ĐH Mở TPHCM" className="w-36 h-36 object-contain" />
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tight leading-tight">Cổng NCKH<br />Trường ĐH Mở TPHCM</h1>
        <p className="text-blue-100 text-2xl font-semibold">Hệ thống Quản lý Nghiên cứu Khoa học</p>
      </div>
    </div>

    <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-gradient-to-b from-white to-primary-50/40">
      <div className="w-full max-w-md animate-fade-up-delay-1">
        <header className="text-center mb-8">
          <img src="/LoGoOu.png" alt="Logo Cổng NCKH Trường ĐH Mở TPHCM" className="h-24 mx-auto mb-5 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">{title}</h1>
          {subtitle && <p className="text-primary-700 font-semibold">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  </div>
);

export default AuthShell;

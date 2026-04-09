import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const AuthShell: React.FC<Props> = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen bg-white">
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary flex-col items-center justify-center p-12 relative overflow-hidden">
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
        <div className="w-44 h-44 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl animate-soft-float">
          <img src="/logo.png" alt="Logo truong" className="w-32 h-32 object-contain" />
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tight leading-tight">Hệ thống Quản lý<br />Nghiên cứu Khoa học</h1>
        <p className="text-blue-100 text-2xl font-semibold">Trường Đại học Mở TP.HCM</p>
      </div>
    </div>

    <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-gradient-to-b from-white to-primary-50/40">
      <div className="w-full max-w-md animate-fade-up-delay-1">
        <header className="text-center mb-8">
          <img src="/logo.png" alt="Logo trường" className="h-24 mx-auto mb-5 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">{title}</h1>
          {subtitle && <p className="text-primary-700 font-semibold">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  </div>
);

export default AuthShell;

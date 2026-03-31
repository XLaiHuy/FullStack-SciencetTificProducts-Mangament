import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const AuthShell: React.FC<Props> = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen bg-gray-50">
    <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: `${(i + 1) * 80}px`, height: `${(i + 1) * 80}px`, top: `${i * 15}%`, left: `${i * 10 - 10}%`, opacity: 0.3 }}
          />
        ))}
      </div>
      <div className="relative z-10 text-white text-center">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
          <img src="/logo.png" alt="Logo truong" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">He thong Quan ly<br />Nghien cuu Khoa hoc</h1>
        <p className="text-blue-100 text-lg font-medium">Truong Dai hoc Mo TP.HCM</p>
      </div>
    </div>

    <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <img src="/logo.png" alt="Logo truong" className="h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 font-medium">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  </div>
);

export default AuthShell;

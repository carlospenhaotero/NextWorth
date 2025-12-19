import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, PlusCircle, User, LogOut, Settings } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Portfolio', path: '/dashboard' },
        { icon: PieChart, label: 'Assets', path: '/assets' },
        { icon: PlusCircle, label: 'Add Asset', path: '/add-asset' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <img src="/logo.png" alt="NextWorth" className="w-10 h-10 object-contain" />
                <h1 className="text-xl font-bold text-white tracking-wide">NextWorth</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-[#00C2FF] text-slate-900 shadow-lg shadow-cyan-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Profile Summary */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        U
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">User</p>
                        <p className="text-xs text-slate-400 truncate">user@example.com</p>
                    </div>
                    <LogOut size={18} className="text-slate-400 hover:text-red-400 transition-colors" />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

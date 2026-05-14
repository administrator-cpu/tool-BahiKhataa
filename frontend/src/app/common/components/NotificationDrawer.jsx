import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Circle, CreditCard, FileText, Info, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ledgerService } from '@/app/modules/ledger/ledger.service';
import { useRouter } from 'next/navigation';

// Helper to calculate "5 mins ago", "2 hours ago", etc.
const timeAgo = (dateString) => {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
};

// Fallback currency formatter just in case it's not imported
const formatMoney = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export default function NotificationMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const router = useRouter();

    const loadq = async () => {
        try {
            const { data } = await ledgerService.getPendingQueue();
            const logs = data?.data?.logs || [];

            // Transform backend data into UI Notifications
            const formattedNotifications = logs.map(item => {
                const isCredit = Number(item.credit) > 0;
                const amount = isCredit ? item.credit : item.debit;
                const company = item.customer?.companyName || 'Unknown Customer';
                
                let title = 'New Notification';
                let message = item.description || 'View details';
                let type = 'info';

                // Format based on the pending status
                if (item.status === 'pending') {
                    title = isCredit ? 'Pending Payment Approval' : 'Pending Invoice Approval';
                    message = `${company} has a pending ${isCredit ? 'payment' : 'bill'} of ${formatMoney(amount)} via ${item.bankInfo?.bankName || 'System'}.`;
                    type = 'pending';
                }

                return {
                    id: item._id,
                    type: type,
                    title: title,
                    message: message,
                    time: timeAgo(item.updatedAt || item.createdAt),
                    isRead: false,
                    customerId: item.customer?._id || item.customer?.id // Grab the customer ID for redirection
                };
            });

            setNotifications(formattedNotifications);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadq();
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Prevent background scrolling when the drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
    };

    // 💡 Handle Click: Mark read, Close drawer, Redirect!
    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);
        setIsOpen(false);
        if (notification.customerId) {
            router.push(`/dashboard/ledger/${notification.customerId}`);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'payment': return <CreditCard size={18} className="text-green-600" />;
            case 'invoice': return <FileText size={18} className="text-blue-600" />;
            case 'pending': return <Clock size={18} className="text-orange-500" />; // 💡 Added Pending Icon
            default: return <Info size={18} className="text-slate-600" />;
        }
    };

    return (
        <>
            {/* Bell Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                    </span>
                )}
            </button>

            {/* Drawer Overlay & Panel */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">

                        {/* Backdrop (Fades in/out) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Sliding Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full md:w-1/2 lg:w-[45%] h-full bg-white shadow-2xl flex flex-col"
                        >

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {unreadCount} Pending
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                        >
                                            <CheckCheck size={16} /> Mark all read
                                        </button>
                                    )}
                                    {/* Close Button */}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Notification List */}
                            <div className="flex-1 overflow-y-auto customScroller p-2">
                                {notifications.length > 0 ? (
                                    <div className="space-y-1">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all ${!notification.isRead
                                                        ? 'bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 shadow-sm'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                                    }`}
                                            >
                                                {/* Icon */}
                                                <div className={`mt-1 p-3 rounded-full shrink-0 ${!notification.isRead ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                                    {getIcon(notification.type)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-base font-bold ${!notification.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                                            {notification.title}
                                                        </p>
                                                        {!notification.isRead && <Circle size={10} className="fill-blue-600 text-blue-600 shrink-0 mt-1" />}
                                                    </div>
                                                    <p className={`text-sm leading-relaxed ${!notification.isRead ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
                                                        {notification.time}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                        <div className="p-6 bg-slate-50 rounded-full">
                                            <Bell size={40} className="text-slate-300" />
                                        </div>
                                        <p className="text-lg font-bold text-slate-600">You're all caught up!</p>
                                        <p className="text-sm font-medium">No pending approvals right now.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
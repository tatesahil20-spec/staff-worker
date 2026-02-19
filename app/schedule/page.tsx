import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Calendar,
    Clock,
    Home,
    MapPin,
    CheckCircle2,
    Search,
    Bell,
    ChevronRight,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(timeString: string | null) {
    if (!timeString) return "All Day";
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

function formatDate(dateString: string) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}

export default async function SchedulePage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) redirect("/login");

    const { data: userProfile } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", session.user.id)
        .single();

    if (userProfile?.role !== "staff") redirect("/login");

    const today = new Date().toISOString().split("T")[0];

    const { data: tasks, error } = await supabase
        .from("tasks")
        .select(`
            *,
            issues (
                title,
                location,
                priority,
                category
            )
        `)
        .eq("staff_id", session.user.id)
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

    if (error) console.error("Error fetching schedule:", error);

    const taskList = tasks || [];

    const grouped: Record<string, typeof taskList> = {};
    for (const task of taskList) {
        const date = task.scheduled_date as string;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(task);
    }
    const sortedDates = Object.keys(grouped).sort();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Consistent Header */}
            <header className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 text-white px-6 pt-10 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-xl border border-white/30">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Work Schedule</h1>
                                <p className="text-blue-100/70 text-xs font-medium uppercase tracking-wider">
                                    Upcoming for {userProfile?.name?.split(' ')[0] || "Worker"}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-5 -mt-12 relative z-20 space-y-8">
                {sortedDates.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-xl">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/40" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">All Clear!</h3>
                        <p className="text-slate-500 mt-2">No upcoming tasks found in your schedule.</p>
                    </div>
                ) : (
                    sortedDates.map((date) => {
                        const isToday = date === today;
                        const dayTasks = grouped[date];

                        return (
                            <div key={date} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-6 rounded-full ${isToday ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "bg-slate-300 dark:bg-slate-700"}`} />
                                        <h2 className={`text-sm font-black uppercase tracking-widest ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
                                            {isToday ? "Today" : formatDate(date)}
                                        </h2>
                                    </div>
                                    {isToday && (
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl tracking-widest uppercase shadow-lg shadow-blue-500/30">ACTIVE</span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {dayTasks.map((task: any) => (
                                        <Link
                                            key={task.id}
                                            href={`/task/${task.id}`}
                                            className="group block bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/50 active:scale-[0.97] transition-all hover:shadow-md hover:border-blue-500/30"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-2">
                                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider
                                                        ${task.issues?.priority === "high"
                                                            ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                                            : task.issues?.priority === "medium"
                                                                ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                        }`}
                                                    >
                                                        {task.issues?.priority || "Normal"}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border
                                                        ${task.status === "completed"
                                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                            : task.status === "in_progress"
                                                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                                        }`}
                                                    >
                                                        {task.status?.replace("_", " ")}
                                                    </span>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            </div>

                                            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 leading-tight">
                                                {task.issues?.title || "Untitled Issue"}
                                            </h3>

                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                                                    <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    <span className="truncate">{task.issues?.location || "Field Assignment"}</span>
                                                </div>
                                                <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                                                    <Clock className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                                                    <span>Starts {formatTime(task.scheduled_time)}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Premium Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:px-32 z-50">
                <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] px-8 py-3 flex justify-around items-center shadow-2xl">
                    <Link href="/home" className="flex flex-col items-center gap-1.5 transition-all text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400">
                        <div className="p-2 bg-transparent rounded-2xl">
                            <Home className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
                    </Link>
                    <Link href="/schedule" className="flex flex-col items-center gap-1.5 transition-all text-blue-600 dark:text-blue-400">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-2xl">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Schedule</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}

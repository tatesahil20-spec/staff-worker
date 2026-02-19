import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Calendar,
    CheckCircle2,
    Clock,
    Home,
    MapPin,
    AlertCircle,
    ClipboardList,
    ChevronRight,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

function formatTime(timeString: string) {
    if (!timeString) return "All Day";
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

export default async function HomePage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) redirect("/login");

    const { data: userProfile } = await supabase
        .from("users")
        .select("name, department, role")
        .eq("id", session.user.id)
        .single();

    if (userProfile?.role !== 'staff') redirect("/login");

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
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });

    if (error) console.error("Error fetching tasks:", error);

    const taskList = tasks || [];
    const totalTasks = taskList.length;
    const completedTasks = taskList.filter((t) => t.status === "completed").length;
    const pendingTasks = totalTasks - completedTasks;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Elegant Header */}
            <header className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 text-white px-6 pt-10 pb-16 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full -ml-10 -mb-10 blur-2xl" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-xl border border-white/30">
                                {userProfile?.name?.charAt(0) || "W"}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">
                                    Hey, {userProfile?.name?.split(' ')[0] || "Worker"}
                                </h1>
                                <p className="text-blue-100/70 text-xs font-medium uppercase tracking-wider">
                                    {userProfile?.department || "Staff Member"}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <LogoutButton />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-blue-100/80 text-sm font-medium">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                            })}
                        </span>
                    </div>
                </div>
            </header>

            <main className="px-5 -mt-8 relative z-20 space-y-6">
                {/* Dashboard Stats Section */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-200/50 dark:border-slate-800/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Today's Overview</p>
                    <div className="grid grid-cols-3 gap-1">
                        <div className="text-center group">
                            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                {totalTasks}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Total</div>
                        </div>
                        <div className="text-center border-x border-slate-100 dark:border-slate-800">
                            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                {completedTasks}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Done</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-amber-500 dark:text-amber-400">
                                {pendingTasks}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Pending</div>
                        </div>
                    </div>
                </div>

                {/* Tasks Header */}
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        Today's Schedule
                    </h2>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {totalTasks} Active
                    </span>
                </div>

                {/* Task List Container */}
                <div className="space-y-4">
                    {taskList.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">All caught up!</h3>
                            <p className="text-slate-500 text-sm mt-1">No tasks assigned for today.</p>
                        </div>
                    ) : (
                        taskList.map((task: any) => (
                            <Link
                                href={`/task/${task.id}`}
                                key={task.id}
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
                        ))
                    )}
                </div>
            </main>

            {/* Premium Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:px-32 z-50">
                <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] px-8 py-3 flex justify-around items-center shadow-2xl">
                    <Link href="/home" className="flex flex-col items-center gap-1.5 transition-all text-blue-600 dark:text-blue-400">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-2xl">
                            <Home className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
                    </Link>
                    <Link href="/schedule" className="flex flex-col items-center gap-1.5 transition-all text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400">
                        <div className="p-2 bg-transparent rounded-2xl">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Schedule</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}

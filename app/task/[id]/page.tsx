"use client";

import { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    MapPin,
    Clock,
    AlertCircle,
    CheckCircle2,
    Camera,
    Navigation,
    Loader2,
    FileText,
    Image as ImageIcon,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(timeString: string | null) {
    if (!timeString) return "All Day";
    const [hours, minutes] = timeString.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

function priorityBadge(priority: string | null) {
    switch (priority) {
        case "high":
            return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
        case "medium":
            return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
        default:
            return "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskDetailPage({ params }: { params: { id: string } }) {
    const supabase = createClientComponentClient();
    const router = useRouter();

    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Completion form state
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [gpsStatus, setGpsStatus] = useState<"idle" | "capturing" | "captured" | "error">("idle");
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch task ──────────────────────────────────────────────────────────
    useEffect(() => {
        async function fetchTask() {
            setLoading(true);
            const { data, error } = await supabase
                .from("tasks")
                .select(`
                    *,
                    issues (
                        id,
                        title,
                        description,
                        location,
                        priority,
                        category,
                        photo_url,
                        status
                    )
                `)
                .eq("id", params.id)
                .single();

            if (error) {
                setError("Task not found.");
            } else {
                setTask(data);
            }
            setLoading(false);
        }
        fetchTask();
    }, [params.id]);

    // ── GPS capture ─────────────────────────────────────────────────────────
    function captureGPS() {
        if (!navigator.geolocation) {
            setGpsStatus("error");
            return;
        }
        setGpsStatus("capturing");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsStatus("captured");
            },
            (err) => {
                console.error("GPS Error:", err);
                setGpsStatus("error");
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }

    // ── Photo selection ─────────────────────────────────────────────────────
    function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
        // Auto-capture GPS when photo is selected
        if (gpsStatus === "idle") captureGPS();
    }

    // ── Submit ──────────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!photoFile) {
            setSubmitError("Please select a completion photo.");
            return;
        }
        if (!gpsCoords) {
            setSubmitError("GPS location is required. Please wait for GPS to capture.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            // 1. Upload photo to Supabase Storage
            const ext = photoFile.name.split(".").pop();
            const fileName = `${params.id}-${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("completion-photos")
                .upload(fileName, photoFile, { upsert: true });

            if (uploadError) throw new Error("Photo upload failed: " + uploadError.message);

            const { data: urlData } = supabase.storage
                .from("completion-photos")
                .getPublicUrl(fileName);
            const photoUrl = urlData.publicUrl;

            // 2. Update tasks table
            const { error: taskError } = await supabase
                .from("tasks")
                .update({
                    status: "completed",
                    completion_photo: photoUrl,
                    completion_lat: gpsCoords.lat,
                    completion_lng: gpsCoords.lng,
                    completion_note: note,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", params.id);

            if (taskError) throw new Error("Failed to update task: " + taskError.message);

            // 3. Update issues table
            if (task?.issues?.id) {
                const { error: issueError } = await supabase
                    .from("issues")
                    .update({ status: "resolved" })
                    .eq("id", task.issues.id);

                if (issueError) console.error("Issue update failed:", issueError.message);
            }

            alert("Task marked as completed!");
            router.push("/home");
        } catch (err: any) {
            setSubmitError(err.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    }

    // ── Render states ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Task...</p>
                </div>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-6 p-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="text-center">
                    <p className="text-xl font-black">{error || "Task not found."}</p>
                    <p className="text-slate-500 mt-2">The requested task might have been removed.</p>
                </div>
                <Link href="/home" className="px-8 py-3 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const issue = task.issues;
    const isCompleted = task.status === "completed";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Premium Header */}
            <header className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 text-white px-6 pt-10 pb-16 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold tracking-tight">Assignment Details</h1>
                            <p className="text-blue-100/70 text-xs font-medium uppercase tracking-wider">Reference #{params.id.slice(0, 8)}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border
                            ${isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            }`}
                        >
                            {task.status?.replace("_", " ")}
                        </span>
                    </div>
                </div>
            </header>

            <main className="px-5 -mt-8 relative z-20 space-y-6">
                {/* Issue Info Card */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border border-slate-200/50 dark:border-slate-800/50 space-y-6">
                    {/* Header with Title and Priority */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${priorityBadge(issue?.priority)}`}>
                                {issue?.priority || "Normal"} Priority
                            </span>
                            {issue?.category && (
                                <span className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                    {issue.category}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                            {issue?.title || "Untitled Assignment"}
                        </h2>
                    </div>

                    {/* Description Area */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "{issue?.description || "No specific instructions provided for this task."}"
                        </p>
                    </div>

                    {/* Metadata: Location and Time */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                                <p className="text-sm font-bold truncate">{issue?.location || "Specific Area"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled For</p>
                                <p className="text-sm font-bold">{formatTime(task.scheduled_time)} Today</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task Photo Section */}
                {issue?.photo_url && (
                    <div className="space-y-3 px-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Reported Issue Photo
                        </p>
                        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 relative group aspect-video">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={issue.photo_url} alt="Reported issue" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                <p className="text-white text-xs font-bold uppercase tracking-widest">Original Reference</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Completion Section */}
                {isCompleted ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-[2.5rem] p-8 space-y-8 border-2 border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-emerald-800 dark:text-emerald-400">Task Completed</h3>
                                <p className="text-emerald-600/70 text-sm font-medium">Successfully verified on site</p>
                            </div>
                        </div>

                        {task.completion_photo && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Verification Image</p>
                                <div className="rounded-[2rem] overflow-hidden border-2 border-emerald-500/20 shadow-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={task.completion_photo} alt="Work done" className="w-full h-64 object-cover" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {task.completion_note && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> Worker Note
                                    </p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-emerald-500/5 p-4 rounded-2xl">{task.completion_note}</p>
                                </div>
                            )}

                            {task.completion_lat && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                        <Navigation className="w-3 h-3" /> GPS Verified
                                    </p>
                                    <div className="bg-emerald-500/5 p-4 rounded-2xl">
                                        <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                            {task.completion_lat.toFixed(6)}, {task.completion_lng.toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── Completion Form ── */
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-200/50 dark:border-slate-800/50 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black">1</div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">Complete Work</h3>
                        </div>

                        {/* Photo Verification */}
                        <div className="space-y-4">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Photo Verification *</label>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                            {photoPreview ? (
                                <div className="relative rounded-[2rem] overflow-hidden group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-xl text-white text-xs font-black px-6 py-3 rounded-2xl flex items-center gap-2 border border-white/20 hover:bg-white/20 transition-all">
                                        <Camera className="w-4 h-4" /> CHANGE PHOTO
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-500/50 hover:text-blue-500 transition-all hover:bg-blue-500/5 group">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-widest">Capture Completion</span>
                                </button>
                            )}
                        </div>

                        {/* GPS Location Capture */}
                        <div className="space-y-4">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">GPS Evidence *</label>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={captureGPS}
                                    disabled={gpsStatus === "capturing" || gpsStatus === "captured"}
                                    className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg
                                        ${gpsStatus === "captured"
                                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                            : gpsStatus === "error"
                                                ? "bg-red-500 text-white shadow-red-500/20"
                                                : "bg-blue-600 text-white shadow-blue-500/20 active:scale-95"
                                        }`}
                                >
                                    {gpsStatus === "capturing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                    {gpsStatus === "idle" && "Secure GPS"}
                                    {gpsStatus === "capturing" && "Seeking..."}
                                    {gpsStatus === "captured" && "Secured"}
                                    {gpsStatus === "error" && "Retry"}
                                </button>

                                <div className="flex-1 px-2">
                                    {gpsCoords ? (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Precision OK</span>
                                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                                {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-tight italic">Waiting for signal...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Completion Note */}
                        <div className="space-y-4">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" /> Site Summary (Optional)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Any additional details about the completion..."
                                rows={3}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm resize-none font-medium"
                            />
                        </div>

                        {submitError && (
                            <div className="bg-red-500/10 border-2 border-red-500/20 text-red-500 text-xs font-bold p-5 rounded-[2rem] flex items-center gap-4">
                                <AlertCircle className="w-6 h-6 shrink-0" />
                                {submitError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="group relative w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg uppercase tracking-widest overflow-hidden"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Syncing Results...</span>
                                </>
                            ) : (
                                <>
                                    <span>Verify Completion</span>
                                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}

"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";

export default function LogoutButton() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function handleLogout() {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            router.refresh();
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all active:scale-95 group"
            title="Logout"
        >
            {isLoggingOut ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
                <LogOut className="w-5 h-5 text-white group-hover:text-red-300 transition-colors" />
            )}
        </button>
    );
}

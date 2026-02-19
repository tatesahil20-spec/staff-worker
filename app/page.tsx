import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function Home() {
    const supabase = createServerSupabaseClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    } else {
        // Check if user is staff
        const { data: userRole } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (userRole?.role === "staff") {
            redirect("/home");
        } else {
            // If logged in but not staff, what should we do? For now stay here or redirect to a 'not authorized' page?
            // The requirement says "If not staff, show error 'Access denied. Staff only'".
            // Since this is a server redirect, we might need to handle this on the client side or redirect to an error page.
            // But for the root page, let's redirect to login if they aren't authorized, or maybe let the logic handle it.
            // Actually, if they are logged in but not staff, the login page is where the check happens during login.
            // If they are already logged in and visit /, we should probably re-verify.
            // Let's redirect to /login?error=Access%20Denied if not staff, or just let them fall through.
            // Wait, the requirements said: "If not staff, show error 'Access denied. Staff only'".
            // This usually applies to the login flow. If they are already logged in, we should block them.

            // Let's redirect to /login for now if not staff, effectively logging them out or forcing them to see the error there if we pass it.
            // For simplicity in this root route, if session exists but not staff, redirect to login.
            redirect("/login");
        }
    }

    return null; // This page only redirects
}

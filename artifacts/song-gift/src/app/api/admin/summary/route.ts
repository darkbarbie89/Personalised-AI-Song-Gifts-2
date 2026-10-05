import { NextRequest, NextResponse } from "next/server";
import { configurationError, jsonError } from "@/lib/server/http";
import { getAdminSupabase, getRequestUser } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return jsonError("Sign in to view the admin dashboard.", 401);
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail) return jsonError("Admin access is not configured.", 503);
    if (user.email?.toLowerCase() !== adminEmail) return jsonError("Admin access required.", 403);

    const supabase = getAdminSupabase();
    const [{ data: orders, error: orderError }, { data: songs, error: songError }] =
      await Promise.all([
        supabase
          .from("orders")
          .select("id, email, package, amount_paid, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("songs")
          .select("id, recipient_name, occasion, status, created_at")
          .order("created_at", { ascending: false }),
      ]);
    if (orderError || songError) return jsonError("Admin metrics could not be loaded.", 500);

    let users = 0;
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) return jsonError("User totals could not be loaded.", 500);
      users += data.users.length;
      if (data.users.length < 1000) break;
    }

    const allOrders = orders ?? [];
    const allSongs = songs ?? [];
    return NextResponse.json({
      users,
      orders: allOrders.length,
      revenue: allOrders
        .filter((order) => order.status === "active")
        .reduce((total, order) => total + Number(order.amount_paid ?? 0), 0),
      songs: allSongs.length,
      recentOrders: allOrders.slice(0, 10).map((order) => ({
        id: order.id,
        email: order.email,
        package: order.package,
        amountPaid: order.amount_paid,
        status: order.status,
        createdAt: order.created_at,
      })),
      recentSongs: allSongs.slice(0, 10).map((song) => ({
        id: song.id,
        recipientName: song.recipient_name,
        occasion: song.occasion,
        status: song.status,
        createdAt: song.created_at,
      })),
    });
  } catch (error) {
    return configurationError(error) ?? jsonError("Admin metrics could not be loaded.", 500);
  }
}
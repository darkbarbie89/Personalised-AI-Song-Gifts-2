"use client";

import Link from "next/link";
import { useGetAdminSummary } from "@workspace/api-client-react";
import { BarChart3, LockKeyhole } from "lucide-react";
import { ErrorState, Footer, LoadingState, Nav } from "@/components/shared";

export default function AdminPage() {
  const { data, isLoading, isError, refetch } = useGetAdminSummary();
  if (isLoading) return <><Nav/><LoadingState label="Preparing the store overview…"/></>;
  if (isError || !data) return <main><Nav/><div className="shell" style={{ padding: "48px 0 90px" }}><div className="empty-state"><LockKeyhole size={27} color="#cc6554"/><h2>This room is for the shopkeeper.</h2><p>Store metrics are only available to the protected admin account. Sign in with the account that has access, or try again.</p><div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}><Link className="btn" href="/account">Sign in <BarChart3 size={15}/></Link><button className="btn ghost" onClick={() => refetch()}>Try again</button></div></div></div><Footer/></main>;
  return <main><Nav/><section className="shell page-top"><p className="eyebrow">A quiet look behind the curtain</p><h1 className="display">Song Gift overview.</h1><p>Store activity and the latest songs in motion.</p>
    <div className="admin-grid"><div className="admin-stat"><span className="hint">Accounts</span><strong>{data.users.toLocaleString()}</strong></div><div className="admin-stat"><span className="hint">Orders</span><strong>{data.orders.toLocaleString()}</strong></div><div className="admin-stat"><span className="hint">Revenue</span><strong>{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(data.revenue)}</strong></div><div className="admin-stat"><span className="hint">Songs</span><strong>{data.songs.toLocaleString()}</strong></div></div>
    <div className="section-heading" style={{ marginBottom: 12 }}><p className="eyebrow">Recent activity</p><h2 className="display" style={{ fontSize: 34 }}>Latest orders</h2></div>
    {data.recentOrders.length ? <div className="table-wrap"><table><thead><tr><th>Email</th><th>Package</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{data.recentOrders.map(order => <tr key={order.id}><td>{order.email}</td><td>{order.package}</td><td>{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(order.amountPaid)}</td><td>{order.status}</td><td>{new Date(order.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h2>No orders yet</h2><p>New orders will appear here once they arrive.</p></div>}
    <div className="section-heading" style={{ margin: "34px 0 12px" }}><p className="eyebrow">In the studio</p><h2 className="display" style={{ fontSize: 34 }}>Recent songs</h2></div>
    {data.recentSongs.length ? <div className="table-wrap"><table><thead><tr><th>Recipient</th><th>Occasion</th><th>Status</th><th>Started</th></tr></thead><tbody>{data.recentSongs.map(song => <tr key={song.id}><td>{song.recipientName}</td><td>{song.occasion}</td><td>{song.status.replaceAll("_", " ")}</td><td>{new Date(song.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h2>No songs in the studio</h2><p>New song projects will show up here.</p></div>}
  </section><Footer/></main>;
}
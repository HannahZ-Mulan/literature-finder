import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Literature Finder - 智能文献查找助手",
  description: "智能文献查找助手 - 集成多个学术数据库，提供AI驱动的文献摘要、智能推荐和引用管理功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>
          <Navigation />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

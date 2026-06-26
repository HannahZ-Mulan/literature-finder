import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/toast";

// Fraunces 衬线（展示用）+ Inter 正文（无衬线）
// 中文回退到系统字体（PingFang/微软雅黑/宋体），在 tailwind.config 中声明
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

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
    <html lang="zh-CN" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <Navigation />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

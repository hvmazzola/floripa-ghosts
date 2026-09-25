import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ghosts | Central de treino",
  description: "Floripa Ghosts — organização e desenvolvimento do time",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

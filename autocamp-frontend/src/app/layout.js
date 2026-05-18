import "./globals.css";

export const metadata = {
  title: "atomcamp LMS",
  description: "Adaptive learning for everyone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
